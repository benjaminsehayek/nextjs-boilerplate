'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { useUser } from '@/lib/hooks/useUser';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { createClient } from '@/lib/supabase/client';
import { cleanDomain } from '@/lib/dataforseo';
import {
  submitCrawlTask,
  submitLighthouseTask,
  pollCrawlStatus,
  fetchCrawlData,
} from '@/lib/siteAudit/crawlEngine';
import { computeScores, computePageHealth } from '@/lib/siteAudit/scoring';
import { generateDetailedIssues, generateQuickWins } from '@/lib/siteAudit/issueDetection';
import type {
  ScanState,
  CrawlProgress,
  CrawlPhase,
  SiteAuditResults,
  TabId,
  LogEntry,
  CrawlData,
  CategoryScores,
  DetailedIssue,
  QuickWin,
} from '@/components/tools/SiteAudit/types';

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
  const [progress, setProgress] = useState<CrawlProgress>({
    phase: 'submitting',
    completed: 0,
    total: 18,
    tasks: [],
    pagesCrawled: 0,
    pagesInQueue: 0,
    elapsedSeconds: 0,
    log: [],
  });
  const [results, setResults] = useState<SiteAuditResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const crawlStartRef = useRef<number>(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  // Logger: appends to progress log
  const log = useCallback((message: string, level: LogEntry['level'] = 'info') => {
    setProgress((prev) => ({
      ...prev,
      log: [...prev.log, { message, level, timestamp: Date.now() }],
    }));
  }, []);

  // Update completed tasks
  const completeTask = useCallback((taskName: string) => {
    setProgress((prev) => {
      if (prev.tasks.includes(taskName)) return prev;
      const tasks = [...prev.tasks, taskName];
      return { ...prev, tasks, completed: tasks.length };
    });
  }, []);

  // Update phase
  const setPhase = useCallback((phase: CrawlPhase) => {
    setProgress((prev) => ({ ...prev, phase }));
  }, []);

  // Elapsed time ticker
  useEffect(() => {
    if (scanState === 'scanning') {
      elapsedTimerRef.current = setInterval(() => {
        if (crawlStartRef.current) {
          setProgress((prev) => ({
            ...prev,
            elapsedSeconds: Math.floor((Date.now() - crawlStartRef.current) / 1000),
          }));
        }
      }, 1000);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [scanState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  // Check for existing audit on mount
  useEffect(() => {
    async function checkExistingAudit() {
      if (!business?.id) return;

      const { data: existingAudit } = await (supabase as any)
        .from('site_audits')
        .select('*')
        .eq('business_id', business.id)
        .in('status', ['complete'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingAudit?.status === 'complete') {
        loadAuditResults(existingAudit);
      }
    }

    checkExistingAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  function loadAuditResults(audit: any) {
    const crawlData: CrawlData = audit.crawl_data || {};
    const categoryScores: CategoryScores = audit.category_scores || { _overall: 0 };
    const issues: DetailedIssue[] = (audit.issues_data as any)?.detailed || [];
    const quickWins: QuickWin[] = ((audit.issues_data as any)?.quickWins || []).map((qw: any, i: number) => ({
      id: 'qw-' + i,
      title: qw.title,
      description: qw.why || qw.description,
      estimatedTime: qw.timeMin ? qw.timeMin + ' min' : '5 min',
      impactScore: qw.impact || 3,
      affectedPages: qw.count || 0,
      fix: qw.fix,
      category: qw.category,
    }));

    const results: SiteAuditResults = {
      auditId: audit.id,
      domain: audit.domain || domain || 'Unknown',
      overallScore: categoryScores._overall || audit.overall_score || 0,
      categoryScores,
      pageCount: audit.page_count || crawlData.pages?.items?.length || 0,
      issuesCritical: audit.issues_critical || issues.filter((i) => i.severity === 'critical').length,
      issuesWarning: audit.issues_warning || issues.filter((i) => i.severity === 'warning').length,
      issuesNotice: audit.issues_notice || issues.filter((i) => i.severity === 'notice').length,
      lighthouseScores: audit.lighthouse_scores,
      crawlData,
      issues,
      quickWins,
      keywordData: null, // Will be computed from crawlData.keywords if present
      apiCost: audit.api_cost || 0,
      startedAt: audit.started_at,
      completedAt: audit.completed_at || new Date().toISOString(),
    };

    setDomain(audit.domain || '');
    setResults(results);
    setScanState('complete');
  }

  async function startAudit(inputDomain: string, maxPages = 250) {
    if (!business?.id) {
      setError('Business profile required. Please complete onboarding.');
      return;
    }
    if (scansRemaining <= 0) {
      setError('No scans remaining this month. Upgrade your plan for more scans.');
      return;
    }

    setError(null);
    abortRef.current = false;
    const cleanedDomain = cleanDomain(inputDomain);
    setDomain(cleanedDomain);
    crawlStartRef.current = Date.now();

    // Reset progress
    setProgress({
      phase: 'submitting',
      completed: 0,
      total: 18,
      tasks: [],
      pagesCrawled: 0,
      pagesInQueue: 0,
      elapsedSeconds: 0,
      log: [],
    });
    setScanState('scanning');

    try {
      // Create audit record in Supabase
      const { data: audit, error: insertError } = await (supabase as any)
        .from('site_audits')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          domain: cleanedDomain,
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
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError?.message || 'Failed to create audit record');
      }

      setAuditId(audit.id);

      // Run the full crawl pipeline
      await runCrawlPipeline(audit.id, cleanedDomain, maxPages);
    } catch (err: any) {
      if (!abortRef.current) {
        setScanState('error');
        setError(err.message || 'Failed to start audit');
      }
    }
  }

  async function runCrawlPipeline(auditId: string, cleanedDomain: string, maxPages: number) {
    let totalApiCost = 0;

    try {
      // ── Step 1: Submit crawl task ──
      setPhase('submitting');
      const taskId = await submitCrawlTask(cleanedDomain, maxPages, log);
      completeTask('Submitting crawl task');

      // Update status in Supabase
      await (supabase as any)
        .from('site_audits')
        .update({ status: 'crawling' })
        .eq('id', auditId);

      // ── Step 2: Submit Lighthouse + Detect business (parallel, non-blocking) ──
      let lhTaskId: string | null = null;
      const lhPromise = submitLighthouseTask(cleanedDomain, log)
        .then((id) => { lhTaskId = id; completeTask('Submitting Lighthouse task'); })
        .catch((e) => { log('Lighthouse task failed: ' + e.message, 'warning'); completeTask('Submitting Lighthouse task'); });

      let detectedBusiness: any = null;
      const bizPromise = (async () => {
        try {
          // Dynamic import to avoid bundling if not needed
          const { detectBusiness } = await import('@/lib/siteAudit/businessDetection');
          detectedBusiness = await detectBusiness(cleanedDomain, log);
          completeTask('Detecting business');
        } catch (e: any) {
          log('Business detection failed: ' + e.message, 'warning');
          completeTask('Detecting business');
        }
      })();

      // Wait for parallel tasks
      await Promise.all([lhPromise, bizPromise]);

      if (abortRef.current) return;

      // ── Step 3: Poll until crawl finishes ──
      setPhase('crawling');
      log('Waiting for crawl to complete...');

      await new Promise<void>((resolve, reject) => {
        const poll = async () => {
          if (abortRef.current) { reject(new Error('Aborted')); return; }
          try {
            const status = await pollCrawlStatus(taskId);
            setProgress((prev) => ({
              ...prev,
              pagesCrawled: status.pagesCrawled,
              pagesInQueue: status.pagesInQueue,
            }));

            if (status.finished) {
              completeTask('Crawling pages');
              log('Crawl finished! ' + status.pagesCrawled + ' pages crawled', 'success');
              resolve();
            } else {
              setTimeout(poll, 4000);
            }
          } catch (e: any) {
            log('Poll error: ' + e.message, 'warning');
            setTimeout(poll, 4000);
          }
        };
        poll();
      });

      if (abortRef.current) return;

      // ── Step 4: Fetch all data endpoints ──
      setPhase('fetching');
      log('Fetching detailed reports...');

      const crawlData = await fetchCrawlData(taskId, lhTaskId, log, (taskName) => {
        completeTask('Fetching ' + taskName.replace('Fetching ', ''));
      }) as CrawlData;

      // Attach summary from a final poll
      const finalStatus = await pollCrawlStatus(taskId);
      crawlData.summary = finalStatus.summary || undefined;
      crawlData.business = detectedBusiness;

      if (abortRef.current) return;

      // ── Step 5: Market discovery ──
      setPhase('analyzing');
      const markets: string[] = [];

      // Add primary market from business detection
      if (detectedBusiness?.city && detectedBusiness?.region) {
        const country = detectedBusiness.country === 'US' || detectedBusiness.country === 'us' ? 'United States'
          : detectedBusiness.country === 'CA' || detectedBusiness.country === 'ca' ? 'Canada' : '';
        const autoMarket = [detectedBusiness.city, detectedBusiness.region, country].filter(Boolean).join(',');
        if (autoMarket) {
          markets.push(autoMarket);
          log('Auto-detected market: ' + autoMarket, 'success');
        }
      }

      // Discover markets from crawled location pages
      try {
        const { discoverMarketsFromCrawl, detectCityFromContent } = await import('@/lib/siteAudit/marketDiscovery');
        const pages = crawlData.pages?.items || [];
        const discovered = discoverMarketsFromCrawl(pages, detectedBusiness);
        if (discovered.length > 0) {
          log('Market Auto-Discovery — found ' + discovered.length + ' location pages');
          const existingLower = markets.map((m) => m.toLowerCase());
          let added = 0;
          for (const dm of discovered) {
            if (markets.length >= 5) break;
            if (existingLower.includes(dm.location.toLowerCase())) continue;
            if (existingLower.some((m) => m.includes(dm.city.toLowerCase()))) continue;
            markets.push(dm.location);
            existingLower.push(dm.location.toLowerCase());
            added++;
            log('  Auto-added market: ' + dm.location, 'success');
          }
          if (added > 0) log('  ' + added + ' new market(s) added from site structure', 'success');
        }

        // Content fallback if no markets found
        if (markets.length === 0) {
          log('No markets from GBP or location pages — scanning page content...');
          const detected = detectCityFromContent(pages);
          if (detected) {
            markets.push(detected.location);
            log('Content-based detection: ' + detected.location, 'success');
          } else {
            log('No city detected — using TLD fallback', 'warning');
          }
        }
      } catch (e: any) {
        log('Market discovery failed: ' + e.message, 'warning');
      }
      completeTask('Discovering markets');
      crawlData.markets = markets;

      if (abortRef.current) return;

      // ── Step 6: Keyword extraction + SERP checks ──
      setPhase('keywords');
      let keywordsData: CrawlData['keywords'] = null;

      try {
        const { extractKeywordsFromCrawl } = await import('@/lib/siteAudit/keywordExtraction');
        const pages = crawlData.pages?.items || [];
        const extractedKws = extractKeywordsFromCrawl(pages, markets, cleanedDomain);
        log('Keyword extraction: ' + extractedKws.length + ' candidates', 'success');
        completeTask('Extracting keywords');

        if (extractedKws.length > 0 && markets.length > 0) {
          const { checkLocalSerps, checkMapsForMarkets } = await import('@/lib/siteAudit/serpChecks');
          const serpResult = await checkLocalSerps(
            extractedKws, cleanedDomain, markets, log
          );
          completeTask('Checking local SERPs');

          // Maps checks
          const coords = detectedBusiness?.coords;
          if (coords) {
            const mapsData = await checkMapsForMarkets(
              serpResult.markets, markets, coords, cleanedDomain, log
            );
            keywordsData = {
              markets: serpResult.markets,
              locations: markets,
              mapsData,
            };
          } else {
            log('Maps SERP skipped — no business coordinates detected', 'warning');
            keywordsData = {
              markets: serpResult.markets,
              locations: markets,
            };
          }
          completeTask('Checking Maps rankings');
        } else {
          completeTask('Extracting keywords');
          completeTask('Checking local SERPs');
          completeTask('Checking Maps rankings');
        }
      } catch (e: any) {
        log('Keyword intelligence failed: ' + e.message, 'warning');
        completeTask('Extracting keywords');
        completeTask('Checking local SERPs');
        completeTask('Checking Maps rankings');
      }

      crawlData.keywords = keywordsData;

      if (abortRef.current) return;

      // ── Step 7: Compute scores + issues ──
      log('Computing scores and generating issues...');
      const categoryScores = computeScores(crawlData);
      completeTask('Computing scores');

      const issues = generateDetailedIssues(crawlData);
      const quickWinsRaw = generateQuickWins(issues);
      completeTask('Generating issues');

      const issuesCritical = issues.filter((i) => i.severity === 'critical').length;
      const issuesWarning = issues.filter((i) => i.severity === 'warning').length;
      const issuesNotice = issues.filter((i) => i.severity === 'notice').length;
      const pageCount = crawlData.pages?.items?.length || 0;

      // Extract Lighthouse scores
      const lh = crawlData.lighthouse;
      const lighthouseScores = lh?.categories ? {
        performance: Math.round((lh.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lh.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lh.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lh.categories.seo?.score || 0) * 100),
      } : null;

      // Quick wins as QuickWin[]
      const quickWins: QuickWin[] = quickWinsRaw.map((qw, i) => ({
        id: 'qw-' + i,
        title: qw.title,
        description: qw.why,
        estimatedTime: qw.timeMin + ' min',
        impactScore: qw.impact,
        affectedPages: qw.count,
        fix: qw.fix,
        category: qw.category,
      }));

      // ── Step 8: Save to Supabase ──
      setPhase('complete');
      log('Saving results...', 'success');

      await (supabase as any)
        .from('site_audits')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
          overall_score: categoryScores._overall,
          category_scores: categoryScores,
          lighthouse_scores: lighthouseScores,
          page_count: pageCount,
          issues_critical: issuesCritical,
          issues_warning: issuesWarning,
          issues_notice: issuesNotice,
          crawl_data: crawlData,
          pages_data: { items: crawlData.pages?.items || [], totalCount: pageCount },
          issues_data: { detailed: issues, quickWins: quickWinsRaw },
          api_cost: totalApiCost,
          completed_tasks: progress.tasks,
        })
        .eq('id', auditId);

      // Deduct scan credit
      if (user?.id) {
        await (supabase as any).rpc('decrement_scan_credits', { p_user_id: user.id, p_amount: 1 });
      }

      // Build results object
      const auditResults: SiteAuditResults = {
        auditId,
        domain: cleanedDomain,
        overallScore: categoryScores._overall,
        categoryScores,
        pageCount,
        issuesCritical,
        issuesWarning,
        issuesNotice,
        lighthouseScores,
        crawlData,
        issues,
        quickWins,
        keywordData: null,
        apiCost: totalApiCost,
        startedAt: new Date(crawlStartRef.current).toISOString(),
        completedAt: new Date().toISOString(),
      };

      log('Site audit complete!', 'success');
      setResults(auditResults);
      setScanState('complete');
    } catch (err: any) {
      if (abortRef.current) return;

      log('Audit failed: ' + err.message, 'error');

      await (supabase as any)
        .from('site_audits')
        .update({ status: 'failed' })
        .eq('id', auditId);

      setScanState('error');
      setError(err.message || 'Audit failed');
    }
  }

  function handleNewScan() {
    setScanState('idle');
    setResults(null);
    setAuditId(null);
    setError(null);
    setActiveTab('overview');
  }

  return (
    <ToolGate tool="site-audit">
      <ToolPageShell
        icon="🔍"
        name="Site Audit"
        description="Full-site crawl with 40+ issue checks across 10 scoring categories"
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
          <>
            <div className="flex justify-end mb-4">
              <button onClick={handleNewScan} className="btn-ghost text-sm">
                Run New Scan
              </button>
            </div>
            <Dashboard
              results={results}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </>
        )}
      </ToolPageShell>
    </ToolGate>
  );
}
