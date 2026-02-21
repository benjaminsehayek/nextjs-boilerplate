import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Business } from '@/types';

interface ActionItemsProps {
  business: Business | null;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  tool: string;
  link: string;
  icon: string;
}

export function ActionItems({ business }: ActionItemsProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadActionItems() {
      if (!business?.id) {
        setLoading(false);
        return;
      }

      try {
        const actionItems: ActionItem[] = [];

        // Get latest completed audit for recommendations
        const { data: latestAudit } = await (supabase as any)
          .from('site_audits')
          .select('id, overall_score, category_scores, lighthouse_scores')
          .eq('business_id', business.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestAudit) {
          if (latestAudit.overall_score < 70) {
            actionItems.push({
              id: 'seo-score-low',
              title: 'Improve SEO Score',
              description: `Your site scored ${latestAudit.overall_score}/100. Review audit recommendations.`,
              priority: 'high',
              tool: 'Site Audit',
              link: '/site-audit',
              icon: '🔍',
            });
          }

          const performanceScore = latestAudit.lighthouse_scores?.performance ?? latestAudit.category_scores?.performance;
          if (performanceScore != null && performanceScore < 60) {
            actionItems.push({
              id: 'speed-low',
              title: 'Optimize Page Speed',
              description: 'Slow loading times hurt rankings and conversions.',
              priority: 'high',
              tool: 'Site Audit',
              link: '/site-audit',
              icon: '⚡',
            });
          }

          const mobileScore = latestAudit.category_scores?.mobile ?? latestAudit.lighthouse_scores?.seo;
          if (mobileScore != null && mobileScore < 70) {
            actionItems.push({
              id: 'mobile-low',
              title: 'Fix Mobile Issues',
              description: 'Mobile optimization is critical for local search.',
              priority: 'medium',
              tool: 'Site Audit',
              link: '/site-audit',
              icon: '📱',
            });
          }
        }

        // Check if content strategy needs attention
        const { count: contentCount } = await (supabase as any)
          .from('content_strategies')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('status', 'complete');

        if (!contentCount) {
          actionItems.push({
            id: 'content-needed',
            title: 'Run Content Strategy',
            description: 'Discover keyword opportunities and plan your content.',
            priority: 'medium',
            tool: 'Content Strategy',
            link: '/content-strategy',
            icon: '📝',
          });
        }

        // Check leads activity
        const { count: leadsCount } = await (supabase as any)
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        if (!leadsCount) {
          actionItems.push({
            id: 'leads-needed',
            title: 'Start Lead Generation',
            description: 'Build your contact database for outreach campaigns.',
            priority: 'low',
            tool: 'Lead Database',
            link: '/lead-database',
            icon: '👥',
          });
        }

        setItems(actionItems.slice(0, 6)); // Limit to 6 items
      } catch (error) {
        console.error('Error loading action items:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActionItems();
  }, [business?.id]);

  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="font-display text-lg mb-4">Recommended Actions</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-char-700 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="font-display text-lg mb-4">Recommended Actions</h3>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">✅</span>
          <p className="text-ash-300 font-medium mb-1">All caught up!</p>
          <p className="text-sm text-ash-500">
            No immediate actions needed. Keep monitoring your tools.
          </p>
        </div>
      </div>
    );
  }

  const priorityColors = {
    high: 'border-danger bg-danger/5',
    medium: 'border-warning bg-warning/5',
    low: 'border-ash-600 bg-ash-600/5',
  };

  const priorityLabels = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };

  return (
    <div className="card p-6">
      <h3 className="font-display text-lg mb-4">Recommended Actions</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.link}
            className={`block p-4 rounded-lg border-l-4 ${priorityColors[item.priority]} hover:bg-char-700 transition-colors`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-ash-100">{item.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-char-700 text-ash-400">
                    {priorityLabels[item.priority]}
                  </span>
                </div>
                <p className="text-sm text-ash-400 mb-1">{item.description}</p>
                <p className="text-xs text-ash-500">{item.tool}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
