'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ActionItems } from '@/components/dashboard/ActionItems';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard';
import { ToolGrid } from '@/components/dashboard/ToolGrid';
import { useRouter } from 'next/navigation';
import { useLocations } from '@/lib/hooks/useLocations';
import dynamic from 'next/dynamic';

const LocationsPerformance = dynamic(() => import('@/components/dashboard/LocationsPerformance'), { ssr: false });

// ─── Dashboard Page ───────────────────────────────────────────────────────────

const ONBOARDING_STEPS = ['add_business', 'add_location', 'add_service', 'add_market', 'run_audit'];

export default function DashboardPage() {
  const { user, profile, loading, business, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { locations } = useLocations(business?.id);

  // Market count — loaded once after business is available
  const [marketCount, setMarketCount] = useState<number | null>(null);

  // Local Search Visibility (GSC-27)
  interface LocalSearchMetrics {
    localClicks: number;
    localImpressions: number;
    avgLocalPosition: number | null;
    nearMeImpressions: number;
  }
  const [localSearchMetrics, setLocalSearchMetrics] = useState<LocalSearchMetrics | null>(null);
  const [localSearchLoading, setLocalSearchLoading] = useState(false);

  // Local mirror of onboarding completed steps (for optimistic UI)
  const [localCompletedSteps, setLocalCompletedSteps] = useState<string[]>([]);
  // Local override: once dismissed, hide wizard even before profile refresh
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // Prevent double-submit while a step is being saved
  const [stepSaving, setStepSaving] = useState(false);

  // Sync local completed steps from profile when profile loads
  useEffect(() => {
    if (profile?.onboarding_steps_completed) {
      setLocalCompletedSteps(profile.onboarding_steps_completed);
    }
  }, [profile?.onboarding_steps_completed]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!business?.id) return;
    let cancelled = false;

    (supabase as any)
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .then(({ count, error }: { count: number | null; error: any }) => {
        if (error) console.error('Failed to fetch market count:', error);
        if (!cancelled) setMarketCount(count ?? 0);
      });

    return () => { cancelled = true; };
  }, [business?.id]);

  // GSC-27: fetch local search visibility metrics
  useEffect(() => {
    if (!business?.id) return;
    let cancelled = false;
    setLocalSearchLoading(true);

    (async () => {
      try {
        // Fetch markets for city name matching
        const { data: marketsData } = await (supabase as any)
          .from('markets')
          .select('cities, name')
          .eq('business_id', business.id);

        const marketCityNames: string[] = [];
        if (marketsData) {
          for (const m of marketsData) {
            if (Array.isArray(m.cities)) {
              for (const c of m.cities) {
                if (typeof c === 'string' && c.trim()) {
                  marketCityNames.push(c.trim().toLowerCase());
                }
              }
            }
            // Also extract city from the market name like "Portland, OR"
            if (typeof m.name === 'string') {
              const cityPart = m.name.split(',')[0].trim().toLowerCase();
              if (cityPart) marketCityNames.push(cityPart);
            }
          }
        }

        // Fetch GSC analytics
        const gscRes = await fetch('/api/gsc/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: business.id }),
        });

        if (!gscRes.ok) return; // GSC not connected or error — silently skip

        const { rows } = await gscRes.json() as { rows: Array<{ keys: string[]; clicks: number; impressions: number; position: number }> };
        if (!rows?.length) return;

        // Filter to local queries
        let localClicks = 0;
        let localImpressions = 0;
        let weightedPositionSum = 0;
        let nearMeImpressions = 0;

        for (const row of rows) {
          const query = (row.keys?.[0] ?? '').toLowerCase();
          const isNearMe = query.includes('near me');
          const isLocalCity = marketCityNames.some((city) => query.includes(city));

          if (isNearMe || isLocalCity) {
            localClicks += row.clicks ?? 0;
            localImpressions += row.impressions ?? 0;
            weightedPositionSum += (row.position ?? 0) * (row.impressions ?? 0);
          }
          if (isNearMe) {
            nearMeImpressions += row.impressions ?? 0;
          }
        }

        if (!cancelled) {
          setLocalSearchMetrics({
            localClicks,
            localImpressions,
            avgLocalPosition: localImpressions > 0 ? weightedPositionSum / localImpressions : null,
            nearMeImpressions,
          });
        }
      } catch (err) {
        console.error('Failed to fetch GSC local metrics:', err);
      } finally {
        if (!cancelled) setLocalSearchLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [business?.id]);

  const handleStepComplete = useCallback(async (step: string) => {
    if (!user?.id || stepSaving) return;
    setStepSaving(true);
    const updated = [...new Set([...localCompletedSteps, step])];
    setLocalCompletedSteps(updated);

    const allDone = ONBOARDING_STEPS.every((s) => updated.includes(s));
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          onboarding_steps_completed: updated,
          ...(allDone ? { onboarding_completed: true } : {}),
        })
        .eq('id', user.id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save onboarding step:', err);
    } finally {
      setStepSaving(false);
    }

    if (allDone) {
      setOnboardingDismissed(true);
    }
    // Refresh profile to pick up new values
    refreshProfile();
  }, [user?.id, stepSaving, localCompletedSteps, supabase, refreshProfile]);

  const handleDismiss = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      if (error) throw error;
      setOnboardingDismissed(true);
    } catch (err) {
      console.error('Failed to dismiss onboarding:', err);
    }
    refreshProfile();
  }, [user?.id, supabase, refreshProfile]);

  if (loading) {
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

  if (!user) return null;

  // Show onboarding wizard if no business yet and not completed/dismissed
  const onboardingCompleted = profile?.onboarding_completed === true || onboardingDismissed;
  if (!business && !onboardingCompleted) {
    return (
      <OnboardingWizard
        completedSteps={localCompletedSteps}
        onStepComplete={handleStepComplete}
        onDismiss={handleDismiss}
      />
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
        <p className="text-ash-300">Here is what is happening with your business</p>
      </div>

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

      {/* Market prompt — shown when user has no markets yet */}
      {!loading && marketCount === 0 && (
        <div className="card p-4 mb-6 border-l-4 border-flame-500 flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h3 className="font-display text-ash-100 text-sm font-semibold">Set Your Target Markets</h3>
            <p className="text-xs text-ash-400 mt-1">Add your service areas to get accurate local keyword rankings in Site Audit and Content Strategy.</p>
            <a href="/settings?tab=markets" className="text-xs text-flame-500 hover:text-flame-400 mt-2 inline-block">Add Markets →</a>
          </div>
        </div>
      )}

      {/* Local Search Visibility (GSC-27) — only shown when GSC data is available */}
      {business && (localSearchLoading || localSearchMetrics !== null) && (
        <div className="card p-5 mb-6">
          <h3 className="font-display text-ash-100 text-sm font-semibold mb-3">Local Search Visibility</h3>
          {localSearchLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-char-700 animate-pulse rounded" />
              ))}
            </div>
          ) : localSearchMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-display text-flame-500">
                  {localSearchMetrics.localClicks.toLocaleString()}
                </div>
                <div className="text-xs text-ash-400 mt-0.5">Local Clicks</div>
              </div>
              <div>
                <div className="text-2xl font-display text-heat-500">
                  {localSearchMetrics.localImpressions.toLocaleString()}
                </div>
                <div className="text-xs text-ash-400 mt-0.5">Local Impressions</div>
              </div>
              <div>
                <div className="text-2xl font-display text-ember-500">
                  {localSearchMetrics.avgLocalPosition !== null
                    ? localSearchMetrics.avgLocalPosition.toFixed(1)
                    : '--'}
                </div>
                <div className="text-xs text-ash-400 mt-0.5">Avg Position</div>
              </div>
              <div>
                <div className="text-2xl font-display text-flame-500">
                  {localSearchMetrics.nearMeImpressions.toLocaleString()}
                </div>
                <div className="text-xs text-ash-400 mt-0.5">"Near Me" Impressions</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Locations Performance — only shown when business has 2+ locations */}
      {business && locations.length >= 2 && (
        <LocationsPerformance business={business} locations={locations} />
      )}

      {/* Tools Grid */}
      <ToolGrid />
    </div>
  );
}
