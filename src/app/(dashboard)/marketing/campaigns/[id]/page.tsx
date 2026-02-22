'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useUser } from '@/lib/hooks/useUser';
import { ToolGate } from '@/components/ui/ToolGate';
import { createClient } from '@/lib/supabase/client';
import type { Campaign, CampaignRecipient, CampaignLinkClick } from '@/lib/marketing/types';
import dynamic from 'next/dynamic';

const CampaignAnalytics = dynamic(() => import('@/components/tools/Marketing/CampaignAnalytics'), { ssr: false });

interface RecipientWithContact {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useUser();
  const { business } = useBusiness();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<RecipientWithContact[]>([]);
  const [linkClicks, setLinkClicks] = useState<Array<{ url: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Load campaign
    const { data: campData } = await (supabase as any)
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campData) {
      setCampaign(campData as Campaign);

      // Load recipients with contact info
      const { data: recipData } = await (supabase as any)
        .from('campaign_recipients')
        .select('id, contact_id, status, sent_at, opened_at, clicked_at')
        .eq('campaign_id', id)
        .order('sent_at', { ascending: false })
        .limit(200);

      if (recipData) {
        // Load contact names for recipients
        const contactIds = recipData.map((r: CampaignRecipient) => r.contact_id);
        const { data: contactData } = await (supabase as any)
          .from('contacts')
          .select('id, first_name, last_name, email')
          .in('id', contactIds);

        const contactMap = new Map(
          (contactData || []).map((c: { id: string; first_name: string; last_name: string; email: string }) => [
            c.id,
            { name: `${c.first_name} ${c.last_name}`, email: c.email },
          ]),
        );

        setRecipients(
          recipData.map((r: CampaignRecipient) => ({
            id: r.id,
            contact_id: r.contact_id,
            contact_name: (contactMap.get(r.contact_id) as { name: string; email: string } | undefined)?.name || 'Unknown',
            contact_email: (contactMap.get(r.contact_id) as { name: string; email: string } | undefined)?.email || '',
            status: r.status,
            sent_at: r.sent_at,
            opened_at: r.opened_at,
            clicked_at: r.clicked_at,
          })),
        );
      }

      // Load link clicks aggregated
      const { data: clickData } = await (supabase as any)
        .from('campaign_link_clicks')
        .select('url')
        .eq('campaign_id', id);

      if (clickData) {
        const clickCounts = new Map<string, number>();
        for (const click of clickData as CampaignLinkClick[]) {
          clickCounts.set(click.url, (clickCounts.get(click.url) || 0) + 1);
        }
        setLinkClicks(
          Array.from(clickCounts.entries())
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count),
        );
      }
    }

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-char-700 rounded animate-pulse" />
        <div className="h-96 bg-char-700 rounded-card animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-display font-bold text-ash-100">Campaign Not Found</h2>
        <p className="text-ash-400 mt-2">This campaign doesn&apos;t exist or you don&apos;t have access.</p>
        <a href="/marketing/campaigns" className="btn-ghost mt-4 inline-block">
          ← Back to Campaigns
        </a>
      </div>
    );
  }

  return (
    <ToolGate tool="marketing">
      <div className="space-y-6">
        <a href="/marketing/campaigns" className="btn-ghost text-sm inline-block">
          ← Back to Campaigns
        </a>

        <CampaignAnalytics
          campaign={campaign}
          recipients={recipients}
          linkClicks={linkClicks}
        />
      </div>
    </ToolGate>
  );
}
