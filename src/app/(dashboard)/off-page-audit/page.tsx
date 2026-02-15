'use client';

import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';

export default function OffPageAuditPage() {
  return (
    <ToolGate tool="off-page-audit">
      <ToolPageShell
        icon="🔗"
        name="Off-Page Audit"
        description="Backlinks, citations, reviews, and competitor analysis"
      >
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-xl font-display mb-2 text-ash-300">
            Component conversion in progress...
          </h3>
          <p className="text-ash-400">
            This tool is being converted from HTML to React.
          </p>
        </div>
      </ToolPageShell>
    </ToolGate>
  );
}
