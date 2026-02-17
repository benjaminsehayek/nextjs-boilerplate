'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ActionItems } from '@/components/dashboard/ActionItems';
import { QuickStats } from '@/components/dashboard/QuickStats';
import Link from 'next/link';

const tools = [
  { href: '/site-audit', icon: '🔍', name: 'Site Audit', desc: '52-point technical SEO check' },
  { href: '/content-strategy', icon: '📝', name: 'Content Strategy', desc: 'ROI-based keyword research' },
  { href: '/local-grid', icon: '📍', name: 'Local Grid', desc: 'Maps ranking heat map' },
  { href: '/off-page-audit', icon: '🔗', name: 'Off-Page Audit', desc: 'Backlinks, reviews, citations' },
  { href: '/lead-intelligence', icon: '📡', name: 'Lead Intelligence', desc: 'Multi-channel marketing dashboard' },
  { href: '/lead-database', icon: '👥', name: 'Lead Database', desc: 'CRM with lead scoring' },
];

export default function HomePage() {
  const { user, profile } = useUser();
  const { business } = useBusiness();

  // Show marketing landing page if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

        <main className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h1 className="font-display text-5xl md:text-6xl mb-4">
              <span className="text-flame-500">Scorch</span>
              <span className="text-ash-100">Local</span>
            </h1>
            <p className="text-xl md:text-2xl text-ash-300 max-w-2xl mx-auto">
              DIY marketing tools built for local contractors. Transparent. ROI-focused. No agency BS.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="btn-primary">
              Get Started
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="card p-6 text-left">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="font-display text-lg mb-2 text-flame-500">Site Audit</h3>
              <p className="text-sm text-ash-400">52-point technical SEO analysis</p>
            </div>
            <div className="card p-6 text-left">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="font-display text-lg mb-2 text-flame-500">Content Strategy</h3>
              <p className="text-sm text-ash-400">ROI-based keyword research</p>
            </div>
            <div className="card p-6 text-left">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-display text-lg mb-2 text-flame-500">Local Grid</h3>
              <p className="text-sm text-ash-400">Maps ranking heat map</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show authenticated dashboard
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
            {/* Left Column - Activity & Actions */}
            <div className="lg:col-span-2 space-y-6">
              <RecentActivity business={business} />
              <ActionItems business={business} />
            </div>

            {/* Right Column - Quick Stats */}
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
