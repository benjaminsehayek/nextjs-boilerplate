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
import type { AuditStatus, OffPageAuditResults, TabId, ScanProgress } from '@/components/tools/OffPageAudit/types';

// Lazy load components
import dynamic from 'next/dynamic';

const DomainInput = dynamic(() => import('@/components/tools/OffPageAudit/DomainInput'));
const ProgressTracker = dynamic(() => import('@/components/tools/OffPageAudit/ProgressTracker'));
const Dashboard = dynamic(() => import('@/components/tools/OffPageAudit/Dashboard'));

export default function OffPageAuditPage() {
  const { user } = useUser();
  const { scansRemaining } = useSubscription();
  const { business } = useBusiness(user?.id);
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);

  const [auditStatus, setAuditStatus] = useState<AuditStatus>('idle');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [domain, setDomain] = useState<string>('');
  const [progress, setProgress] = useState<ScanProgress>({ completed: 0, total: 5, tasks: [] });
  const [results, setResults] = useState<OffPageAuditResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Check for existing incomplete audit on mount
  useEffect(() => {
    async function checkExistingAudit() {
      if (!business?.id) return;

      const { data: existingAudit } = await (supabase as any)
        .from('off_page_audits')
        .select('*')
        .eq('business_id', business.id)
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingAudit) {
        setAuditId(existingAudit.id);
        setDomain(existingAudit.target_domain || '');
        setAuditStatus('scanning');
        setProgress({
          completed: existingAudit.completed_tasks?.length || 0,
          total: 5,
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
      .channel(`off-page-audit:${auditId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'off_page_audits',
          filter: `id=eq.${auditId}`,
        },
        (payload) => {
          const newData = payload.new as any;

          setProgress({
            completed: newData.completed_tasks?.length || 0,
            total: 5,
            tasks: newData.completed_tasks || [],
          });

          if (newData.status === 'complete') {
            loadAuditResults(auditId);
          } else if (newData.status === 'failed') {
            setAuditStatus('error');
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
      .from('off_page_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (audit && audit.status === 'complete') {
      const results: OffPageAuditResults = {
        auditId: audit.id,
        domain: audit.target_domain || domain,
        metrics: audit.metrics || {
          totalBacklinks: 0,
          referringDomains: 0,
          domainRating: 0,
          toxicScore: 0,
          followLinks: 0,
          nofollowLinks: 0,
          newBacklinks: 0,
          lostBacklinks: 0,
          qualityScore: 0,
        },
        referringDomains: audit.referring_domains || [],
        anchors: audit.anchor_data || [],
        competitors: audit.competitor_data || [],
        backlinks: audit.backlink_data || [],
        apiCost: audit.api_cost || 0,
        startedAt: audit.started_at,
        completedAt: audit.completed_at || new Date().toISOString(),
      };

      setResults(results);
      setAuditStatus('complete');
    }
  }

  async function startAudit(inputDomain: string, competitors?: string[]) {
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
        .from('off_page_audits')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          target_domain: cleanedDomain,
          competitor_domains: competitors || [],
          status: 'pending',
          started_at: new Date().toISOString(),
          completed_tasks: [],
          api_cost: 0,
        })
        .select()
        .single();

      if (insertError || !audit) {
        throw new Error('Failed to create audit record');
      }

      setAuditId(audit.id);
      setAuditStatus('scanning');

      // Start audit checks in background
      runAuditChecks(audit.id, cleanedDomain, competitors);
    } catch (err: any) {
      setAuditStatus('error');
      setError(err.message || 'Failed to start audit');
    }
  }

  async function runAuditChecks(id: string, cleanedDomain: string, competitors?: string[]) {
    try {
      await (supabase as any)
        .from('off_page_audits')
        .update({ status: 'analyzing' })
        .eq('id', id);

      // Task 1: Get backlink summary
      await updateTask(id, 'Backlink Summary');
      const summaryData = await dfsCall('v3/backlinks/summary/live', [
        { target: cleanedDomain, internal_list_limit: 10 },
      ]);

      // Task 2: Get referring domains
      await updateTask(id, 'Referring Domains');
      const domainsData = await dfsCall('v3/backlinks/referring_domains/live', [
        { target: cleanedDomain, limit: 100 },
      ]);

      // Task 3: Get anchor text data
      await updateTask(id, 'Anchor Text Analysis');
      const anchorsData = await dfsCall('v3/backlinks/anchors/live', [
        { target: cleanedDomain, limit: 100 },
      ]);

      // Task 4: Calculate quality metrics
      await updateTask(id, 'Quality Assessment');
      const metrics = calculateMetrics(summaryData, domainsData, anchorsData);
      const referringDomains = processReferringDomains(domainsData);
      const anchorData = processAnchorData(anchorsData);

      // Task 5: Competitor analysis (if provided)
      let competitorData: any[] = [];
      if (competitors && competitors.length > 0) {
        await updateTask(id, 'Competitor Analysis');
        competitorData = await analyzeCompetitors(competitors);
      }

      // Save final results
      await (supabase as any)
        .from('off_page_audits')
        .update({
          status: 'complete',
          metrics,
          referring_domains: referringDomains,
          anchor_data: anchorData,
          competitor_data: competitorData,
          backlink_data: [], // Store full backlink list if needed
          api_cost: 0.15, // Estimate based on API calls
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      await loadAuditResults(id);
    } catch (err: any) {
      await (supabase as any)
        .from('off_page_audits')
        .update({ status: 'failed' })
        .eq('id', id);

      setAuditStatus('error');
      setError(err.message || 'Audit failed');
    }
  }

  async function updateTask(id: string, taskName: string) {
    const { data: currentAudit } = await (supabase as any)
      .from('off_page_audits')
      .select('completed_tasks')
      .eq('id', id)
      .single();

    const completedTasks = [...(currentAudit?.completed_tasks || []), taskName];

    await (supabase as any)
      .from('off_page_audits')
      .update({ completed_tasks: completedTasks })
      .eq('id', id);
  }

  function calculateMetrics(summaryData: any, domainsData: any, anchorsData: any) {
    const summary = summaryData?.tasks?.[0]?.result?.[0] || {};
    const totalBacklinks = summary.backlinks || 0;
    const referringDomains = summary.referring_domains || 0;
    const followLinks = summary.dofollow || 0;
    const nofollowLinks = summary.nofollow || 0;

    // Calculate domain rating (0-100 scale based on backlinks and domains)
    const domainRating = Math.min(100, Math.round(
      (Math.log10(Math.max(1, referringDomains)) * 20) +
      (Math.log10(Math.max(1, totalBacklinks)) * 10)
    ));

    // Calculate quality score based on various factors
    const followRatio = totalBacklinks > 0 ? followLinks / totalBacklinks : 0;
    const diversityScore = referringDomains > 0 ? Math.min(100, (referringDomains / totalBacklinks) * 100) : 0;
    const qualityScore = Math.round((followRatio * 40) + (diversityScore * 0.3) + (domainRating * 0.3));

    // Calculate toxicity score (would need actual spam data from API)
    const toxicScore = Math.round(Math.random() * 30); // Placeholder

    return {
      totalBacklinks,
      referringDomains,
      domainRating,
      toxicScore,
      followLinks,
      nofollowLinks,
      newBacklinks: summary.new_backlinks_last_30d || 0,
      lostBacklinks: summary.lost_backlinks_last_30d || 0,
      qualityScore,
    };
  }

  function processReferringDomains(domainsData: any) {
    const domains = domainsData?.tasks?.[0]?.result || [];
    return domains.slice(0, 100).map((d: any) => ({
      domain: d.domain || 'unknown',
      backlinks: d.backlinks || 0,
      domainRank: d.domain_from_rank || 0,
      pageRank: d.page_from_rank || 0,
      firstSeen: d.first_seen || new Date().toISOString(),
      lastSeen: d.last_seen || new Date().toISOString(),
      toxicityScore: Math.round(Math.random() * 100), // Placeholder
      toxicityLevel: Math.random() > 0.7 ? 'clean' : Math.random() > 0.3 ? 'suspicious' : 'toxic',
      follow: d.dofollow || 0,
      nofollow: d.nofollow || 0,
    }));
  }

  function processAnchorData(anchorsData: any) {
    const anchors = anchorsData?.tasks?.[0]?.result || [];
    const totalBacklinks = anchors.reduce((sum: number, a: any) => sum + (a.backlinks || 0), 0);

    return anchors.slice(0, 100).map((a: any) => ({
      text: a.anchor || '',
      count: a.backlinks || 0,
      percentage: totalBacklinks > 0 ? ((a.backlinks || 0) / totalBacklinks) * 100 : 0,
      type: determineAnchorType(a.anchor || ''),
      follow: a.dofollow || 0,
      nofollow: a.nofollow || 0,
    }));
  }

  function determineAnchorType(anchor: string): 'exact' | 'partial' | 'branded' | 'naked' | 'generic' {
    if (!anchor) return 'generic';
    if (anchor.match(/^https?:\/\//)) return 'naked';
    if (anchor.match(/click here|read more|learn more|this|here/i)) return 'generic';
    // Simplified logic - in production, compare against target keywords
    return Math.random() > 0.5 ? 'branded' : 'partial';
  }

  async function analyzeCompetitors(competitors: string[]) {
    const results = await Promise.allSettled(
      competitors.map(async (comp) => {
        const cleaned = cleanDomain(comp);
        const data = await dfsCall('v3/backlinks/summary/live', [
          { target: cleaned, internal_list_limit: 1 },
        ]) as any;

        const summary = data?.tasks?.[0]?.result?.[0] || {};
        return {
          domain: cleaned,
          backlinks: summary.backlinks || 0,
          referringDomains: summary.referring_domains || 0,
          domainRating: Math.min(100, Math.round(
            (Math.log10(Math.max(1, summary.referring_domains || 0)) * 20) +
            (Math.log10(Math.max(1, summary.backlinks || 0)) * 10)
          )),
          toxicScore: Math.round(Math.random() * 30),
        };
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  return (
    <ToolGate tool="off-page-audit">
      <ToolPageShell
        icon="🔗"
        name="Off-Page Audit"
        description="Backlink analysis, referring domains, anchor text, and competitor comparison"
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
                    setAuditStatus('idle');
                  }}
                  className="btn-ghost mt-3"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {auditStatus === 'idle' && (
          <>
            <LocationSelector
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={selectLocation}
              showAllOption={true}
            />
            <DomainInput
              onStartScan={startAudit}
              isLoading={false}
              scansRemaining={scansRemaining}
            />
          </>
        )}

        {auditStatus === 'scanning' && (
          <ProgressTracker progress={progress} domain={domain} />
        )}

        {auditStatus === 'complete' && results && (
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
