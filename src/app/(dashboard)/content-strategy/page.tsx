'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { CalendarItemV2, SimpleStrategyConfig, SiteAudit } from '@/types';
import dynamic from 'next/dynamic';

const SimpleConfigForm = dynamic(() => import('@/components/tools/ContentStrategy/SimpleConfigForm'), { ssr: false });
const UnifiedCalendar = dynamic(() => import('@/components/tools/ContentStrategy/UnifiedCalendar'), { ssr: false });

type Phase = 'checking' | 'prereq_missing' | 'config' | 'generating' | 'complete';

export default function ContentStrategyPage() {
  const { user, business, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>('checking');
  const [siteAudit, setSiteAudit] = useState<SiteAudit | null>(null);
  const [offPageAudit, setOffPageAudit] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItemV2[]>([]);
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'done' | 'skipped'>>({});
  const [hasNewerAudit, setHasNewerAudit] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce status saves
  const statusDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing data on mount ────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!business?.id) return;

    setPhase('checking');

    const [auditRes, offPageRes, strategyRes] = await Promise.all([
      (supabase as any)
        .from('site_audits')
        .select('id, domain, status, crawl_data, issues_data, pages_data, created_at')
        .eq('business_id', business.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      (supabase as any)
        .from('off_page_audits')
        .select('id, citations, link_gaps, location_data, created_at')
        .eq('business_id', business.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r: any) => r.error ? { data: null, error: r.error } : r),
      (supabase as any)
        .from('content_strategies')
        .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, status, domain')
        .eq('business_id', business.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const audit: SiteAudit | null = auditRes.data ?? null;
    const offPage = offPageRes.data ?? null;
    const existing = strategyRes.data ?? null;

    setSiteAudit(audit);
    setOffPageAudit(offPage);

    if (!audit) {
      setPhase('prereq_missing');
      return;
    }

    if (existing?.calendar_v2?.length) {
      setStrategy(existing);
      setCalendarItems(existing.calendar_v2);
      setItemStatuses(existing.item_statuses ?? {});

      if (existing.source_audit_id && audit.id !== existing.source_audit_id) {
        setHasNewerAudit(true);
      }

      setPhase('complete');
    } else {
      setPhase('config');
    }
  }, [business?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && business?.id) loadData();
  }, [authLoading, business?.id, loadData]);

  // ── Generate strategy ──────────────────────────────────────────────
  async function generate(cfg: SimpleStrategyConfig) {
    if (!siteAudit || !business?.id) return;
    setError('');
    setPhase('generating');

    try {
      const { buildUnifiedCalendar } = await import('@/lib/contentStrategy/unifiedCalendar');
      const items = buildUnifiedCalendar(siteAudit as any, offPageAudit, cfg);

      const now = new Date().toISOString();
      const upsertData = {
        business_id: business.id,
        domain: siteAudit.domain ?? (business as any).domain ?? '',
        status: 'complete',
        calendar_v2: items,
        source_audit_id: siteAudit.id,
        source_offpage_id: offPageAudit?.id ?? null,
        last_generated_at: now,
        item_statuses: {},
        economics: cfg,
        completed_tasks: [],
      };

      let result;
      if (strategy?.id) {
        result = await (supabase as any)
          .from('content_strategies')
          .update(upsertData)
          .eq('id', strategy.id)
          .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at')
          .single();
      } else {
        result = await (supabase as any)
          .from('content_strategies')
          .insert(upsertData)
          .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at')
          .single();
      }

      if (result.error) throw new Error(result.error.message);

      setStrategy(result.data);
      setCalendarItems(items);
      setItemStatuses({});
      setHasNewerAudit(false);
      setPhase('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to generate strategy');
      setPhase(strategy ? 'complete' : 'config');
    }
  }

  function handleRefresh() {
    setRefreshing(false);
    setPhase('config');
  }

  // ── Item status toggle ─────────────────────────────────────────────
  function handleStatusChange(id: string, status: 'scheduled' | 'done' | 'skipped') {
    const next: Record<string, 'done' | 'skipped'> = { ...itemStatuses };
    if (status === 'scheduled') {
      delete next[id];
    } else {
      next[id] = status;
    }
    setItemStatuses(next);
    setCalendarItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));

    if (statusDebounce.current) clearTimeout(statusDebounce.current);
    statusDebounce.current = setTimeout(async () => {
      if (strategy?.id) {
        await (supabase as any)
          .from('content_strategies')
          .update({ item_statuses: next })
          .eq('id', strategy.id);
      }
    }, 800);
  }

  const itemsWithStatus = calendarItems.map(item => ({
    ...item,
    status: (itemStatuses[item.id] as any) ?? item.status,
  }));

  // ── Loading ────────────────────────────────────────────────────────
  if (authLoading || phase === 'checking') {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-char-700 rounded-btn animate-pulse w-48" />
        <div className="h-40 bg-char-700 rounded-card animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const city = (siteAudit as any)?.crawl_data?.business?.city ?? (business as any)?.city ?? '';
  const businessName = business?.name ?? '';
  const domain = siteAudit?.domain ?? (business as any)?.domain ?? '';
  const industry = (business as any)?.industry ?? '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ash-100">Content Strategy</h1>
        <p className="text-ash-500 mt-1 text-sm">
          12-week plan for GBP posts, off-page SEO, and website improvements — built from your audit data.
        </p>
      </div>

      {error && (
        <div className="card p-4 border-danger bg-danger/5 text-danger text-sm">{error}</div>
      )}

      {/* ── Prerequisite missing ── */}
      {phase === 'prereq_missing' && (
        <div className="card p-8 text-center space-y-4">
          <div className="text-4xl">📊</div>
          <h2 className="font-display text-lg text-ash-200">Run a Site Audit First</h2>
          <p className="text-ash-500 max-w-sm mx-auto text-sm">
            Content Strategy uses your site audit data to find keyword gaps and page issues.
            Run a site audit to get started.
          </p>
          <a href="/site-audit" className="btn-primary inline-flex">
            Go to Site Audit
          </a>
        </div>
      )}

      {/* ── Config ── */}
      {(phase === 'config' || phase === 'generating') && (
        <div className="space-y-6">
          {siteAudit && (
            <div className="flex items-center gap-2 text-xs text-ash-400 card px-4 py-2 w-fit">
              <span className="w-2 h-2 rounded-full bg-success" />
              Using site audit from {new Date((siteAudit as any).created_at).toLocaleDateString()}
              {offPageAudit && <span className="ml-2 text-ash-500">+ off-page audit</span>}
            </div>
          )}
          <SimpleConfigForm
            domain={domain}
            industry={industry}
            onSubmit={generate}
            loading={phase === 'generating'}
          />
          {phase === 'generating' && (
            <p className="text-sm text-ash-400 animate-pulse">Building your 12-week calendar…</p>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      {phase === 'complete' && (
        <UnifiedCalendar
          items={itemsWithStatus}
          businessName={businessName}
          domain={domain}
          industry={industry}
          city={city}
          lastGeneratedAt={strategy?.last_generated_at ?? null}
          hasNewerAudit={hasNewerAudit}
          onRefresh={handleRefresh}
          onStatusChange={handleStatusChange}
          refreshing={refreshing}
        />
      )}
    </div>
  );
}
