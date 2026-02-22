import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import type { Business } from '@/types';

interface RecentActivityProps {
  business: Business | null;
}

interface ActivityItem {
  id: string;
  type: 'scan' | 'content' | 'lead';
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  icon: string;
}

export function RecentActivity({ business }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadActivity() {
      if (!business?.id) {
        setLoading(false);
        return;
      }

      try {
        const activityList: ActivityItem[] = [];

        // Get recent scans
        const { data: scans } = await (supabase as any)
          .from('site_audits')
          .select('id, domain, status, created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(3);

        scans?.forEach((scan: any) => {
          activityList.push({
            id: scan.id,
            type: 'scan',
            title: 'Site Audit',
            description: `Scan ${scan.status} for ${scan.domain}`,
            timestamp: scan.created_at,
            link: '/site-audit',
            icon: '🔍',
          });
        });

        // Get recent leads
        const { data: leads } = await (supabase as any)
          .from('leads')
          .select('id, company, created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(3);

        leads?.forEach((lead: any) => {
          activityList.push({
            id: lead.id,
            type: 'lead',
            title: 'New Lead',
            description: `${lead.company} added to database`,
            timestamp: lead.created_at,
            link: '/lead-database',
            icon: '👥',
          });
        });

        // Sort by timestamp
        activityList.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(activityList.slice(0, 5));
      } catch (error) {
        console.error('Error loading recent activity:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, [business?.id]);

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="font-display text-lg mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-char-700 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-display text-lg mb-4">Recent Activity</h3>
        <p className="text-ash-400 text-sm text-center py-8">
          No recent activity. Start using the tools to see activity here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-display text-lg mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <Link
            key={activity.id}
            href={activity.link || '#'}
            className="block p-3 rounded-lg hover:bg-char-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-ash-100 truncate">
                    {activity.title}
                  </p>
                  <span className="text-xs text-ash-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-ash-400 truncate">{activity.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
