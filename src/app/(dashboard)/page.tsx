'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import Link from 'next/link';

const tools = [
  { href: '/dashboard/site-audit', icon: '🔍', name: 'Site Audit', desc: '52-point technical SEO check' },
  { href: '/dashboard/content-strategy', icon: '📝', name: 'Content Strategy', desc: 'ROI-based keyword research' },
  { href: '/dashboard/local-grid', icon: '📍', name: 'Local Grid', desc: 'Maps ranking heat map' },
  { href: '/dashboard/off-page-audit', icon: '🔗', name: 'Off-Page Audit', desc: 'Backlinks, reviews, citations' },
  { href: '/dashboard/lead-intelligence', icon: '📡', name: 'Lead Intelligence', desc: 'Multi-channel marketing dashboard' },
  { href: '/dashboard/lead-database', icon: '👥', name: 'Lead Database', desc: 'CRM with lead scoring' },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { business } = useBusiness();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display mb-2">
          Welcome back, <span className="text-flame-500">{firstName}</span>
        </h1>
        <p className="text-ash-300">Choose a tool to get started</p>
      </div>

      {!business && (
        <div className="card p-6 mb-8 bg-ember-500/10 border-ember-500">
          <h2 className="font-display text-lg mb-2 text-ember-500">⚠️ Setup Required</h2>
          <p className="text-ash-300 mb-4">
            Complete your business profile to unlock all tools.
          </p>
          <Link href="/dashboard/onboarding" className="btn-primary">
            Start Setup
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="card-interactive p-6"
          >
            <div className="text-4xl mb-3">{tool.icon}</div>
            <h3 className="font-display text-lg mb-1 text-flame-500">{tool.name}</h3>
            <p className="text-sm text-ash-400">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
