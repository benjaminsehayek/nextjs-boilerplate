'use client';

import { useSubscription } from '@/lib/hooks/useSubscription';
import Link from 'next/link';

interface ToolGateProps {
  tool: string;
  children: React.ReactNode;
}

export function ToolGate({ tool, children }: ToolGateProps) {
  const { canAccessTool, tier, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
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
