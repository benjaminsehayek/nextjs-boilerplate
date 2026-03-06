import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCount, formatHealthLabel } from '@/lib/format';
import type { Business } from '@/types';

interface DashboardStatsProps {
  business: Business | null;
  gscClicks?: number | null;
  gscAvgPosition?: number | null;
}

interface Stats {
  avgSeoScore: number | null;
  totalLeads: number;
}

export function DashboardStats({ business, gscClicks, gscAvgPosition }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    avgSeoScore: null,
    totalLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      if (!business?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get average SEO score from last 5 completed audits
        const { data: auditsData } = await (supabase as any)
          .from('site_audits')
          .select('overall_score')
          .eq('business_id', business.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(5);

        const avgScore = auditsData?.length
          ? Math.round(
              auditsData.reduce((sum: number, a: any) => sum + (a.overall_score || 0), 0) /
                auditsData.length
            )
          : null;

        // Get total leads
        const { count: leadsCount } = await (supabase as any)
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        setStats({
          avgSeoScore: avgScore,
          totalLeads: leadsCount || 0,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [business?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-20 bg-char-700 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  const health = stats.avgSeoScore !== null ? formatHealthLabel(stats.avgSeoScore) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Leads */}
      <div className="card p-6">
        <p className="text-sm font-medium text-ash-400 mb-2">Total Leads</p>
        <p className="text-3xl font-display text-flame-500">{formatCount(stats.totalLeads)}</p>
      </div>

      {/* Local Visibility */}
      <div className="card p-6">
        <p className="text-sm font-medium text-ash-400 mb-2">Local Visibility</p>
        {gscClicks != null ? (
          <p className="text-3xl font-display text-heat-400">{formatCount(gscClicks)}</p>
        ) : (
          <div>
            <p className="text-3xl font-display text-ash-600">—</p>
            <a href="/settings?tab=integrations" className="text-xs text-flame-500 hover:text-flame-400 mt-1 inline-block">
              Connect GSC →
            </a>
          </div>
        )}
        <p className="text-xs text-ash-500 mt-0.5">Local clicks</p>
      </div>

      {/* Avg Position */}
      <div className="card p-6">
        <p className="text-sm font-medium text-ash-400 mb-2">Avg Position</p>
        {gscAvgPosition != null ? (
          <p className="text-3xl font-display text-ember-500">#{gscAvgPosition.toFixed(1)}</p>
        ) : (
          <div>
            <p className="text-3xl font-display text-ash-600">—</p>
            <a href="/settings?tab=integrations" className="text-xs text-flame-500 hover:text-flame-400 mt-1 inline-block">
              Connect GSC →
            </a>
          </div>
        )}
        <p className="text-xs text-ash-500 mt-0.5">Local search rank</p>
      </div>

      {/* Site Health */}
      <div className="card p-6">
        <p className="text-sm font-medium text-ash-400 mb-2">Site Health</p>
        {health ? (
          <p className={`text-3xl font-display ${health.color}`}>{health.label}</p>
        ) : (
          <div>
            <p className="text-3xl font-display text-ash-600">—</p>
            <a href="/site-audit" className="text-xs text-flame-500 hover:text-flame-400 mt-1 inline-block">
              Run audit →
            </a>
          </div>
        )}
        <p className="text-xs text-ash-500 mt-0.5">Based on last audit</p>
      </div>
    </div>
  );
}
