'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Business, BusinessLocation } from '@/types';

interface LocationStat {
  id: string;
  name: string;
  city: string;
  state: string;
  avgGridRank: number | null;
  reviewCount: number | null;
  leadCount: number | null;
}

interface LocationsPerformanceProps {
  business: Business;
  locations: BusinessLocation[];
}

export default function LocationsPerformance({ business, locations }: LocationsPerformanceProps) {
  const supabase = createClient();
  const [stats, setStats] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id || locations.length < 2) return;
    let cancelled = false;

    async function fetchStats() {
      setLoading(true);

      const results = await Promise.all(
        locations.map(async (loc): Promise<LocationStat> => {
          const [gridRes, auditRes, leadsRes] = await Promise.allSettled([
            // Most recent complete grid scan for this location
            (supabase as any)
              .from('grid_scans')
              .select('heatmap_data')
              .eq('business_id', business.id)
              .eq('location_id', loc.id)
              .eq('status', 'complete')
              .order('scan_date', { ascending: false })
              .limit(1)
              .maybeSingle(),

            // Most recent off_page_audit for this business (reviews stored in location_data)
            (supabase as any)
              .from('off_page_audits')
              .select('location_data')
              .eq('business_id', business.id)
              .eq('status', 'complete')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),

            // Lead count for this location
            (supabase as any)
              .from('contacts')
              .select('id', { count: 'exact', head: true })
              .eq('business_id', business.id)
              .eq('location_id', loc.id),
          ]);

          // Average grid rank — average of all keyword averageRanks in the most recent scan
          let avgGridRank: number | null = null;
          if (gridRes.status === 'fulfilled' && gridRes.value?.data?.heatmap_data) {
            const heatmapData = gridRes.value.data.heatmap_data as Record<string, { averageRank?: number }>;
            const ranks = Object.values(heatmapData)
              .map((kw) => kw?.averageRank)
              .filter((r): r is number => typeof r === 'number' && r > 0);
            if (ranks.length > 0) {
              avgGridRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
            }
          }

          // Review count from off_page audit location_data
          let reviewCount: number | null = null;
          if (auditRes.status === 'fulfilled' && auditRes.value?.data?.location_data) {
            const locationData = auditRes.value.data.location_data as Array<{
              locationId?: string;
              reviews?: { totalCount?: number };
            }>;
            // Try to match by locationId in location_data — fall back to first entry
            const match =
              locationData.find((ld) => ld.locationId === loc.id) || locationData[0];
            if (match?.reviews?.totalCount !== undefined) {
              reviewCount = match.reviews.totalCount;
            }
          }

          // Lead count
          let leadCount: number | null = null;
          if (leadsRes.status === 'fulfilled') {
            leadCount = (leadsRes.value as any).count ?? 0;
          }

          return {
            id: loc.id,
            name: loc.location_name || `${loc.city}, ${loc.state}`,
            city: loc.city,
            state: loc.state,
            avgGridRank,
            reviewCount,
            leadCount,
          };
        }),
      );

      if (!cancelled) {
        setStats(results);
        setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [business?.id, locations.length]);

  if (locations.length < 2) return null;

  return (
    <div className="card p-5 mb-6">
      <h3 className="font-display text-ash-100 text-sm font-semibold mb-4">Locations Performance</h3>

      {loading ? (
        <div className="space-y-2">
          {locations.slice(0, 3).map((_, i) => (
            <div key={i} className="h-10 bg-char-700 animate-pulse rounded" />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <p className="text-sm text-ash-400">No data available yet. Run scans to see location stats.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-char-700">
                <th className="text-left py-2 pr-4 text-ash-500 font-medium text-xs uppercase tracking-wide">Location</th>
                <th className="text-right py-2 px-3 text-ash-500 font-medium text-xs uppercase tracking-wide">Avg Grid Rank</th>
                <th className="text-right py-2 px-3 text-ash-500 font-medium text-xs uppercase tracking-wide">Reviews</th>
                <th className="text-right py-2 px-3 text-ash-500 font-medium text-xs uppercase tracking-wide">Leads</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.id} className="border-b border-char-800 last:border-0">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-ash-200 text-sm">{stat.name}</div>
                    {stat.city && stat.state && (
                      <div className="text-xs text-ash-500">{stat.city}, {stat.state}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {stat.avgGridRank !== null ? (
                      <span className={`font-display text-sm ${
                        stat.avgGridRank <= 3 ? 'text-success' :
                        stat.avgGridRank <= 10 ? 'text-ember-500' : 'text-ash-400'
                      }`}>
                        #{stat.avgGridRank}
                      </span>
                    ) : (
                      <span className="text-ash-600 text-xs">No scan</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {stat.reviewCount !== null ? (
                      <span className="text-ash-200 font-display text-sm">{stat.reviewCount.toLocaleString()}</span>
                    ) : (
                      <span className="text-ash-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {stat.leadCount !== null ? (
                      <span className="text-ash-200 font-display text-sm">{stat.leadCount.toLocaleString()}</span>
                    ) : (
                      <span className="text-ash-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
