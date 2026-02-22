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
import { cleanDomain, dfsCall, dfsGet } from '@/lib/dataforseo';
import type { ContentStrategy } from '@/types';
import type {
  AnalysisStatus,
  AnalysisProgress,
  EnhancedConfig,
  EnhancedStrategyResults,
  EnhancedTabId,
  EnhancedKeyword,
  CannibalizationIssue as UICannibalizationIssue,
} from '@/components/tools/ContentStrategy/types';

// Lib layer
import { generateKeywords, clusterKeywords, determinePageType } from '@/lib/contentStrategy/keywords';
import type { GeneratedKeyword, KeywordClusterResult } from '@/lib/contentStrategy/keywords';
import { classifyFunnel } from '@/lib/contentStrategy/funnel';
import { calculateKeywordROI, matchService } from '@/lib/contentStrategy/roi';
import { classifyPage, buildContentMap } from '@/lib/contentStrategy/contentMap';
import type { CrawledPage, ContentMapItem } from '@/lib/contentStrategy/contentMap';
import { buildCalendar } from '@/lib/contentStrategy/calendar';
import { detectCannibalization } from '@/lib/contentStrategy/cannibalization';

import dynamic from 'next/dynamic';

const ConfigForm = dynamic(() => import('@/components/tools/ContentStrategy/ConfigForm'));
const ProgressTracker = dynamic(() => import('@/components/tools/ContentStrategy/ProgressTracker'));
const Dashboard = dynamic(() => import('@/components/tools/ContentStrategy/Dashboard'));

// ── Helpers ──────────────────────────────────────────────────────

const TASKS = [
  'Crawling Site',
  'Discovering Keywords',
  'Enriching Volume Data',
  'Classifying & Clustering',
  'Calculating ROI',
  'Building Content Map',
  'Generating Calendar',
  'Detecting Cannibalization',
] as const;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Page Component ───────────────────────────────────────────────

export default function ContentStrategyPage() {
  const { user } = useUser();
  const { scansRemaining } = useSubscription();
  const { business } = useBusiness();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [config, setConfig] = useState<EnhancedConfig | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    completed: 0,
    total: 8,
    currentTask: '',
    tasks: [],
  });
  const [results, setResults] = useState<EnhancedStrategyResults | null>(null);
  const [activeTab, setActiveTab] = useState<EnhancedTabId>('overview');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // ── Check for existing / in-progress analysis on mount ─────────

  useEffect(() => {
    async function checkExistingAnalysis() {
      if (!business?.id) return;

      const { data } = await (supabase as any)
        .from('content_strategies')
        .select('*')
        .eq('business_id', business.id)
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1);

      const existing = data?.[0] as ContentStrategy | undefined;
      if (existing) {
        setStrategyId(existing.id);
        setAnalysisStatus('analyzing');
        setConfig({
          domain: existing.domain,
          industry: existing.industry,
          economics: existing.economics || {},
          services: (existing as any).services_data || [],
          locations: (existing as any).locations_data || [],
          country: 2840,
          language: 'en',
          brand: '',
        });
        setProgress({
          completed: existing.completed_tasks?.length || 0,
          total: 8,
          currentTask: existing.current_task || '',
          tasks: existing.completed_tasks || [],
        });
      }
    }
    checkExistingAnalysis();
  }, [business?.id, supabase]);

  // ── Realtime progress subscription ─────────────────────────────

  useEffect(() => {
    if (!strategyId) return;

    const channel = supabase
      .channel(`strategy:${strategyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_strategies',
          filter: `id=eq.${strategyId}`,
        },
        (payload: any) => {
          const d = payload.new as any;
          setProgress({
            completed: d.completed_tasks?.length || 0,
            total: 8,
            currentTask: d.current_task || '',
            tasks: d.completed_tasks || [],
          });

          if (d.status === 'complete') loadStrategyResults(strategyId);
          else if (d.status === 'failed') {
            setAnalysisStatus('error');
            setError('Analysis failed. Please try again.');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [strategyId, supabase]);

  // ── Load saved results ─────────────────────────────────────────

  async function loadStrategyResults(id: string) {
    const { data: strategy } = await (supabase as any)
      .from('content_strategies')
      .select('*')
      .eq('id', id)
      .single();

    const s = strategy as any;
    if (!s || s.status !== 'complete') return;

    const results: EnhancedStrategyResults = {
      strategyId: s.id,
      domain: s.domain,
      // Legacy fields (kept for backward compat)
      clusters: s.clusters_data || [],
      opportunities: s.opportunities_data || [],
      calendar: s.calendar_data || [],
      cannibalization: s.cannibalization_data || [],
      totalKeywords: s.total_keywords || 0,
      totalSearchVolume: s.total_search_volume || 0,
      estimatedMonthlyTraffic: s.estimated_monthly_traffic || 0,
      estimatedMonthlyValue: s.estimated_monthly_value || 0,
      apiCost: s.api_cost || 0,
      analyzedAt: s.completed_at || new Date().toISOString(),
      // Enhanced fields
      services: s.services_data || undefined,
      locations: s.locations_data || undefined,
      crawledPages: s.crawled_pages || undefined,
      enhancedKeywords: s.enhanced_keywords || undefined,
      contentMap: s.content_map || undefined,
      enhancedCalendar: s.enhanced_calendar || undefined,
      totalRoi: s.total_roi || undefined,
      totalLeads: s.total_leads || undefined,
      contentGaps: s.content_gaps || undefined,
    };

    setResults(results);
    setAnalysisStatus('complete');
  }

  // ── Start analysis ─────────────────────────────────────────────

  async function startAnalysis(inputConfig: EnhancedConfig) {
    if (!business?.id) {
      setError('Business profile required. Please complete onboarding.');
      return;
    }
    if (scansRemaining <= 0) {
      setError('No scans remaining this month. Upgrade your plan for more.');
      return;
    }

    setError(null);
    setConfig(inputConfig);
    const domain = cleanDomain(inputConfig.domain);

    try {
      const { data: strategy, error: insertError } = await (supabase as any)
        .from('content_strategies')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          domain,
          industry: inputConfig.industry,
          economics: inputConfig.economics,
          services_data: inputConfig.services,
          locations_data: inputConfig.locations,
          status: 'pending',
          started_at: new Date().toISOString(),
          completed_tasks: [],
          current_task: '',
          api_cost: 0,
        })
        .select()
        .single();

      if (insertError || !strategy) throw new Error('Failed to create strategy record');

      setStrategyId(strategy.id);
      setAnalysisStatus('analyzing');

      // Run pipeline in background (don't await in render cycle)
      runAnalysis(strategy.id, domain, inputConfig);
    } catch (err: any) {
      setAnalysisStatus('error');
      setError(err.message || 'Failed to start analysis');
    }
  }

  // ── 8-Task Real API Pipeline ───────────────────────────────────

  async function runAnalysis(id: string, domain: string, cfg: EnhancedConfig) {
    let apiCost = 0;
    const enabledServices = cfg.services.filter(s => s.enabled && s.name.trim());

    try {
      // Update status
      await (supabase as any)
        .from('content_strategies')
        .update({ status: 'analyzing', current_task: TASKS[0] })
        .eq('id', id);

      // ──────────────────────────────────────────────────────────
      // TASK 1: Crawl Site
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[0]);

      let crawledPages: CrawledPage[] = [];
      try {
        // Post crawl task
        const crawlRes = await dfsCall<any>('v3/on_page/task_post', [{
          target: domain,
          max_crawl_pages: 150,
          load_resources: false,
          enable_javascript: false,
        }]);
        apiCost += crawlRes?.tasks?.[0]?.cost || 0;
        const crawlTaskId = crawlRes?.tasks?.[0]?.id;

        if (crawlTaskId) {
          // Poll until finished (max 30 attempts, 5s apart)
          let crawlDone = false;
          for (let attempt = 0; attempt < 30 && !crawlDone; attempt++) {
            await sleep(5000);
            try {
              const summary = await dfsGet<any>(`v3/on_page/summary/${crawlTaskId}`);
              apiCost += summary?.tasks?.[0]?.cost || 0;
              const info = summary?.tasks?.[0]?.result?.[0]?.crawl_progress;
              if (info === 'finished' || summary?.tasks?.[0]?.result?.[0]?.crawl_status?.pages_crawled > 0) {
                crawlDone = true;
              }
            } catch {
              // Retry on error
            }
          }

          if (crawlDone) {
            // Get crawled pages
            const pagesRes = await dfsCall<any>('v3/on_page/pages', [{
              id: crawlTaskId,
              limit: 150,
              order_by: ['meta.internal_links_count,desc'],
              filters: ['resource_type', '=', 'html'],
            }]);
            apiCost += pagesRes?.tasks?.[0]?.cost || 0;

            const rawPages = pagesRes?.tasks?.[0]?.result?.[0]?.items || [];
            crawledPages = rawPages.map((p: any) => {
              const url = p.url || '';
              const pathStr = new URL(url, `https://${domain}`).pathname;
              return {
                url,
                path: pathStr,
                title: p.meta?.title || '',
                h1: p.meta?.htags?.h1?.[0] || '',
                desc: p.meta?.description || '',
                wordCount: p.meta?.content?.plain_text_word_count || 0,
                internalLinks: p.meta?.internal_links_count || 0,
                type: classifyPage(pathStr, p.meta?.title || ''),
              };
            });
          }
        }
      } catch (err) {
        // Crawl is non-critical — continue with empty pages
        console.warn('Crawl failed, continuing without:', err);
      }

      // ──────────────────────────────────────────────────────────
      // TASK 2: Discover Keywords
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[1]);

      // Local generation: service × location × modifier
      const generatedKws = generateKeywords(enabledServices, cfg.locations, cfg.brand);

      // DataForSEO Labs: keywords for site
      let labsKeywords: string[] = [];
      try {
        const siteKwRes = await dfsCall<any>('v3/dataforseo_labs/google/keywords_for_site/live', [{
          target: domain,
          location_code: cfg.country,
          language_code: cfg.language,
          include_serp_info: false,
          limit: 200,
        }]);
        apiCost += siteKwRes?.tasks?.[0]?.cost || 0;
        const siteItems = siteKwRes?.tasks?.[0]?.result?.[0]?.items || [];
        labsKeywords = siteItems.map((i: any) => i.keyword).filter(Boolean);
      } catch {
        // Labs is optional
      }

      // DataForSEO Labs: keyword suggestions for top services
      const topServices = enabledServices.slice(0, 5);
      for (const svc of topServices) {
        try {
          const sugRes = await dfsCall<any>('v3/dataforseo_labs/google/keyword_suggestions/live', [{
            keyword: svc.name.toLowerCase(),
            location_code: cfg.country,
            language_code: cfg.language,
            include_serp_info: false,
            limit: 50,
          }]);
          apiCost += sugRes?.tasks?.[0]?.cost || 0;
          const sugItems = sugRes?.tasks?.[0]?.result?.[0]?.items || [];
          labsKeywords.push(...sugItems.map((i: any) => i.keyword).filter(Boolean));
        } catch {
          // Continue
        }
      }

      // Merge all keywords (dedup)
      const allKeywordSet = new Set<string>();
      const keywordServiceMap = new Map<string, string>(); // keyword → service name

      for (const gk of generatedKws) {
        const kw = gk.keyword.toLowerCase().trim();
        if (kw.length >= 3 && kw.length <= 80) {
          allKeywordSet.add(kw);
          keywordServiceMap.set(kw, gk.serviceName);
        }
      }
      for (const lk of labsKeywords) {
        const kw = lk.toLowerCase().trim();
        if (kw.length >= 3 && kw.length <= 80) {
          allKeywordSet.add(kw);
          if (!keywordServiceMap.has(kw)) {
            // Try to match to a service
            const matched = matchService(kw, enabledServices);
            keywordServiceMap.set(kw, matched?.name || enabledServices[0]?.name || '');
          }
        }
      }

      const allKeywords = Array.from(allKeywordSet);

      // ──────────────────────────────────────────────────────────
      // TASK 3: Enrich Volume Data
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[2]);

      // Batch to search volume API (max 1000 per call)
      const volumeMap = new Map<string, { volume: number; cpc: number; competition: number; monthly: number[] }>();
      const BATCH_SIZE = 700;

      for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
        const batch = allKeywords.slice(i, i + BATCH_SIZE);
        try {
          const volRes = await dfsCall<any>('v3/keywords_data/google_ads/search_volume/live', [{
            keywords: batch,
            location_code: cfg.country,
            language_code: cfg.language,
          }]);
          apiCost += volRes?.tasks?.[0]?.cost || 0;
          const items = volRes?.tasks?.[0]?.result || [];
          for (const item of items) {
            if (item.keyword && (item.search_volume > 0 || labsKeywords.includes(item.keyword))) {
              const monthly = (item.monthly_searches || []).map((m: any) => m.search_volume || 0);
              volumeMap.set(item.keyword, {
                volume: item.search_volume || 0,
                cpc: item.cpc || 0,
                competition: item.competition || 0,
                monthly,
              });
            }
          }
        } catch {
          // Continue with partial data
        }
      }

      // ──────────────────────────────────────────────────────────
      // TASK 4: Classify & Cluster
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[3]);

      const enrichedKeywords: EnhancedKeyword[] = [];

      for (const kw of allKeywords) {
        const vol = volumeMap.get(kw);
        if (!vol && !labsKeywords.includes(kw)) continue; // Skip zero-volume generated keywords

        const funnel = classifyFunnel(kw, cfg.locations);
        const serviceName = keywordServiceMap.get(kw) || '';
        const genKw = generatedKws.find(g => g.keyword === kw);
        const pageType = genKw ? determinePageType(kw, genKw.type) : (funnel === 'top' ? 'blog' as const : 'service' as const);

        // ROI will be calculated in task 5
        enrichedKeywords.push({
          keyword: kw,
          searchVolume: vol?.volume || 0,
          cpc: vol?.cpc || 0,
          competition: vol?.competition || 0,
          difficulty: Math.round((vol?.competition || 0) * 100),
          trend: vol?.monthly || [],
          funnel,
          pageType,
          cluster: 0, // Will be set during clustering
          status: 'gap', // Will be updated by content map
          serviceName,
          convMultiplier: 0,
          profitPerJob: 0,
          closeRate: 0,
          monthlyVisitors: 0,
          monthlyLeads: 0,
          monthlyClosed: 0,
          roi: 0,
          assignedPage: null,
          sources: genKw ? ['generated'] : ['labs'],
        });
      }

      // Cluster by similarity
      const clusterInput = enrichedKeywords.map(ek => ({
        keyword: ek.keyword,
        searchVolume: ek.searchVolume,
        roi: 0,
        funnel: ek.funnel,
        pageType: ek.pageType,
      }));

      const clusters = clusterKeywords(clusterInput);

      // Assign cluster IDs back to keywords
      for (const cluster of clusters) {
        for (const kwStr of cluster.keywords) {
          const ek = enrichedKeywords.find(e => e.keyword === kwStr);
          if (ek) ek.cluster = cluster.id;
        }
      }

      // ──────────────────────────────────────────────────────────
      // TASK 5: Calculate ROI
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[4]);

      const BASE_CONV_RATE = 0.03; // 3% base conversion rate

      for (const ek of enrichedKeywords) {
        const svc = matchService(ek.keyword, enabledServices, ek.serviceName);
        const profit = svc?.profit || enabledServices[0]?.profit || 200;
        const close = svc?.close || enabledServices[0]?.close || 30;

        const roiResult = calculateKeywordROI(
          ek.searchVolume,
          ek.funnel,
          BASE_CONV_RATE,
          profit,
          close,
        );

        ek.profitPerJob = profit;
        ek.closeRate = close;
        ek.monthlyVisitors = roiResult.monthlyVisitors;
        ek.monthlyLeads = roiResult.monthlyLeads;
        ek.monthlyClosed = roiResult.monthlyClosed;
        ek.roi = roiResult.roi;
      }

      // Update cluster ROIs
      for (const cluster of clusters) {
        cluster.totalRoi = cluster.keywords.reduce((sum, kwStr) => {
          const ek = enrichedKeywords.find(e => e.keyword === kwStr);
          return sum + (ek?.roi || 0);
        }, 0);
      }

      // ──────────────────────────────────────────────────────────
      // TASK 6: Build Content Map
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[5]);

      const contentMap = buildContentMap(clusters, crawledPages, domain);

      // Update keyword statuses based on content map
      for (const mapItem of contentMap) {
        for (const kwStr of mapItem.keywords) {
          const ek = enrichedKeywords.find(e => e.keyword === kwStr);
          if (ek) {
            ek.status = mapItem.status;
            ek.assignedPage = mapItem.url;
          }
        }
      }

      // ──────────────────────────────────────────────────────────
      // TASK 7: Generate Calendar
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[6]);

      const calendarItems = buildCalendar(contentMap);

      // ──────────────────────────────────────────────────────────
      // TASK 8: Detect Cannibalization
      // ──────────────────────────────────────────────────────────
      await markTask(id, TASKS[7]);

      const cannibInput = enrichedKeywords.map(ek => ({
        keyword: ek.keyword,
        searchVolume: ek.searchVolume,
        assignedPage: ek.assignedPage,
      }));
      const cannibRaw = detectCannibalization(cannibInput, crawledPages);

      // Convert lib CannibalizationIssue → UI CannibalizationIssue
      const cannibalization: UICannibalizationIssue[] = cannibRaw.map(c => ({
        id: c.id,
        keyword: c.keyword,
        searchVolume: c.searchVolume,
        severity: c.severity === 'warning' ? 'low' : c.severity,
        competingPages: c.competingPages.map(p => ({
          url: p.url,
          rank: p.rank,
          traffic: p.traffic,
        })),
        recommendation: c.recommendation,
      }));

      // Mark cannibalized keywords
      for (const issue of cannibRaw) {
        for (const ek of enrichedKeywords) {
          if (ek.keyword === issue.keyword && issue.severity !== 'warning') {
            ek.status = 'cannibalized';
          }
        }
      }

      // ──────────────────────────────────────────────────────────
      // Calculate totals & save
      // ──────────────────────────────────────────────────────────

      const totalKeywords = enrichedKeywords.length;
      const totalSearchVolume = enrichedKeywords.reduce((s, k) => s + k.searchVolume, 0);
      const totalRoi = enrichedKeywords.reduce((s, k) => s + k.roi, 0);
      const totalLeads = enrichedKeywords.reduce((s, k) => s + k.monthlyLeads, 0);
      const contentGaps = contentMap.filter(c => c.status === 'gap').length;

      await (supabase as any)
        .from('content_strategies')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
          // Legacy columns
          clusters_data: clusters,
          opportunities_data: [],
          calendar_data: [],
          cannibalization_data: cannibalization,
          total_keywords: totalKeywords,
          total_search_volume: totalSearchVolume,
          estimated_monthly_traffic: Math.round(enrichedKeywords.reduce((s, k) => s + k.monthlyVisitors, 0)),
          estimated_monthly_value: Math.round(totalRoi),
          api_cost: apiCost,
          // Enhanced columns
          services_data: cfg.services,
          locations_data: cfg.locations,
          crawled_pages: crawledPages,
          enhanced_keywords: enrichedKeywords,
          content_map: contentMap,
          enhanced_calendar: calendarItems,
          total_roi: Math.round(totalRoi),
          total_leads: parseFloat(totalLeads.toFixed(1)),
          content_gaps: contentGaps,
          completed_tasks: [...TASKS],
          current_task: TASKS[7],
        })
        .eq('id', id);

      // Deduct scan credit
      if (user?.id) {
        await (supabase as any).rpc('decrement_scan_credits', { p_user_id: user.id, p_amount: 1 });
      }

      await loadStrategyResults(id);
    } catch (err: any) {
      console.error('Analysis pipeline error:', err);
      await (supabase as any)
        .from('content_strategies')
        .update({ status: 'failed' })
        .eq('id', id);

      setAnalysisStatus('error');
      setError(err.message || 'Analysis failed');
    }
  }

  // ── Progress helper ────────────────────────────────────────────

  async function markTask(id: string, taskName: string) {
    const { data: current } = await (supabase as any)
      .from('content_strategies')
      .select('completed_tasks')
      .eq('id', id)
      .single();

    const completedTasks = [...(current?.completed_tasks || [])];
    // Mark previous task as completed (not the current one — it's starting)
    const taskIndex = TASKS.indexOf(taskName as typeof TASKS[number]);
    if (taskIndex > 0) {
      const prevTask = TASKS[taskIndex - 1];
      if (!completedTasks.includes(prevTask)) completedTasks.push(prevTask);
    }

    await (supabase as any)
      .from('content_strategies')
      .update({
        completed_tasks: completedTasks,
        current_task: taskName,
      })
      .eq('id', id);
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <ToolGate tool="content-strategy">
      <ToolPageShell
        icon="📝"
        name="Content Strategy"
        description="ROI-based keyword research and content planning"
      >
        {error && (
          <div className="card p-4 mb-6 bg-danger/10 border-danger">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-display text-danger mb-1">Error</h3>
                <p className="text-ash-300">{error}</p>
                <button
                  onClick={() => { setError(null); setAnalysisStatus('idle'); }}
                  className="btn-ghost mt-3"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {analysisStatus === 'idle' && (
          <>
            <LocationSelector
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={selectLocation}
              showAllOption={true}
            />
            <ConfigForm
              onStartAnalysis={startAnalysis}
              isLoading={false}
              scansRemaining={scansRemaining}
              defaultDomain={business?.domain || ''}
              defaultIndustry={business?.industry || ''}
            />
          </>
        )}

        {analysisStatus === 'analyzing' && config && (
          <ProgressTracker progress={progress} domain={config.domain} />
        )}

        {analysisStatus === 'complete' && results && (
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
