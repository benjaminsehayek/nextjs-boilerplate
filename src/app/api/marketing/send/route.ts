import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendBatchEmails } from '@/lib/marketing/sendgrid';
import { processMergeTags } from '@/lib/marketing/merge-tags';
import { generateUnsubscribeUrl } from '@/lib/marketing/unsubscribe';
import { canSendToContact } from '@/lib/marketing/compliance';
import type { Campaign, CampaignRecipient } from '@/lib/marketing/types';
import type { Contact } from '@/components/tools/LeadDatabase/types';

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Subscription check (marketing+ tier)
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';
  const isActive = tier === 'free' || profile?.subscription_status === 'active';

  if (!isActive || !['marketing', 'growth'].includes(tier)) {
    return NextResponse.json(
      { error: 'Marketing tier or higher required' },
      { status: 403 },
    );
  }

  // 3. Parse body
  const body = await request.json();
  const { campaign_id } = body as { campaign_id: string };

  if (!campaign_id) {
    return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
  }

  // 4. Load campaign
  const { data: campaign, error: campError } = await (supabase as any)
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single();

  if (!campaign || campError) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const camp = campaign as Campaign;

  if (camp.status !== 'draft' && camp.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Campaign status is '${camp.status}', must be 'draft' or 'scheduled'` },
      { status: 400 },
    );
  }

  // 5. Load audience contacts
  let contactsQuery = (supabase as any).from('contacts').select('*');

  if (camp.audience_type === 'segment') {
    // Apply segment filters based on audience_value
    if (camp.audience_value === 'email-opted') {
      contactsQuery = contactsQuery.eq('email_opt_in', true);
    } else if (camp.audience_value === 'sms-opted') {
      contactsQuery = contactsQuery.eq('sms_opt_in', true);
    } else if (camp.audience_value === 'high-value') {
      contactsQuery = contactsQuery.gte('elv', 500);
    }
  } else if (camp.audience_type === 'list' && camp.audience_value) {
    contactsQuery = contactsQuery.contains('lists', [camp.audience_value]);
  } else if (camp.audience_type === 'tag' && camp.audience_value) {
    contactsQuery = contactsQuery.contains('tags', [camp.audience_value]);
  } else if (camp.audience_type === 'manual' && camp.audience_value) {
    const contactIds = JSON.parse(camp.audience_value) as string[];
    contactsQuery = contactsQuery.in('id', contactIds);
  }
  // 'all' = no filter

  const { data: rawContacts, error: contactsError } = await contactsQuery;

  if (contactsError) {
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 });
  }

  const contacts = (rawContacts || []) as Contact[];

  // 6. Filter eligible contacts
  const eligible = contacts.filter((c) => canSendToContact(c, camp.channel));

  if (eligible.length === 0) {
    return NextResponse.json(
      { error: 'No eligible contacts for this campaign' },
      { status: 400 },
    );
  }

  // 7. Update campaign status to 'sending'
  await (supabase as any)
    .from('campaigns')
    .update({ status: 'sending', recipient_count: eligible.length })
    .eq('id', campaign_id);

  // 8. Send emails
  if (camp.channel === 'email') {
    const messages = eligible.map((contact) => {
      const unsubUrl = generateUnsubscribeUrl(contact.id, campaign_id, 'email');
      const html = processMergeTags(camp.html_body || camp.text_body, contact, unsubUrl);
      const text = processMergeTags(camp.text_body, contact, unsubUrl);
      const subject = processMergeTags(camp.subject || '', contact, unsubUrl);

      return {
        to: contact.email!,
        from: {
          email: camp.sender_email || 'noreply@scorchlocal.com',
          name: camp.sender_name || 'ScorchLocal',
        },
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
        },
        customArgs: {
          campaign_id: campaign_id,
          contact_id: contact.id,
        },
      };
    });

    const result = await sendBatchEmails(messages);

    // 9. Create recipient records using service role (bypass RLS for bulk insert)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    const recipientRows: Partial<CampaignRecipient>[] = eligible.map((contact) => ({
      campaign_id,
      contact_id: contact.id,
      status: 'sent' as const,
      sent_at: new Date().toISOString(),
    }));

    // Mark failed ones
    for (const err of result.errors) {
      const row = recipientRows.find(
        (r) => eligible.find((c) => c.id === r.contact_id)?.email === err.email,
      );
      if (row) {
        row.status = 'failed';
        row.error_message = err.error;
      }
    }

    await (serviceClient as any).from('campaign_recipients').insert(recipientRows);

    // 10. Update campaign counters
    await (supabase as any)
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: result.sent,
        total_failed: result.failed,
      })
      .eq('id', campaign_id);

    // 11. Update lastContacted on contacts
    const sentContactIds = eligible
      .filter((c) => !result.errors.some((e) => e.email === c.email))
      .map((c) => c.id);

    if (sentContactIds.length > 0) {
      await (supabase as any)
        .from('contacts')
        .update({ last_contacted: new Date().toISOString() })
        .in('id', sentContactIds);
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    });
  }

  // SMS sending (Phase 2 — placeholder)
  if (camp.channel === 'sms') {
    return NextResponse.json(
      { error: 'SMS sending not yet implemented' },
      { status: 501 },
    );
  }

  return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
}
