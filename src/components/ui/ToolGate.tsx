'use client';

import { useSubscription } from '@/lib/hooks/useSubscription';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ToolGateProps {
  tool: string;
  children: React.ReactNode;
}

export function ToolGate({ tool, children }: ToolGateProps) {
  const { canAccessTool, tier, loading } = useSubscription();
  const [timeout, setTimeout] = useState(false);

  // Safety timeout: if loading takes more than 10 seconds, show error
  useEffect(() => {
    if (loading) {
      const timer = window.setTimeout(() => {
        setTimeout(true);
      }, 10000);
      return () => window.clearTimeout(timer);
    }
  }, [loading]);

  if (loading && !timeout) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    );
  }

  if (timeout) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-display mb-4">Loading Timeout</h2>
          <p className="text-ash-300 mb-6">
            The page is taking longer than expected to load. This might be due to a network issue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary inline-block"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!canAccessTool(tool)) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-display mb-4">Upgrade Required</h2>
          <p className="text-ash-300 mb-6">
            This tool is not available on your current plan ({tier}).
          </p>
          <Link href="/settings" className="btn-primary inline-block">
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
