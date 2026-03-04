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
  const [{ data: profile }, { data: userBusiness }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single(),
    (supabase as any)
      .from('businesses')
      .select('id')
      .eq('user_id', user.id) // B15-05: businesses table uses user_id, not owner_id
      .single(),
  ]);

  const tier = profile?.subscription_tier || 'free';
  const isActive = tier === 'free' || profile?.subscription_status === 'active';

  if (!isActive || !['marketing', 'growth'].includes(tier)) {
    return NextResponse.json(
      { error: 'Marketing tier or higher required' },
      { status: 403 },
    );
  }

  if (!userBusiness?.id) {
    return NextResponse.json({ error: 'No business found for this account' }, { status: 400 });
  }

  // 3. Parse body
  const body = await request.json();
  const { campaign_id, ab_test_enabled, subject_a, subject_b, schedule, scheduledAt, previewMode, previewEmail, sampleMergeValues } = body as {
    campaign_id: string;
    ab_test_enabled?: boolean;
    subject_a?: string;
    subject_b?: string;
    schedule?: boolean;
    scheduledAt?: string;
    previewMode?: boolean;
    previewEmail?: string;
    sampleMergeValues?: Record<string, string>;
  };

  if (!campaign_id) {
    return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
  }

  // 3b. Preview mode — send a single preview email to previewEmail with sample merge values
  if (previewMode === true) {
    if (!previewEmail) {
      return NextResponse.json({ error: 'previewEmail required for previewMode' }, { status: 400 });
    }

    const { data: campaign } = await (supabase as any)
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('business_id', userBusiness.id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Build a synthetic contact with sample merge values
    const mergeValues = sampleMergeValues ?? {};
    const sampleContact = {
      id: 'preview',
      firstName: mergeValues.first_name ?? 'John',
      lastName: mergeValues.last_name ?? 'Doe',
      email: previewEmail,
      company: mergeValues.company ?? mergeValues.business_name ?? 'Sample Co.',
      phone: '',
      city: '',
      state: '',
      tags: [],
      lists: [],
      source: 'manual' as const,
      elv: 0,
      emailOptIn: true,
      smsOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const unsubUrl = '#'; // Preview — no real unsubscribe URL
    const html = processMergeTags(campaign.html_body || campaign.text_body || '', sampleContact as any, unsubUrl);
    const text = processMergeTags(campaign.text_body || '', sampleContact as any, unsubUrl);
    const subjectLine = processMergeTags(campaign.subject || '(No Subject)', sampleContact as any, unsubUrl);

    const previewMessage = {
      to: previewEmail,
      from: {
        email: campaign.sender_email || 'noreply@scorchlocal.com',
        name: campaign.sender_name || 'ScorchLocal',
      },
      subject: subjectLine,
      html,
      text,
    };

    const previewResult = await sendBatchEmails([previewMessage]);
    return NextResponse.json({
      success: previewResult.sent > 0,
      previewMode: true,
      sent: previewResult.sent,
      errors: previewResult.errors,
    });
  }

  // 4. Load campaign (scoped to this user's business to prevent cross-tenant access)
  const { data: campaign, error: campError } = await (supabase as any)
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('business_id', userBusiness.id)
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

  // 4b. Handle schedule request — update status and return without sending
  if (schedule === true) {
    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required when schedule is true' }, { status: 400 });
    }
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'scheduledAt must be a valid future date' }, { status: 400 });
    }

    await (supabase as any)
      .from('campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt,
      })
      .eq('id', campaign_id)
      .eq('business_id', userBusiness.id);

    return NextResponse.json({ scheduled: true, scheduledAt });
  }

  // 5. Load audience contacts (scoped to this business)
  let contactsQuery = (supabase as any).from('contacts').select('*').eq('business_id', userBusiness.id);

  if (camp.audience_type === 'segment') {
    // Apply segment filters based on audience_value
    if (camp.audience_value === 'email-opted') {
      contactsQuery = contactsQuery.eq('opted_email', true);
    } else if (camp.audience_value === 'sms-opted') {
      contactsQuery = contactsQuery.eq('opted_sms', true);
    } else if (camp.audience_value === 'high-value') {
      contactsQuery = contactsQuery.gte('elv', 500);
    }
  } else if (camp.audience_type === 'list' && camp.audience_value) {
    contactsQuery = contactsQuery.contains('lists', [camp.audience_value]);
  } else if (camp.audience_type === 'tag' && camp.audience_value) {
    contactsQuery = contactsQuery.contains('tags', [camp.audience_value]);
  } else if (camp.audience_type === 'manual' && camp.audience_value) {
    const contactIds = (camp.audience_value || '').split(',').filter(Boolean);
    contactsQuery = contactsQuery.in('id', contactIds);
  }
  // 'all' = no filter

  const { data: rawContacts, error: contactsError } = await contactsQuery;

  if (contactsError) {
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 });
  }

  // Map snake_case DB rows to camelCase Contact type so canSendToContact() works correctly
  const contacts: Contact[] = (rawContacts || []).map((row: any) => ({
    ...row,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    emailOptIn: row.opted_email ?? true,
    smsOptIn: row.opted_sms ?? false,
    unsubscribedEmail: row.unsub_email ?? false,
    unsubscribedSMS: row.unsub_sms ?? false,
    businessId: row.business_id ?? '',
    locationId: row.location_id ?? null,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }));

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
    .eq('id', campaign_id)
    .eq('business_id', userBusiness.id);

  // 8. Send emails
  if (camp.channel === 'email') {
    try {
    // Service role client for bulk inserts (bypass RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    );

    const useAbTest = ab_test_enabled === true && subject_a && subject_b;

    let totalSent = 0;
    let totalFailed = 0;
    let variantACount = 0;
    let variantBCount = 0;
    const allErrors: { email: string; error: string }[] = [];
    const sentContactIds: string[] = [];
    const recipientRows: Partial<CampaignRecipient>[] = [];

    if (useAbTest) {
      // Split eligible into two halves
      const midpoint = Math.ceil(eligible.length / 2);
      const groupA = eligible.slice(0, midpoint);
      const groupB = eligible.slice(midpoint);

      const buildMessages = (contacts: Contact[], subjectLine: string) =>
        contacts.map((contact) => {
          const unsubUrl = generateUnsubscribeUrl(contact.id, campaign_id, 'email');
          const html = processMergeTags(camp.html_body || camp.text_body, contact, unsubUrl);
          const text = processMergeTags(camp.text_body, contact, unsubUrl);
          const subject = processMergeTags(subjectLine, contact, unsubUrl);
          return {
            to: contact.email!,
            from: {
              email: camp.sender_email || 'noreply@scorchlocal.com',
              name: camp.sender_name || 'ScorchLocal',
            },
            subject,
            html,
            text,
            headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
            customArgs: { campaign_id, contact_id: contact.id },
          };
        });

      const [resultA, resultB] = await Promise.all([
        sendBatchEmails(buildMessages(groupA, subject_a!)),
        sendBatchEmails(buildMessages(groupB, subject_b!)),
      ]);

      totalSent = resultA.sent + resultB.sent;
      totalFailed = resultA.failed + resultB.failed;
      variantACount = resultA.sent;
      variantBCount = resultB.sent;
      allErrors.push(...resultA.errors, ...resultB.errors);

      const now = new Date().toISOString();

      for (const contact of groupA) {
        const failed = resultA.errors.some((e) => e.email === contact.email);
        recipientRows.push({
          campaign_id,
          contact_id: contact.id,
          status: failed ? 'failed' : 'sent',
          sent_at: now,
          subject_variant: 'A',
          error_message: failed ? resultA.errors.find((e) => e.email === contact.email)?.error : undefined,
        });
        if (!failed) sentContactIds.push(contact.id);
      }
      for (const contact of groupB) {
        const failed = resultB.errors.some((e) => e.email === contact.email);
        recipientRows.push({
          campaign_id,
          contact_id: contact.id,
          status: failed ? 'failed' : 'sent',
          sent_at: now,
          subject_variant: 'B',
          error_message: failed ? resultB.errors.find((e) => e.email === contact.email)?.error : undefined,
        });
        if (!failed) sentContactIds.push(contact.id);
      }
    } else {
      // Standard single-subject send
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
          headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
          customArgs: { campaign_id, contact_id: contact.id },
        };
      });

      const result = await sendBatchEmails(messages);
      totalSent = result.sent;
      totalFailed = result.failed;
      allErrors.push(...result.errors);

      const now = new Date().toISOString();
      for (const contact of eligible) {
        const failed = result.errors.some((e) => e.email === contact.email);
        recipientRows.push({
          campaign_id,
          contact_id: contact.id,
          status: failed ? 'failed' : 'sent',
          sent_at: now,
          subject_variant: null,
          error_message: failed ? result.errors.find((e) => e.email === contact.email)?.error : undefined,
        });
        if (!failed) sentContactIds.push(contact.id);
      }
    }

    // 9. Create recipient records — B16-14: batch in chunks to avoid Supabase REST payload limit
    const RECIPIENT_BATCH_SIZE = 500;
    for (let i = 0; i < recipientRows.length; i += RECIPIENT_BATCH_SIZE) {
      const batch = recipientRows.slice(i, i + RECIPIENT_BATCH_SIZE);
      const { error: recipientsError } = await (serviceClient as any)
        .from('campaign_recipients')
        .insert(batch);
      if (recipientsError) {
        console.error('[send] Failed to insert recipient records (batch):', recipientsError);
        // Rollback campaign status to 'draft' so it can be retried
        await (supabase as any)
          .from('campaigns')
          .update({ status: 'draft' })
          .eq('id', campaign_id)
          .eq('business_id', userBusiness.id);
        return NextResponse.json({ error: 'Failed to record send results' }, { status: 500 });
      }
    }

    // 10. Update campaign counters
    await (supabase as any)
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: totalSent,
        total_failed: totalFailed,
      })
      .eq('id', campaign_id)
      .eq('business_id', userBusiness.id);

    // 11. Update lastContacted on contacts (scoped by business for defense-in-depth)
    if (sentContactIds.length > 0) {
      await (supabase as any)
        .from('contacts')
        .update({ last_contacted: new Date().toISOString() })
        .in('id', sentContactIds)
        .eq('business_id', userBusiness.id);
    }

    if (useAbTest) {
      return NextResponse.json({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        variantA: variantACount,
        variantB: variantBCount,
        errors: allErrors,
      });
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      errors: allErrors,
    });
    } catch (sendErr: any) {
      // Rollback campaign status so the user can retry
      console.error('[Marketing send] Email send failed:', sendErr.message);
      await (supabase as any)
        .from('campaigns')
        .update({ status: 'draft' })
        .eq('id', campaign_id)
        .eq('business_id', userBusiness.id);
      return NextResponse.json(
        { error: 'Failed to send campaign. Campaign has been reset to draft — please try again.' },
        { status: 500 },
      );
    }
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
