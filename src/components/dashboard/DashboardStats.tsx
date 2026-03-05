import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Business } from '@/types';

interface DashboardStatsProps {
  business: Business | null;
}

interface Stats {
  totalScans: number;
  avgSeoScore: number | null;
  totalBacklinks: number | null;
  referringDomains: number | null;
  totalLeads: number;
}

export function DashboardStats({ business }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalScans: 0,
    avgSeoScore: null,
    totalBacklinks: null,
    referringDomains: null,
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
        // Get total scans
        const { count: scansCount } = await (supabase as any)
          .from('site_audits')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        // Get average SEO score
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

        // Get backlinks from most recent off-page audit
        let totalBacklinks: number | null = null;
        let referringDomains: number | null = null;
        const { data: offPageData } = await (supabase as any)
          .from('off_page_audits')
          .select('metrics')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (offPageData?.metrics) {
          const m = offPageData.metrics as Record<string, unknown>;
          if (typeof m.total_backlinks === 'number') totalBacklinks = m.total_backlinks;
          else if (typeof m.backlinks === 'number') totalBacklinks = m.backlinks;
          if (typeof m.referring_domains === 'number') referringDomains = m.referring_domains;
        }

        setStats({
          totalScans: scansCount || 0,
          avgSeoScore: avgScore,
          totalBacklinks,
          referringDomains,
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

  const statCards = [
    {
      label: 'Total Scans',
      value: stats.totalScans,
      icon: '🔍',
      color: 'text-flame-500',
    },
    {
      label: 'Avg SEO Score',
      value: stats.avgSeoScore !== null ? `${stats.avgSeoScore}/100` : 'N/A',
      icon: '📊',
      color: 'text-heat-500',
    },
    {
      label: 'Total Backlinks',
      value: stats.totalBacklinks !== null ? stats.totalBacklinks.toLocaleString() : '--',
      icon: '🔗',
      color: 'text-ember-500',
    },
    {
      label: 'Total Leads',
      value: stats.totalLeads,
      icon: '👥',
      color: 'text-flame-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat) => (
        <div key={stat.label} className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ash-400">{stat.label}</span>
            <span className="text-2xl">{stat.icon}</span>
          </div>
          <div className={`text-3xl font-display ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
