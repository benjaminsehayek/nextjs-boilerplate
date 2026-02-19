'use client';

import { useState, useEffect } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { createClient } from '@/lib/supabase/client';
import { cleanDomain, dfsCall } from '@/lib/dataforseo';
import type { ScanState, ScanProgress, SiteAuditResults, TabId } from '@/components/tools/SiteAudit/types';

// Lazy load heavy components
import dynamic from 'next/dynamic';

const ScanInput = dynamic(() => import('@/components/tools/SiteAudit/ScanInput'));
const ProgressTracker = dynamic(() => import('@/components/tools/SiteAudit/ProgressTracker'));
const Dashboard = dynamic(() => import('@/components/tools/SiteAudit/Dashboard'));

export default function SiteAuditPage() {
  const { user } = useUser();
  const { scansRemaining } = useSubscription();
  const { business } = useBusiness();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [domain, setDomain] = useState<string>('');
  const [progress, setProgress] = useState<ScanProgress>({ completed: 0, total: 8, tasks: [] });
  const [results, setResults] = useState<SiteAuditResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Check for existing incomplete audit on mount
  useEffect(() => {
    async function checkExistingAudit() {
      if (!business?.id) return;

      const { data: existingAudit } = await (supabase as any)
        .from('site_audits')
        .select('*')
        .eq('business_id', business.id)
        .in('status', ['pending', 'crawling', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingAudit) {
        setAuditId(existingAudit.id);
        setScanState('scanning');
        setProgress({
          completed: existingAudit.completed_tasks?.length || 0,
          total: 8,
          tasks: existingAudit.completed_tasks || [],
        });
      }
    }

    checkExistingAudit();
  }, [business?.id, supabase]);

  // Real-time progress updates via Supabase
  useEffect(() => {
    if (!auditId) return;

    const channel = supabase
      .channel(`audit:${auditId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_audits',
          filter: `id=eq.${auditId}`,
        },
        (payload: any) => {
          const newData = payload.new as any;

          setProgress({
            completed: newData.completed_tasks?.length || 0,
            total: 8,
            tasks: newData.completed_tasks || [],
          });

          if (newData.status === 'complete') {
            // Load full results
            loadAuditResults(auditId);
          } else if (newData.status === 'failed') {
            setScanState('error');
            setError('Audit failed. Please try again.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auditId, supabase]);

  async function loadAuditResults(id: string) {
    const { data: audit } = await (supabase as any)
      .from('site_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (audit && audit.status === 'complete') {
      // Transform database audit to SiteAuditResults
      const results: SiteAuditResults = {
        auditId: audit.id,
        domain: domain || 'Unknown',
        overallScore: audit.overall_score || 0,
        categoryScores: audit.category_scores || {},
        pages: (audit.pages_data as any)?.pages || [],
        issues: (audit.issues_data as any)?.issues || [],
        quickWins: (audit.issues_data as any)?.quickWins || [],
        pageCount: audit.page_count || 0,
        issuesCritical: audit.issues_critical || 0,
        issuesWarning: audit.issues_warning || 0,
        issuesNotice: audit.issues_notice || 0,
        lighthouseScores: audit.lighthouse_scores as any,
        crawlData: audit.crawl_data,
        apiCost: audit.api_cost || 0,
        startedAt: audit.started_at,
        completedAt: audit.completed_at || new Date().toISOString(),
      };

      setResults(results);
      setScanState('complete');
    }
  }

  async function startAudit(inputDomain: string) {
    if (!business?.id) {
      setError('Business profile required. Please complete onboarding.');
      return;
    }

    if (scansRemaining <= 0) {
      setError('No scans remaining this month. Upgrade your plan for more scans.');
      return;
    }

    setError(null);
    setDomain(inputDomain);
    const cleanedDomain = cleanDomain(inputDomain);

    try {
      // Create audit record
      const { data: audit, error: insertError } = await (supabase as any)
        .from('site_audits')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          status: 'pending',
          started_at: new Date().toISOString(),
          completed_tasks: [],
          issues_critical: 0,
          issues_warning: 0,
          issues_notice: 0,
          api_cost: 0,
        })
        .select()
        .single();

      if (insertError || !audit) {
        throw new Error('Failed to create audit record');
      }

      setAuditId(audit.id);
      setScanState('scanning');

      // Start audit checks in background
      runAuditChecks(audit.id, cleanedDomain);
    } catch (err: any) {
      setScanState('error');
      setError(err.message || 'Failed to start audit');
    }
  }

  async function runAuditChecks(id: string, cleanedDomain: string) {
    const checks = [
      { name: 'Meta Data', endpoint: 'v3/on_page/instant_pages', category: 'meta' },
      { name: 'Content', endpoint: 'v3/on_page/instant_pages', category: 'content' },
      { name: 'Links', endpoint: 'v3/on_page/instant_pages', category: 'links' },
      { name: 'Images', endpoint: 'v3/on_page/instant_pages', category: 'images' },
      { name: 'Performance', endpoint: 'v3/on_page/lighthouse', category: 'performance' },
      { name: 'Schema', endpoint: 'v3/on_page/instant_pages', category: 'schema' },
      { name: 'Security', endpoint: 'v3/on_page/instant_pages', category: 'security' },
      { name: 'Mobile', endpoint: 'v3/on_page/lighthouse', category: 'mobile' },
    ];

    try {
      // Update status to crawling
      await (supabase as any)
        .from('site_audits')
        .update({ status: 'crawling' })
        .eq('id', id);

      // Execute API calls in parallel
      const results = await Promise.allSettled(
        checks.map(async (check) => {
          try {
            const data = await dfsCall(check.endpoint, [{ target: cleanedDomain }]);

            // Update completed tasks
            const { data: currentAudit } = await (supabase as any)
              .from('site_audits')
              .select('completed_tasks')
              .eq('id', id)
              .single();

            const completedTasks = [...(currentAudit?.completed_tasks || []), check.name];

            await (supabase as any)
              .from('site_audits')
              .update({ completed_tasks: completedTasks })
              .eq('id', id);

            return { check: check.name, category: check.category, data, status: 'success' };
          } catch (err: any) {
            return { check: check.name, category: check.category, error: err.message, status: 'failed' };
          }
        })
      );

      // Update status to analyzing
      await (supabase as any)
        .from('site_audits')
        .update({ status: 'analyzing' })
        .eq('id', id);

      // Process collected API results
      const successfulResults = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.status === 'success')
        .map((r) => r.value);

      const crawlData: Record<string, any> = {};
      for (const result of successfulResults) {
        crawlData[result.category] = result.data;
      }

      // Extract Lighthouse scores (from performance/mobile checks)
      const lighthouseResult = successfulResults.find(
        (r) => r.category === 'performance' || r.category === 'mobile'
      );
      const lighthouseRaw = lighthouseResult?.data?.tasks?.[0]?.result?.[0]?.items?.[0];
      const lighthouseScores = lighthouseRaw ? {
        performance: Math.round((lighthouseRaw.categories?.performance?.score || 0) * 100),
        accessibility: Math.round((lighthouseRaw.categories?.accessibility?.score || 0) * 100),
        best_practices: Math.round((lighthouseRaw.categories?.['best-practices']?.score || 0) * 100),
        seo: Math.round((lighthouseRaw.categories?.seo?.score || 0) * 100),
      } : null;

      // Extract on-page page data (use first instant_pages result)
      const onPageResult = successfulResults.find((r) => r.category === 'meta');
      const pageItem = onPageResult?.data?.tasks?.[0]?.result?.[0]?.items?.[0];

      // Count issues from checks object
      let issuesCritical = 0;
      let issuesWarning = 0;
      let issuesNotice = 0;
      const issuesList: any[] = [];

      if (pageItem?.checks) {
        const checks = pageItem.checks;
        // Critical issues
        if (!checks.title) { issuesCritical++; issuesList.push({ name: 'Missing title tag', severity: 'critical', category: 'meta' }); }
        if (!checks.meta_description) { issuesWarning++; issuesList.push({ name: 'Missing meta description', severity: 'warning', category: 'meta' }); }
        if (!checks.h1) { issuesWarning++; issuesList.push({ name: 'Missing H1 tag', severity: 'warning', category: 'content' }); }
        if (checks.duplicate_title) { issuesCritical++; issuesList.push({ name: 'Duplicate title tags', severity: 'critical', category: 'meta' }); }
        if (checks.duplicate_meta_description) { issuesWarning++; issuesList.push({ name: 'Duplicate meta descriptions', severity: 'warning', category: 'meta' }); }
        if (checks.is_https === false) { issuesCritical++; issuesList.push({ name: 'Not using HTTPS', severity: 'critical', category: 'security' }); }
        if (checks.no_image_alt) { issuesWarning++; issuesList.push({ name: 'Images missing alt text', severity: 'warning', category: 'images' }); }
      }

      // Compute category scores
      const categoryScores: Record<string, number> = {
        meta: pageItem ? computeMetaScore(pageItem) : 0,
        content: pageItem ? computeContentScore(pageItem) : 0,
        links: pageItem ? computeLinksScore(pageItem) : 0,
        images: pageItem ? computeImagesScore(pageItem) : 0,
        performance: lighthouseScores?.performance || 0,
        schema: pageItem ? computeSchemaScore(pageItem) : 0,
        security: pageItem ? computeSecurityScore(pageItem) : 0,
        mobile: lighthouseScores?.seo || 0,
      };

      const overallScore = Math.round(
        Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.keys(categoryScores).length
      );

      const pageCount = onPageResult?.data?.tasks?.[0]?.result?.[0]?.crawl_progress?.pages_crawled || 1;

      await (supabase as any)
        .from('site_audits')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
          overall_score: overallScore,
          category_scores: categoryScores,
          lighthouse_scores: lighthouseScores,
          page_count: pageCount,
          issues_critical: issuesCritical,
          issues_warning: issuesWarning,
          issues_notice: issuesNotice,
          crawl_data: crawlData,
          pages_data: { pages: pageItem ? [pageItem] : [] },
          issues_data: { issues: issuesList, quickWins: issuesList.filter((i) => i.severity === 'warning') },
          api_cost: successfulResults.length * 0.002,
        })
        .eq('id', id);

      // Deduct one scan credit on successful completion
      if (user?.id) {
        await (supabase as any).rpc('increment_scan_credits', { p_user_id: user.id, p_amount: 1 });
      }

      // Load results
      await loadAuditResults(id);
    } catch (err: any) {
      await (supabase as any)
        .from('site_audits')
        .update({ status: 'failed' })
        .eq('id', id);

      setScanState('error');
      setError(err.message || 'Audit failed');
    }
  }

  return (
    <ToolGate tool="site-audit">
      <ToolPageShell
        icon="🔍"
        name="Site Audit"
        description="52-point technical SEO analysis across 8 categories"
      >
        {error && (
          <div className="card p-4 mb-6 bg-danger/10 border-danger">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-display text-danger mb-1">Error</h3>
                <p className="text-ash-300">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setScanState('idle');
                  }}
                  className="btn-ghost mt-3"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {scanState === 'idle' && (
          <>
            <LocationSelector
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={selectLocation}
              showAllOption={true}
            />
            <ScanInput
              onStartScan={startAudit}
              isLoading={false}
              scansRemaining={scansRemaining}
              defaultDomain={business?.domain || ''}
            />
          </>
        )}

        {scanState === 'scanning' && (
          <ProgressTracker progress={progress} domain={domain} />
        )}

        {scanState === 'complete' && results && (
          <Dashboard
            results={results}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </ToolPageShell>
    </ToolGate>
  );
}

// Scoring helpers — compute 0-100 scores from DataForSEO instant_pages page item
function computeMetaScore(page: any): number {
  const c = page?.checks || {};
  let score = 100;
  if (!c.title || c.title === 'absent' || c.title === 'empty') score -= 30;
  if (!c.meta_description || c.meta_description === 'absent') score -= 20;
  if (c.duplicate_title) score -= 25;
  if (c.duplicate_meta_description) score -= 15;
  if (!c.canonical || c.canonical === 'absent') score -= 10;
  return Math.max(0, score);
}

function computeContentScore(page: any): number {
  const c = page?.checks || {};
  let score = 100;
  if (!c.h1 || c.h1 === 'absent') score -= 20;
  if (c.duplicate_content) score -= 30;
  if ((page?.content?.plain_text_word_count || 0) < 300) score -= 20;
  if (c.is_404) score -= 30;
  return Math.max(0, score);
}

function computeLinksScore(page: any): number {
  const c = page?.checks || {};
  let score = 100;
  if (c.broken_links) score -= 30;
  if (c.no_follow_all) score -= 15;
  if (c.redirect_chain) score -= 15;
  if (c.canonical_to_redirect) score -= 10;
  return Math.max(0, score);
}

function computeImagesScore(page: any): number {
  const c = page?.checks || {};
  let score = 100;
  if (c.no_image_alt) score -= 30;
  if (c.no_image_title) score -= 15;
  if (c.images_too_large) score -= 25;
  return Math.max(0, score);
}

function computeSchemaScore(page: any): number {
  const c = page?.checks || {};
  let score = 60; // baseline — schema is optional
  if (c.has_micromarkup) score = 100;
  if (c.valid_micromarkup === false) score = 40;
  return Math.max(0, score);
}

function computeSecurityScore(page: any): number {
  const c = page?.checks || {};
  let score = 100;
  if (c.is_https === false) score -= 50;
  if (c.mixed_content) score -= 30;
  if (c.seo_friendly_url === false) score -= 10;
  return Math.max(0, score);
}
