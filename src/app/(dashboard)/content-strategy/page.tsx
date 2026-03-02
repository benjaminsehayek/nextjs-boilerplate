'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { CalendarItemV2, SimpleStrategyConfig, SiteAudit } from '@/types';
import type { EnrichedKeyword, SiteAuditKeyword } from '@/lib/contentStrategy/keywordResearch';
import dynamic from 'next/dynamic';

const SimpleConfigForm = dynamic(() => import('@/components/tools/ContentStrategy/SimpleConfigForm'), { ssr: false });
const UnifiedCalendar = dynamic(() => import('@/components/tools/ContentStrategy/UnifiedCalendar'), { ssr: false });

type Phase = 'checking' | 'prereq_missing' | 'config' | 'generating' | 'complete';

// Days before auto-refresh triggers per tier (undefined = no auto-refresh)
const AUTO_REFRESH_DAYS: Partial<Record<string, number>> = {
  growth: 7,
  marketing: 30,
};

function autoRefreshDue(lastGeneratedAt: string | null, tier: string): boolean {
  const days = AUTO_REFRESH_DAYS[tier];
  if (!days || !lastGeneratedAt) return false;
  return Date.now() - new Date(lastGeneratedAt).getTime() > days * 24 * 60 * 60 * 1000;
}

export default function ContentStrategyPage() {
  const { user, business, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>('checking');
  const [siteAudit, setSiteAudit] = useState<SiteAudit | null>(null);
  const [offPageAudit, setOffPageAudit] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarItemV2[]>([]);
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'done' | 'skipped'>>({});
  const [storedEconomics, setStoredEconomics] = useState<SimpleStrategyConfig | null>(null);
  const [hasNewerAudit, setHasNewerAudit] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

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
        .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, status, domain, economics')
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
      setStoredEconomics((existing.economics as SimpleStrategyConfig) ?? null);

      const newerAudit = !!(existing.source_audit_id && audit.id !== existing.source_audit_id);
      setHasNewerAudit(newerAudit);

      setPhase('complete');

      // Auto-refresh for qualifying tiers — run silently in background
      const tier = profile?.subscription_tier ?? 'free';
      if (autoRefreshDue(existing.last_generated_at, tier) && existing.economics) {
        generate(
          existing.economics as SimpleStrategyConfig,
          { silent: true, auditData: audit, offPageData: offPage, prevStatuses: existing.item_statuses ?? {} }
        );
      }
    } else {
      setPhase('config');
    }
  }, [business?.id, profile?.subscription_tier]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && business?.id) loadData();
  }, [authLoading, business?.id, loadData]);

  // ── Generate strategy ──────────────────────────────────────────────
  async function generate(
    cfg: SimpleStrategyConfig,
    opts?: {
      silent?: boolean;
      auditData?: SiteAudit | null;
      offPageData?: any;
      prevStatuses?: Record<string, 'done' | 'skipped'>;
    }
  ) {
    const auditToUse = opts?.auditData ?? siteAudit;
    const offPageToUse = opts?.offPageData ?? offPageAudit;
    if (!auditToUse || !business?.id) return;

    setError('');
    if (!opts?.silent) setPhase('generating');
    setRefreshing(true);

    try {
      // ── Step 1: External keyword research ─────────────────────────
      if (!opts?.silent) setGenerationStep('Discovering keywords…');

      // Extract site audit keywords to pass as internal context
      const marketKws: SiteAuditKeyword[] = [];
      const markets = (auditToUse as any)?.crawl_data?.keywords?.markets ?? {};
      for (const market of Object.values(markets)) {
        for (const item of (market as any)?.items ?? []) {
          const kw: string = item.keyword_data?.keyword;
          const vol: number = item.keyword_data?.keyword_info?.search_volume ?? 0;
          const rank: number | null = item.ranked_serp_element?.serp_item?.rank_group ?? null;
          const cpc: number | null = item.keyword_data?.keyword_info?.cpc ?? null;
          if (kw && vol > 0) marketKws.push({ keyword: kw, volume: vol, currentRank: rank, cpc });
        }
      }

      const auditCity = (auditToUse as any)?.crawl_data?.business?.city ?? (business as any)?.city ?? '';
      let enrichedKeywords: EnrichedKeyword[] | undefined;

      try {
        const kwRes = await fetch('/api/content-strategy/keyword-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry: (business as any)?.industry ?? '',
            city: auditCity,
            state: (business as any)?.state ?? '',
            locations: auditCity ? [auditCity] : [],
            siteAuditKeywords: marketKws,
            businessName: business?.name ?? '',
          }),
        });
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          if (kwData.keywords?.length) enrichedKeywords = kwData.keywords;
        }
      } catch {
        // Keyword research failure is non-fatal — fall back to audit-only keywords
      }

      // ── Step 2: Build calendar ─────────────────────────────────────
      if (!opts?.silent) setGenerationStep('Building your calendar…');

      const { buildUnifiedCalendar } = await import('@/lib/contentStrategy/unifiedCalendar');
      const items = buildUnifiedCalendar(auditToUse as any, offPageToUse, cfg, enrichedKeywords, (business as any)?.industry ?? '');

      // Carry over statuses for items that still exist — orphaned statuses are cleaned up
      const prevStatuses = opts?.prevStatuses ?? itemStatuses;
      const newIds = new Set(items.map(i => i.id));
      const carryOver: Record<string, 'done' | 'skipped'> = {};
      for (const [id, status] of Object.entries(prevStatuses)) {
        if (newIds.has(id)) carryOver[id] = status;
      }

      const now = new Date().toISOString();
      const upsertData = {
        business_id: business.id,
        domain: auditToUse.domain ?? (business as any).domain ?? '',
        status: 'complete',
        calendar_v2: items,
        source_audit_id: auditToUse.id,
        source_offpage_id: offPageToUse?.id ?? null,
        last_generated_at: now,
        item_statuses: carryOver,
        economics: cfg,
        completed_tasks: [],
      };

      let result;
      const strategyId = strategy?.id;
      if (strategyId) {
        result = await (supabase as any)
          .from('content_strategies')
          .update(upsertData)
          .eq('id', strategyId)
          .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, economics')
          .single();
      } else {
        result = await (supabase as any)
          .from('content_strategies')
          .insert(upsertData)
          .select('id, calendar_v2, item_statuses, source_audit_id, last_generated_at, economics')
          .single();
      }

      if (result.error) throw new Error(result.error.message);

      setStrategy(result.data);
      setCalendarItems(items);
      setItemStatuses(carryOver);
      setStoredEconomics(cfg);
      setHasNewerAudit(false);
      if (!opts?.silent) setPhase('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to generate strategy');
      if (!opts?.silent) setPhase(strategy ? 'complete' : 'config');
    } finally {
      setRefreshing(false);
    }
  }

  // Save AI-generated content back to DB so it persists across sessions
  async function handleContentGenerated(id: string, content: string) {
    const updated = calendarItems.map(item =>
      item.id === id ? { ...item, generatedContent: content } : item
    );
    setCalendarItems(updated);
    if (strategy?.id) {
      await (supabase as any)
        .from('content_strategies')
        .update({ calendar_v2: updated })
        .eq('id', strategy.id);
    }
  }

  // If economics are already stored, refresh inline — no config form needed
  function handleRefresh() {
    if (storedEconomics) {
      generate(storedEconomics, { silent: true });
    } else {
      setPhase('config');
    }
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
          {!city && (
            <div className="card p-3 border-warning/40 bg-warning/5 flex items-center gap-3 text-xs">
              <span className="text-warning">⚠</span>
              <span className="text-ash-400">
                Your business city is not set — keyword volumes will be national averages instead of local.{' '}
                <a href="/settings" className="text-warning underline">Update your profile</a> for accurate local data.
              </span>
            </div>
          )}
          <SimpleConfigForm
            domain={domain}
            industry={industry}
            onSubmit={generate}
            loading={phase === 'generating'}
          />
          {phase === 'generating' && (
            <p className="text-sm text-ash-400 animate-pulse">
              {generationStep || 'Building your 12-week calendar…'}
            </p>
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
          onContentGenerated={handleContentGenerated}
          refreshing={refreshing}
        />
      )}
    </div>
  );
}
