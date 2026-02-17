'use client';

import { useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ActionItems } from '@/components/dashboard/ActionItems';
import { QuickStats } from '@/components/dashboard/QuickStats';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const tools = [
  { href: '/site-audit', icon: '🔍', name: 'Site Audit', desc: '52-point technical SEO check' },
  { href: '/content-strategy', icon: '📝', name: 'Content Strategy', desc: 'ROI-based keyword research' },
  { href: '/local-grid', icon: '📍', name: 'Local Grid', desc: 'Maps ranking heat map' },
  { href: '/off-page-audit', icon: '🔗', name: 'Off-Page Audit', desc: 'Backlinks, reviews, citations' },
  { href: '/lead-intelligence', icon: '📡', name: 'Lead Intelligence', desc: 'Multi-channel marketing dashboard' },
  { href: '/lead-database', icon: '👥', name: 'Lead Database', desc: 'CRM with lead scoring' },
];

export default function DashboardPage() {
  const { user, profile, loading } = useUser();
  const { business } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-char-700 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-char-700 animate-pulse rounded-btn" />
          ))}
        </div>
        <div className="h-48 bg-char-700 animate-pulse rounded-btn" />
      </div>
    );
  }

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display mb-2">
          Welcome back, <span className="text-flame-500">{firstName}</span>
        </h1>
        <p className="text-ash-300">Here's what's happening with your business</p>
      </div>

      {/* Setup Alert */}
      {!business && (
        <div className="card p-6 mb-8 bg-ember-500/10 border-ember-500">
          <h2 className="font-display text-lg mb-2 text-ember-500">⚠️ Setup Required</h2>
          <p className="text-ash-300 mb-4">
            Complete your business profile to unlock all tools.
          </p>
          <Link href="/onboarding" className="btn-primary">
            Start Setup
          </Link>
        </div>
      )}

      {business && (
        <>
          {/* Overview Stats */}
          <DashboardStats business={business} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <RecentActivity business={business} />
              <ActionItems business={business} />
            </div>
            <div className="lg:col-span-1">
              <QuickStats profile={profile} />
            </div>
          </div>
        </>
      )}

      {/* Tools Grid */}
      <div className="mb-4">
        <h2 className="text-xl font-display mb-4">Tools</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="card-interactive p-6">
            <div className="text-4xl mb-3">{tool.icon}</div>
            <h3 className="font-display text-lg mb-1 text-flame-500">{tool.name}</h3>
            <p className="text-sm text-ash-400">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
