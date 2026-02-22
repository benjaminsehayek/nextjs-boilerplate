'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useUser } from '@/lib/hooks/useUser';
import { ToolGate } from '@/components/ui/ToolGate';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/lib/marketing/types';
import dynamic from 'next/dynamic';

const CampaignList = dynamic(() => import('@/components/tools/Marketing/CampaignList'), { ssr: false });

export default function CampaignsPage() {
  const { user, loading: authLoading } = useUser();
  const { business } = useBusiness();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadCampaigns = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);

    const { data } = await (supabase as any)
      .from('campaigns')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  }, [business?.id, supabase]);

  useEffect(() => {
    if (business?.id) loadCampaigns();
  }, [business?.id, loadCampaigns]);

  const handleDelete = async (campaignId: string) => {
    await (supabase as any).from('campaigns').delete().eq('id', campaignId);
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
  };

  const handleDuplicate = async (campaign: Campaign) => {
    if (!business?.id) return;

    const { data } = await (supabase as any)
      .from('campaigns')
      .insert({
        business_id: business.id,
        name: `${campaign.name} (Copy)`,
        channel: campaign.channel,
        status: 'draft',
        template_id: campaign.template_id,
        subject: campaign.subject,
        html_body: campaign.html_body,
        text_body: campaign.text_body,
        sender_name: campaign.sender_name,
        sender_email: campaign.sender_email,
        sender_phone: campaign.sender_phone,
        audience_type: campaign.audience_type,
        audience_value: campaign.audience_value,
      })
      .select()
      .single();

    if (data) {
      setCampaigns((prev) => [data as Campaign, ...prev]);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-char-700 rounded animate-pulse" />
        <div className="h-96 bg-char-700 rounded-card animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToolGate tool="marketing">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ash-100">Campaigns</h1>
            <p className="text-ash-400 mt-1">All email and SMS campaigns</p>
          </div>
          <a href="/marketing" className="btn-ghost text-sm">
            ← Back to Marketing
          </a>
        </div>

        {loading ? (
          <div className="h-96 bg-char-700 rounded-card animate-pulse" />
        ) : (
          <CampaignList
            campaigns={campaigns}
            onView={(campaign) => {
              window.location.href = `/marketing/campaigns/${campaign.id}`;
            }}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </ToolGate>
  );
}
