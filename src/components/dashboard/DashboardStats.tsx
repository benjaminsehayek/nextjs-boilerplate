import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Business } from '@/types';

interface DashboardStatsProps {
  business: Business | null;
}

interface Stats {
  totalScans: number;
  avgSeoScore: number | null;
  totalBacklinks: number;
  totalLeads: number;
}

export function DashboardStats({ business }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalScans: 0,
    avgSeoScore: null,
    totalBacklinks: 0,
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
          .eq('status', 'completed')
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
          totalScans: scansCount || 0,
          avgSeoScore: avgScore,
          totalBacklinks: 0, // TODO: Implement when backlinks table exists
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
      value: stats.totalBacklinks || 'Coming Soon',
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
