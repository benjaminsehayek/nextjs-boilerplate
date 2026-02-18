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
import type { ContentStrategy } from '@/types';
import type {
  AnalysisStatus,
  ContentStrategyConfig,
  AnalysisProgress,
  ContentStrategyResults,
  TabId,
  KeywordCluster,
  ContentCalendarItem,
  CannibalizationIssue,
  ClusterIntent,
  Priority,
  ContentType,
  KeywordData,
  DFSKeywordsResponse,
} from '@/components/tools/ContentStrategy/types';

// Lazy load heavy components
import dynamic from 'next/dynamic';

const ConfigForm = dynamic(() => import('@/components/tools/ContentStrategy/ConfigForm'));
const ProgressTracker = dynamic(() => import('@/components/tools/ContentStrategy/ProgressTracker'));
const Dashboard = dynamic(() => import('@/components/tools/ContentStrategy/Dashboard'));

export default function ContentStrategyPage() {
  const { user } = useUser();
  const { scansRemaining } = useSubscription();
  const { business } = useBusiness(user?.id);
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [config, setConfig] = useState<ContentStrategyConfig | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    completed: 0,
    total: 8,
    currentTask: '',
    tasks: [],
  });
  const [results, setResults] = useState<ContentStrategyResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Check for existing incomplete analysis on mount
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

      const existingStrategy = data?.[0] as ContentStrategy | undefined;

      if (existingStrategy) {
        setStrategyId(existingStrategy.id);
        setAnalysisStatus('analyzing');
        setConfig({
          domain: existingStrategy.domain,
          industry: existingStrategy.industry,
          economics: existingStrategy.economics || {},
        });
        setProgress({
          completed: existingStrategy.completed_tasks?.length || 0,
          total: 8,
          currentTask: existingStrategy.current_task || '',
          tasks: existingStrategy.completed_tasks || [],
        });
      }
    }

    checkExistingAnalysis();
  }, [business?.id, supabase]);

  // Real-time progress updates via Supabase
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
        (payload) => {
          const newData = payload.new as any;

          setProgress({
            completed: newData.completed_tasks?.length || 0,
            total: 8,
            currentTask: newData.current_task || '',
            tasks: newData.completed_tasks || [],
          });

          if (newData.status === 'complete') {
            loadStrategyResults(strategyId);
          } else if (newData.status === 'failed') {
            setAnalysisStatus('error');
            setError('Analysis failed. Please try again.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [strategyId, supabase]);

  async function loadStrategyResults(id: string) {
    const { data: strategy } = await (supabase as any)
      .from('content_strategies')
      .select('*')
      .eq('id', id)
      .single();

    const typedStrategy = strategy as ContentStrategy | null;

    if (typedStrategy && typedStrategy.status === 'complete') {
      const results: ContentStrategyResults = {
        strategyId: typedStrategy.id,
        domain: typedStrategy.domain,
        clusters: (typedStrategy as any).clusters_data || [],
        opportunities: (typedStrategy as any).opportunities_data || [],
        calendar: (typedStrategy as any).calendar_data || [],
        cannibalization: (typedStrategy as any).cannibalization_data || [],
        totalKeywords: (typedStrategy as any).total_keywords || 0,
        totalSearchVolume: (typedStrategy as any).total_search_volume || 0,
        estimatedMonthlyTraffic: (typedStrategy as any).estimated_monthly_traffic || 0,
        estimatedMonthlyValue: (typedStrategy as any).estimated_monthly_value || 0,
        apiCost: typedStrategy.api_cost || 0,
        analyzedAt: (typedStrategy as any).completed_at || new Date().toISOString(),
      };

      setResults(results);
      setAnalysisStatus('complete');
    }
  }

  async function startAnalysis(inputConfig: ContentStrategyConfig) {
    if (!business?.id) {
      setError('Business profile required. Please complete onboarding.');
      return;
    }

    if (scansRemaining <= 0) {
      setError('No scans remaining this month. Upgrade your plan for more scans.');
      return;
    }

    setError(null);
    setConfig(inputConfig);
    const cleanedDomain = cleanDomain(inputConfig.domain);

    try {
      // Create strategy record
      const { data: strategy, error: insertError } = await (supabase as any)
        .from('content_strategies')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          domain: cleanedDomain,
          industry: inputConfig.industry,
          economics: inputConfig.economics,
          status: 'pending',
          started_at: new Date().toISOString(),
          completed_tasks: [],
          current_task: '',
          api_cost: 0,
        })
        .select()
        .single();

      const typedNewStrategy = strategy as ContentStrategy | null;

      if (insertError || !typedNewStrategy) {
        throw new Error('Failed to create strategy record');
      }

      setStrategyId(typedNewStrategy.id);
      setAnalysisStatus('analyzing');

      // Start analysis in background
      runAnalysis(typedNewStrategy.id, cleanedDomain, inputConfig);
    } catch (err: any) {
      setAnalysisStatus('error');
      setError(err.message || 'Failed to start analysis');
    }
  }

  async function runAnalysis(
    id: string,
    domain: string,
    config: ContentStrategyConfig
  ) {
    const tasks = [
      'Fetching Keywords',
      'Analyzing Search Volume',
      'Calculating Difficulty',
      'Clustering by Intent',
      'Detecting Cannibalization',
      'Scoring Opportunities',
      'Building Calendar',
      'Finalizing Results',
    ];

    try {
      // Update status to analyzing
      await (supabase as any)
        .from('content_strategies')
        .update({
          status: 'analyzing',
          current_task: tasks[0],
        })
        .eq('id', id);

      // Task 1: Fetch Keywords
      await updateProgress(id, tasks[0]);
      const keywordData = await fetchKeywords(domain, config.industry);

      // Task 2: Analyze Search Volume
      await updateProgress(id, tasks[1]);
      const volumeData = await analyzeSearchVolume(keywordData);

      // Task 3: Calculate Difficulty
      await updateProgress(id, tasks[2]);
      const difficultyData = await calculateDifficulty(volumeData);

      // Task 4: Cluster by Intent
      await updateProgress(id, tasks[3]);
      const clusters = await clusterKeywords(difficultyData, config.industry);

      // Task 5: Detect Cannibalization
      await updateProgress(id, tasks[4]);
      const cannibalization = await detectCannibalization(domain, clusters);

      // Task 6: Score Opportunities
      await updateProgress(id, tasks[5]);
      const opportunities = await scoreOpportunities(clusters, config.economics);

      // Task 7: Build Calendar
      await updateProgress(id, tasks[6]);
      const calendar = await buildContentCalendar(opportunities);

      // Task 8: Finalize Results
      await updateProgress(id, tasks[7]);

      // Calculate totals
      const totalKeywords = clusters.reduce((sum, c) => sum + c.keywords.length, 0);
      const totalSearchVolume = clusters.reduce((sum, c) => sum + c.totalVolume, 0);
      const estimatedMonthlyTraffic = calculateEstimatedTraffic(clusters);
      const estimatedMonthlyValue = calculateEstimatedValue(
        estimatedMonthlyTraffic,
        config.economics
      );

      // Save final results
      await (supabase as any)
        .from('content_strategies')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
          clusters_data: clusters,
          opportunities_data: opportunities,
          calendar_data: calendar,
          cannibalization_data: cannibalization,
          total_keywords: totalKeywords,
          total_search_volume: totalSearchVolume,
          estimated_monthly_traffic: estimatedMonthlyTraffic,
          estimated_monthly_value: estimatedMonthlyValue,
          api_cost: 0.5, // Placeholder - should calculate actual cost
        })
        .eq('id', id);

      // Load results
      await loadStrategyResults(id);
    } catch (err: any) {
      await (supabase as any)
        .from('content_strategies')
        .update({ status: 'failed' })
        .eq('id', id);

      setAnalysisStatus('error');
      setError(err.message || 'Analysis failed');
    }
  }

  async function updateProgress(id: string, taskName: string) {
    const { data: currentStrategy } = await (supabase as any)
      .from('content_strategies')
      .select('completed_tasks')
      .eq('id', id)
      .single();

    const completedTasks = [...(currentStrategy?.completed_tasks || []), taskName];

    await (supabase as any)
      .from('content_strategies')
      .update({
        completed_tasks: completedTasks,
        current_task: taskName,
      })
      .eq('id', id);
  }

  // Analysis helper functions
  async function fetchKeywords(domain: string, industry?: string): Promise<string[]> {
    // In production, this would call DataForSEO Keywords API
    // For now, return mock data
    const mockKeywords = [
      'seo services',
      'local seo',
      'seo agency',
      'seo optimization',
      'search engine optimization',
      'best seo company',
      'affordable seo',
      'seo consultant',
      'seo specialist',
      'seo expert',
    ];

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return mockKeywords;
  }

  async function analyzeSearchVolume(keywords: string[]): Promise<KeywordData[]> {
    // In production, call DataForSEO for search volume data
    // Mock implementation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return keywords.map((keyword) => ({
      keyword,
      searchVolume: Math.floor(Math.random() * 10000) + 100,
      cpc: Math.random() * 10 + 0.5,
      competition: Math.random(),
      difficulty: Math.floor(Math.random() * 100),
      trend: Array.from({ length: 12 }, () => Math.random() * 100),
    }));
  }

  async function calculateDifficulty(keywords: KeywordData[]): Promise<KeywordData[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return keywords;
  }

  async function clusterKeywords(
    keywords: KeywordData[],
    industry?: string
  ): Promise<KeywordCluster[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simple clustering by keyword similarity
    const clusters: KeywordCluster[] = [];
    const intents: ClusterIntent[] = ['informational', 'navigational', 'transactional', 'commercial'];

    // Group keywords into 3-4 clusters
    const clusterCount = Math.min(4, Math.ceil(keywords.length / 3));

    for (let i = 0; i < clusterCount; i++) {
      const startIdx = Math.floor((i * keywords.length) / clusterCount);
      const endIdx = Math.floor(((i + 1) * keywords.length) / clusterCount);
      const clusterKeywords = keywords.slice(startIdx, endIdx);

      const totalVolume = clusterKeywords.reduce((sum, k) => sum + k.searchVolume, 0);
      const avgDifficulty =
        clusterKeywords.reduce((sum, k) => sum + k.difficulty, 0) / clusterKeywords.length;

      clusters.push({
        id: `cluster-${i}`,
        name: `${clusterKeywords[0].keyword} cluster`,
        intent: intents[i % intents.length],
        keywords: clusterKeywords,
        totalVolume,
        avgDifficulty,
        opportunityScore: Math.floor((totalVolume / 100) * (100 - avgDifficulty)),
      });
    }

    return clusters;
  }

  async function detectCannibalization(
    domain: string,
    clusters: KeywordCluster[]
  ): Promise<CannibalizationIssue[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock cannibalization detection
    // In production, this would check existing site pages
    return [];
  }

  function scoreOpportunities(
    clusters: KeywordCluster[],
    economics: ContentStrategyConfig['economics']
  ) {
    return clusters
      .map((cluster) => {
        const estimatedTraffic = Math.floor(cluster.totalVolume * 0.3); // Assume 30% CTR
        const conversionRate = economics.conversionRate || 2.5;
        const orderValue = economics.averageOrderValue || economics.leadValue || 100;
        const estimatedValue = estimatedTraffic * (conversionRate / 100) * orderValue;

        const priority: Priority =
          cluster.opportunityScore > 80 ? 'high' : cluster.opportunityScore > 50 ? 'medium' : 'low';

        const contentTypes: ContentType[] = ['blog', 'landing-page', 'guide', 'video', 'infographic', 'case-study'];
        const recommendedType =
          cluster.intent === 'transactional'
            ? 'landing-page'
            : cluster.intent === 'commercial'
            ? 'case-study'
            : 'blog';

        return {
          cluster,
          priority,
          estimatedTraffic,
          estimatedValue,
          competitorGaps: [],
          recommendedType,
        };
      })
      .sort((a, b) => b.estimatedValue - a.estimatedValue);
  }

  function buildContentCalendar(opportunities: any[]): ContentCalendarItem[] {
    const today = new Date();

    return opportunities.map((opp, index) => {
      const publishDate = new Date(today);
      publishDate.setDate(publishDate.getDate() + index * 7); // One week apart

      return {
        id: `calendar-${index}`,
        title: `${opp.cluster.name} - ${opp.recommendedType}`,
        cluster: opp.cluster,
        targetKeywords: opp.cluster.keywords.slice(0, 3).map((k: KeywordData) => k.keyword),
        contentType: opp.recommendedType,
        priority: opp.priority,
        estimatedTraffic: opp.estimatedTraffic,
        estimatedValue: opp.estimatedValue,
        publishDate: publishDate.toISOString().split('T')[0],
        status: 'planned',
      };
    });
  }

  function calculateEstimatedTraffic(clusters: KeywordCluster[]): number {
    return clusters.reduce((sum, cluster) => {
      return sum + Math.floor(cluster.totalVolume * 0.3); // 30% estimated CTR
    }, 0);
  }

  function calculateEstimatedValue(
    traffic: number,
    economics: ContentStrategyConfig['economics']
  ): number {
    const conversionRate = economics.conversionRate || 2.5;
    const orderValue = economics.averageOrderValue || economics.leadValue || 0;

    if (orderValue === 0) return 0;

    return traffic * (conversionRate / 100) * orderValue;
  }

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
                  onClick={() => {
                    setError(null);
                    setAnalysisStatus('idle');
                  }}
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
