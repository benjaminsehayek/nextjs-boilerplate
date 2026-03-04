import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallbackLabel?: string }>,
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="card p-6 text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-ash-100 font-semibold">{this.props.fallbackLabel ?? 'Something went wrong'}</h2>
        <p className="text-ash-500 text-sm">An unexpected error occurred in this section.</p>
        <details className="text-left">
          <summary className="text-ash-500 text-xs cursor-pointer">Error details</summary>
          <pre className="text-danger text-xs mt-2 whitespace-pre-wrap">{this.state.error?.message}</pre>
        </details>
        <button className="btn-secondary text-sm" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }
}
