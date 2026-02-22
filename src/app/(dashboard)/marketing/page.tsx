'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { ToolGate } from '@/components/ui/ToolGate';
import { createClient } from '@/lib/supabase/client';
import type { Campaign, DashboardStats, MessageTemplate, CreateCampaignInput } from '@/lib/marketing/types';
import type { Contact, Segment } from '@/components/tools/LeadDatabase/types';
import { DEFAULT_SEGMENTS } from '@/components/tools/LeadDatabase/types';

// Dynamic imports for heavy components
import dynamic from 'next/dynamic';
const MarketingDashboard = dynamic(() => import('@/components/tools/Marketing/MarketingDashboard'), { ssr: false });
const CampaignComposer = dynamic(() => import('@/components/tools/Marketing/CampaignComposer'), { ssr: false });

export default function MarketingPage() {
  const { user, loading: authLoading } = useUser();
  const { business } = useBusiness();
  const { canAccessFeature } = useSubscription();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_campaigns: 0,
    total_sent: 0,
    avg_open_rate: 0,
    avg_click_rate: 0,
    avg_unsubscribe_rate: 0,
    active_automations: 0,
    total_templates: 0,
  });
  const [showComposer, setShowComposer] = useState(false);
  const [composerChannel, setComposerChannel] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      // Load campaigns, templates, contacts in parallel
      const [campaignsRes, templatesRes, contactsRes] = await Promise.all([
        (supabase as any).from('campaigns')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(50),
        (supabase as any).from('message_templates')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false }),
        (supabase as any).from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5000),
      ]);

      const loadedCampaigns = (campaignsRes.data || []) as Campaign[];
      const loadedTemplates = (templatesRes.data || []) as MessageTemplate[];
      const loadedContacts = (contactsRes.data || []) as Contact[];

      setCampaigns(loadedCampaigns);
      setTemplates(loadedTemplates);
      setContacts(loadedContacts);

      // Calculate stats
      const sentCampaigns = loadedCampaigns.filter((c) => c.status === 'sent');
      const totalSent = sentCampaigns.reduce((s, c) => s + c.total_sent, 0);
      const totalOpened = sentCampaigns.reduce((s, c) => s + c.total_opened, 0);
      const totalClicked = sentCampaigns.reduce((s, c) => s + c.total_clicked, 0);
      const totalUnsub = sentCampaigns.reduce((s, c) => s + c.total_unsubscribed, 0);

      setStats({
        total_campaigns: loadedCampaigns.length,
        total_sent: totalSent,
        avg_open_rate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        avg_click_rate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        avg_unsubscribe_rate: totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0,
        active_automations: 0,
        total_templates: loadedTemplates.length,
      });
    } catch (err) {
      console.error('Failed to load marketing data:', err);
    } finally {
      setLoading(false);
    }
  }, [business?.id, supabase]);

  useEffect(() => {
    if (business?.id) loadData();
  }, [business?.id, loadData]);

  const handleSaveCampaign = async (input: CreateCampaignInput) => {
    if (!business?.id) return;

    const { data, error } = await (supabase as any)
      .from('campaigns')
      .insert({
        business_id: business.id,
        name: input.name,
        channel: input.channel,
        status: 'draft',
        template_id: input.template_id || null,
        subject: input.subject || null,
        html_body: input.html_body || null,
        text_body: input.text_body,
        sender_name: input.sender_name || null,
        sender_email: input.sender_email || null,
        sender_phone: input.sender_phone || null,
        audience_type: input.audience_type,
        audience_value: input.audience_value || null,
      })
      .select()
      .single();

    if (!error && data) {
      setCampaigns((prev) => [data as Campaign, ...prev]);
      setShowComposer(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const res = await fetch('/api/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Send failed: ${err.error}`);
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Send campaign error:', err);
      alert('Failed to send campaign');
    }
  };

  // Derive segments with counts
  const segments: Segment[] = DEFAULT_SEGMENTS.map((seg) => ({
    ...seg,
    count: contacts.filter((c) => {
      if (seg.id === 'email-opted') return c.emailOptIn;
      if (seg.id === 'sms-opted') return c.smsOptIn;
      if (seg.id === 'high-value') return c.elv >= 500;
      return false;
    }).length,
  }));

  // Derive unique lists and tags from contacts
  const allLists = [...new Set(contacts.flatMap((c) => c.lists))];
  const allTags = [...new Set(contacts.flatMap((c) => c.tags))];

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-char-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-char-700 rounded-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToolGate tool="marketing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ash-100">
              Marketing
            </h1>
            <p className="text-ash-400 mt-1">
              Email &amp; SMS campaigns for your contacts
            </p>
          </div>
        </div>

        {!canAccessFeature('email-campaigns') ? (
          <div className="bg-char-800 border border-char-700 rounded-card p-8 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-xl font-display font-bold text-ash-100 mb-2">
              Upgrade to Marketing
            </h2>
            <p className="text-ash-400 mb-4 max-w-md mx-auto">
              Email and SMS campaigns are available on the Marketing plan and above.
              Reach your contacts with targeted messages, templates, and automation.
            </p>
            <a href="/billing" className="btn-primary inline-block">
              View Plans
            </a>
          </div>
        ) : showComposer ? (
          <CampaignComposer
            templates={templates.filter((t) => t.channel === composerChannel)}
            contacts={contacts}
            segments={segments}
            lists={allLists}
            tags={allTags}
            onSave={handleSaveCampaign}
            onSend={handleSendCampaign}
            onCancel={() => setShowComposer(false)}
          />
        ) : loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-char-700 rounded-card animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-char-700 rounded-card animate-pulse" />
          </div>
        ) : (
          <MarketingDashboard
            stats={stats}
            recentCampaigns={campaigns.slice(0, 10)}
            onNewEmailCampaign={() => {
              setComposerChannel('email');
              setShowComposer(true);
            }}
            onNewSMSCampaign={() => {
              setComposerChannel('sms');
              setShowComposer(true);
            }}
            onViewCampaign={(campaign) => {
              window.location.href = `/marketing/campaigns/${campaign.id}`;
            }}
            onViewAllCampaigns={() => {
              window.location.href = '/marketing/campaigns';
            }}
          />
        )}
      </div>
    </ToolGate>
  );
}
