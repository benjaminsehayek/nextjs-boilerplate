'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[dashboard/error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
      <p className="text-5xl">⚠️</p>
      <h2 className="text-ash-100 font-display text-xl font-semibold">Something went wrong</h2>
      <p className="text-ash-400 text-sm max-w-md">
        An unexpected error occurred. You can try again or reload the page.
      </p>
      {error.digest && (
        <p className="text-ash-600 text-xs font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-flame-500 hover:bg-flame-400 text-white rounded-full text-sm font-display transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-char-700 hover:bg-char-600 text-ash-300 rounded-full text-sm font-display transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
