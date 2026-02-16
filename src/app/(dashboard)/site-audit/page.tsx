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
        (payload) => {
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

      // Process results (this would call scoring functions)
      // For now, we'll mark as complete and let the backend handle it
      // In a real implementation, you'd process the results here

      await (supabase as any)
        .from('site_audits')
        .update({
          status: 'complete',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

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
