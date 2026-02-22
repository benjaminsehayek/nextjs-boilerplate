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
import { detectCitations } from '@/lib/offPageAudit/citations';
import { detectSocialPresence, detectToxicLinks, estimateLocalRatio, calcBrandedRatio, calcAuthorityScore, calcCitationsScore, calcQualityScore, calcLocalLinksScore, calcAnchorsScore, calcDomainOverall, calcReviewsScore, calcNAPScore, calcGBPScore, calcLocationOverall } from '@/lib/offPageAudit/scoring';
import { generateDomainRecommendations, generateLocationRecommendations } from '@/lib/offPageAudit/recommendations';
import { NON_COMPETITOR_DOMAINS, GBP_CHECKLIST } from '@/lib/offPageAudit/constants';
import { normName, normPhone, normAddr, locationDedupKey } from '@/lib/offPageAudit/normalization';
import type {
  EnhancedAuditStatus,
  EnhancedOffPageResults,
  EnhancedTabId,
  EnhancedScanProgress,
  DiscoveredLocation,
  OffPageAuditResults,
} from '@/components/tools/OffPageAudit/types';

import dynamic from 'next/dynamic';

const DomainInput = dynamic(() => import('@/components/tools/OffPageAudit/DomainInput'));
const ProgressTracker = dynamic(() => import('@/components/tools/OffPageAudit/ProgressTracker'));
const Dashboard = dynamic(() => import('@/components/tools/OffPageAudit/Dashboard'));
const GBPDiscovery = dynamic(() => import('@/components/tools/OffPageAudit/GBPDiscovery'));

// ═══ Helpers ═══

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch { return url; }
}

function determineAnchorType(anchor: string, domain: string): 'exact' | 'partial' | 'branded' | 'naked' | 'generic' {
  if (!anchor) return 'generic';
  const lower = anchor.toLowerCase();
  const domainBase = domain.replace(/\.[^.]+$/, '');
  if (lower.includes(domainBase) || lower.includes(domain)) return 'branded';
  if (lower.match(/^https?:\/\//) || lower.match(/^www\./i)) return 'naked';
  if (lower.match(/click here|read more|learn more|^this$|^here$|^website$|^page$|^link$/i)) return 'generic';
  return 'partial';
}

function parseDaysAgo(dateStr: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function processReviews(reviewsRaw: any[]): {
  distribution: { stars: number; count: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  velocity: { last30: number; last90: number; last180: number; avgPerMonth: number };
  responseRate: number;
  recentReviews: any[];
} {
  const distribution = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: reviewsRaw.filter(r => Math.round(r.rating?.value || r.rating || 0) === s).length,
  }));

  let positive = 0, neutral = 0, negative = 0;
  for (const r of reviewsRaw) {
    const rating = r.rating?.value || r.rating || 0;
    if (rating >= 4) positive++;
    else if (rating === 3) neutral++;
    else negative++;
  }
  const total = reviewsRaw.length || 1;

  let last30 = 0, last90 = 0, last180 = 0;
  for (const r of reviewsRaw) {
    const days = parseDaysAgo(r.time || r.timestamp || '');
    if (days <= 30) last30++;
    if (days <= 90) last90++;
    if (days <= 180) last180++;
  }

  const responded = reviewsRaw.filter(r => r.owner_answer || r.response_body).length;

  const oldest = reviewsRaw.reduce((min, r) => {
    const d = parseDaysAgo(r.time || r.timestamp || '');
    return d < min ? d : min;
  }, 999);
  const months = Math.max(1, oldest / 30);

  return {
    distribution,
    sentiment: { positive: positive / total, neutral: neutral / total, negative: negative / total },
    velocity: { last30, last90, last180, avgPerMonth: Math.round(total / months) },
    responseRate: total > 0 ? responded / total : 0,
    recentReviews: reviewsRaw.slice(0, 15).map(r => ({
      author: r.profile_name || r.author_title || 'Anonymous',
      rating: r.rating?.value || r.rating || 0,
      text: r.review_text || r.snippet || '',
      date: r.time || r.timestamp || '',
      ownerResponse: r.owner_answer || r.response_body || undefined,
    })),
  };
}

// ═══ Main Component ═══

export default function OffPageAuditPage() {
  const { user } = useUser();
  const { scansRemaining } = useSubscription();
  const { business } = useBusiness();
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);

  const [auditStatus, setAuditStatus] = useState<EnhancedAuditStatus>('idle');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [domain, setDomain] = useState('');
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [progress, setProgress] = useState<EnhancedScanProgress>({ phase: 'domain', completed: 0, total: 10, tasks: [] });
  const [results, setResults] = useState<EnhancedOffPageResults | null>(null);
  const [activeTab, setActiveTab] = useState<EnhancedTabId>('overview');
  const [error, setError] = useState<string | null>(null);
  const [discoveredLocations, setDiscoveredLocations] = useState<DiscoveredLocation[]>([]);
  const [locationCount, setLocationCount] = useState(0);

  const supabase = createClient();

  // Check for existing audit on mount
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
        .maybeSingle();

      if (existingAudit) {
        setAuditId(existingAudit.id);
        setDomain(existingAudit.target_domain || '');
        setAuditStatus('scanning');
        const taskCount = existingAudit.completed_tasks?.length || 0;
        const locCount = existingAudit.discovered_locations?.filter((l: any) => l.selected)?.length || 0;
        setLocationCount(locCount);
        setProgress({
          phase: taskCount < 10 ? 'domain' : 'locations',
          completed: taskCount,
          total: 10 + (locCount * 4),
          tasks: existingAudit.completed_tasks || [],
        });
      }
    }

    checkExistingAudit();
  }, [business?.id, supabase]);

  // Real-time progress updates
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
        (payload: any) => {
          const d = payload.new as any;
          const tasks = d.completed_tasks || [];
          const locCount = d.discovered_locations?.filter((l: any) => l.selected)?.length || locationCount;
          const totalTasks = 10 + (locCount * 4);

          setProgress({
            phase: tasks.length < 10 ? 'domain' : 'locations',
            completed: tasks.length,
            total: totalTasks,
            tasks,
            currentTask: tasks[tasks.length - 1],
          });

          if (d.status === 'complete') {
            loadAuditResults(auditId);
          } else if (d.status === 'failed') {
            setAuditStatus('error');
            setError('Audit failed. Please try again.');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [auditId, supabase, locationCount]);

  // ═══ Load Results ═══

  async function loadAuditResults(id: string) {
    const { data: audit } = await (supabase as any)
      .from('off_page_audits')
      .select('*')
      .eq('id', id)
      .single();

    if (!audit || audit.status !== 'complete') return;

    const base: OffPageAuditResults = {
      auditId: audit.id,
      domain: audit.target_domain || domain,
      metrics: audit.metrics || {
        totalBacklinks: 0, referringDomains: 0, domainRating: 0,
        toxicScore: 0, followLinks: 0, nofollowLinks: 0,
        newBacklinks: 0, lostBacklinks: 0, qualityScore: 0,
      },
      referringDomains: audit.referring_domains || [],
      anchors: audit.anchor_data || [],
      competitors: audit.competitor_data || [],
      backlinks: audit.backlink_data || [],
      apiCost: audit.api_cost || 0,
      startedAt: audit.started_at,
      completedAt: audit.completed_at || new Date().toISOString(),
    };

    const enhanced: EnhancedOffPageResults = {
      ...base,
      categoryScores: audit.category_scores || undefined,
      citations: audit.citations || undefined,
      linkVelocity: audit.link_velocity || undefined,
      linkGaps: audit.link_gaps || undefined,
      toxicLinks: audit.toxic_links || undefined,
      socialPresence: audit.social_presence || undefined,
      topBacklinks: audit.top_backlinks || undefined,
      locations: audit.location_data || undefined,
      recommendations: audit.recommendations || undefined,
    };

    setResults(enhanced);
    setAuditStatus('complete');
  }

  // ═══ Start Audit (triggers discovery) ═══

  async function startAudit(inputDomain: string, inputCompetitors?: string[]) {
    if (!business?.id) {
      setError('Business profile required. Please complete onboarding.');
      return;
    }
    if (scansRemaining <= 0) {
      setError('No scans remaining this month. Upgrade your plan for more scans.');
      return;
    }

    setError(null);
    const cleaned = cleanDomain(inputDomain);
    setDomain(cleaned);
    setCompetitors(inputCompetitors || []);
    setAuditStatus('discovering');

    try {
      const data = await dfsCall<any>('v3/business_data/business_listings/search/live', [{
        categories: [],
        domain: cleaned,
        limit: 20,
      }]);

      const items = data?.tasks?.[0]?.result?.[0]?.items || [];
      const seen = new Set<string>();
      const locs: DiscoveredLocation[] = [];

      for (const item of items) {
        const name = item.title || item.name || '';
        const address = item.address || '';
        const city = item.city || item.address_info?.city || '';
        const state = item.address_info?.region || '';
        const phone = item.phone || '';
        const key = locationDedupKey(name, address, city, state);
        if (seen.has(key)) continue;
        seen.add(key);

        locs.push({
          id: item.place_id || item.cid || `loc-${locs.length}`,
          name,
          address,
          city,
          state,
          phone,
          domain: item.domain || cleaned,
          placeId: item.place_id,
          cid: item.cid,
          rating: item.rating?.value || item.rating || undefined,
          reviewCount: item.rating?.votes_count || item.reviews_count || undefined,
          categories: item.category ? [item.category] : [],
          source: 'listings' as const,
          selected: true,
        });
      }

      setDiscoveredLocations(locs);
      setAuditStatus(locs.length > 0 ? 'configuring' : 'configuring');
    } catch (err: any) {
      console.error('Discovery error:', err);
      // Discovery failed — still allow domain-only scan
      setDiscoveredLocations([]);
      setAuditStatus('configuring');
    }
  }

  // ═══ Start Full Audit (from configuring) ═══

  async function startFullAudit(selectedLocs: DiscoveredLocation[]) {
    if (!business?.id) return;

    const locCount = selectedLocs.length;
    setLocationCount(locCount);
    setAuditStatus('scanning');
    setProgress({ phase: 'domain', completed: 0, total: 10 + (locCount * 4), tasks: [] });

    try {
      const { data: audit, error: insertError } = await (supabase as any)
        .from('off_page_audits')
        .insert({
          business_id: business.id,
          location_id: selectedLocation?.id || null,
          target_domain: domain,
          competitor_domains: competitors,
          discovered_locations: selectedLocs,
          status: 'pending',
          started_at: new Date().toISOString(),
          completed_tasks: [],
          api_cost: 0,
        })
        .select()
        .single();

      if (insertError || !audit) throw new Error('Failed to create audit record');

      setAuditId(audit.id);
      runAuditChecks(audit.id, domain, competitors, selectedLocs);
    } catch (err: any) {
      setAuditStatus('error');
      setError(err.message || 'Failed to start audit');
    }
  }

  function startDomainOnlyAudit() {
    startFullAudit([]);
  }

  // ═══ The Scan Pipeline ═══

  async function runAuditChecks(
    id: string,
    cleanedDomain: string,
    comps: string[],
    selectedLocs: DiscoveredLocation[],
  ) {
    let apiCost = 0;

    try {
      await (supabase as any).from('off_page_audits').update({ status: 'analyzing' }).eq('id', id);

      // ─── Domain Phase: 10 tasks ───

      // 1. Backlink Summary
      await updateTask(id, 'Backlink Summary');
      const summaryData = await dfsCall<any>('v3/backlinks/summary/live', [
        { target: cleanedDomain, internal_list_limit: 10 },
      ]);
      apiCost += 0.02;
      const summary = summaryData?.tasks?.[0]?.result?.[0] || {};

      // 2. Referring Domains
      await updateTask(id, 'Referring Domains');
      const domainsData = await dfsCall<any>('v3/backlinks/referring_domains/live', [
        { target: cleanedDomain, limit: 500 },
      ]);
      apiCost += 0.02;

      const rawDomains = domainsData?.tasks?.[0]?.result || [];
      const referringDomainNames = rawDomains.map((d: any) => d.domain || '').filter(Boolean);
      const referringDomains = rawDomains.slice(0, 200).map((d: any) => ({
        domain: d.domain || 'unknown',
        backlinks: d.backlinks || 0,
        domainRank: d.domain_from_rank || 0,
        pageRank: d.page_from_rank || 0,
        firstSeen: d.first_seen || new Date().toISOString(),
        lastSeen: d.last_seen || new Date().toISOString(),
        toxicityScore: Math.max(0, Math.min(100, 100 - Math.round((d.domain_from_rank || 0) / 10))),
        toxicityLevel: (d.domain_from_rank || 0) > 700 ? 'clean' as const : (d.domain_from_rank || 0) > 300 ? 'suspicious' as const : 'toxic' as const,
        follow: d.dofollow || 0,
        nofollow: d.nofollow || 0,
      }));

      // 3. Top Backlinks
      await updateTask(id, 'Top Backlinks');
      const backlinksData = await dfsCall<any>('v3/backlinks/backlinks/live', [
        { target: cleanedDomain, limit: 200, order_by: ['rank,desc'] },
      ]);
      apiCost += 0.02;

      const rawBacklinks = backlinksData?.tasks?.[0]?.result || [];
      const topBacklinks = rawBacklinks.slice(0, 20).map((b: any) => ({
        domain: extractDomain(b.url_from || ''),
        url: b.url_from || '',
        anchor: b.anchor || '',
        rank: b.rank || 0,
        dofollow: b.dofollow === true,
      }));

      // 4. Anchor Text
      await updateTask(id, 'Anchor Text');
      const anchorsData = await dfsCall<any>('v3/backlinks/anchors/live', [
        { target: cleanedDomain, limit: 100 },
      ]);
      apiCost += 0.02;

      const rawAnchors = anchorsData?.tasks?.[0]?.result || [];
      const totalBL = rawAnchors.reduce((s: number, a: any) => s + (a.backlinks || 0), 0);
      const anchors = rawAnchors.slice(0, 100).map((a: any) => ({
        text: a.anchor || '',
        count: a.backlinks || 0,
        percentage: totalBL > 0 ? ((a.backlinks || 0) / totalBL) * 100 : 0,
        type: determineAnchorType(a.anchor || '', cleanedDomain),
        follow: a.dofollow || 0,
        nofollow: a.nofollow || 0,
      }));

      // 5. Link Velocity
      await updateTask(id, 'Link Velocity');
      let linkVelocity;
      try {
        const historyData = await dfsCall<any>('v3/backlinks/history/live', [
          { target: cleanedDomain, date_from: sixMonthsAgo() },
        ]);
        apiCost += 0.02;

        const histItems = historyData?.tasks?.[0]?.result || [];
        const monthMap = new Map<string, { newBL: number; lostBL: number; newDom: number; lostDom: number }>();

        for (const h of histItems) {
          const dateKey = (h.date || '').slice(0, 7); // YYYY-MM
          if (!dateKey) continue;
          const entry = monthMap.get(dateKey) || { newBL: 0, lostBL: 0, newDom: 0, lostDom: 0 };
          entry.newBL += h.new_referring_domains_count || h.new_backlinks || 0;
          entry.lostBL += h.lost_referring_domains_count || h.lost_backlinks || 0;
          entry.newDom += h.new_referring_domains_count || 0;
          entry.lostDom += h.lost_referring_domains_count || 0;
          monthMap.set(dateKey, entry);
        }

        const months = [...monthMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            newBacklinks: d.newBL,
            lostBacklinks: d.lostBL,
            newDomains: d.newDom,
            lostDomains: d.lostDom,
          }));

        const netChange = months.reduce((s, m) => s + m.newBacklinks - m.lostBacklinks, 0);
        const trend: 'growing' | 'stable' | 'declining' = netChange > 10 ? 'growing' : netChange < -10 ? 'declining' : 'stable';

        linkVelocity = { months, trend, netChange };
      } catch {
        linkVelocity = { months: [], trend: 'stable' as const, netChange: 0 };
      }

      // 6. Citation Detection (local computation)
      await updateTask(id, 'Citation Detection');
      const citations = detectCitations(referringDomainNames);

      // 7. Social Detection (local computation)
      await updateTask(id, 'Social Detection');
      const socialPresence = detectSocialPresence(referringDomainNames);

      // 8. Competitor Discovery (SERP-based + user-provided)
      await updateTask(id, 'Competitor Discovery');
      let competitorData: any[] = [];
      const serpCompetitors = new Map<string, number>();

      try {
        // SERP keyword search to discover competitors
        const keywords = [
          cleanedDomain.replace(/\.[^.]+$/, ''),
          `${cleanedDomain.replace(/\.[^.]+$/, '')} near me`,
        ];

        for (const kw of keywords) {
          try {
            const serpData = await dfsCall<any>('v3/serp/google/organic/live/advanced', [{
              keyword: kw,
              location_name: 'United States',
              language_name: 'English',
              depth: 20,
            }]);
            apiCost += 0.002;

            const serpItems = serpData?.tasks?.[0]?.result?.[0]?.items || [];
            for (const item of serpItems) {
              const d = extractDomain(item.url || item.domain || '');
              if (!d || d === cleanedDomain || NON_COMPETITOR_DOMAINS.some(nc => d.includes(nc))) continue;
              serpCompetitors.set(d, (serpCompetitors.get(d) || 0) + 1);
            }
          } catch { /* skip failed keyword */ }
        }

        // Top SERP competitors + user-provided
        const topSerpComps = [...serpCompetitors.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([d]) => d);

        const allComps = [...new Set([...comps.map(c => cleanDomain(c)), ...topSerpComps])].slice(0, 8);

        const compResults = await Promise.allSettled(
          allComps.map(async (comp) => {
            const data = await dfsCall<any>('v3/backlinks/summary/live', [
              { target: comp, internal_list_limit: 1 },
            ]);
            apiCost += 0.02;
            const s = data?.tasks?.[0]?.result?.[0] || {};
            return {
              domain: comp,
              backlinks: s.backlinks || 0,
              referringDomains: s.referring_domains || 0,
              domainRating: Math.min(100, Math.round(
                (Math.log10(Math.max(1, s.referring_domains || 0)) * 20) +
                (Math.log10(Math.max(1, s.backlinks || 0)) * 10)
              )),
              toxicScore: s.backlinks > 0 ? Math.round(((s.nofollow || 0) / s.backlinks) * 25) : 0,
            };
          })
        );

        competitorData = compResults
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value);
      } catch (err) {
        console.error('Competitor discovery error:', err);
      }

      // 9. Link Gaps
      await updateTask(id, 'Link Gaps');
      let linkGaps: any[] = [];
      if (competitorData.length > 0) {
        try {
          const topComps = competitorData.slice(0, 3).map(c => c.domain);
          const intersectionData = await dfsCall<any>('v3/backlinks/domain_intersection/live', [{
            targets: { 1: cleanedDomain, ...Object.fromEntries(topComps.map((c, i) => [i + 2, c])) },
            limit: 100,
            exclude_targets: [1], // exclude your own domain — find where competitors are but you're not
          }]);
          apiCost += 0.04;

          const gapItems = intersectionData?.tasks?.[0]?.result || [];
          linkGaps = gapItems.slice(0, 50).map((g: any) => {
            const compCount = Object.keys(g.targets || {}).length - 1;
            return {
              domain: g.domain || '',
              domainRank: g.domain_rank || g.rank || 0,
              competitorCount: compCount,
              tier: compCount >= 3 ? 'high' as const : compCount >= 2 ? 'medium' as const : 'low' as const,
            };
          }).filter((g: any) => g.domain);
        } catch {
          linkGaps = [];
        }
      }

      // 10. Quality Assessment (local computation)
      await updateTask(id, 'Quality Assessment');

      const totalBacklinks = summary.backlinks || 0;
      const refDomainCount = summary.referring_domains || 0;
      const followLinks = summary.dofollow || 0;
      const nofollowLinks = summary.nofollow || 0;
      const domainRank = summary.rank || 0;

      const dofollowRatio = totalBacklinks > 0 ? followLinks / totalBacklinks : 0;
      const toxicLinks = detectToxicLinks(rawDomains.map((d: any) => ({
        domain: d.domain || '', rank: d.domain_from_rank || 0, backlinks: d.backlinks || 0,
      })));
      const spamScore = Math.min(100, toxicLinks.length * 5 + (dofollowRatio < 0.4 ? 10 : 0));
      const localInfo = estimateLocalRatio(referringDomainNames);
      const brandedRatio = calcBrandedRatio(
        anchors.map((a: { text: string; count: number }) => ({ text: a.text, count: a.count })),
        cleanedDomain,
      );

      const citationsFound = citations.filter(c => c.found).length;

      const categoryScores = {
        authority: calcAuthorityScore(domainRank, refDomainCount, totalBacklinks),
        citations: calcCitationsScore(citationsFound, citations.length),
        quality: calcQualityScore(dofollowRatio, spamScore, 0),
        localLinks: calcLocalLinksScore(localInfo.ratio, localInfo.hasChamber, localInfo.hasGov),
        anchors: calcAnchorsScore(anchors.length, brandedRatio),
        overall: 0,
      };
      categoryScores.overall = calcDomainOverall(categoryScores);

      const domainRating = Math.min(100, Math.round(
        (Math.log10(Math.max(1, refDomainCount)) * 20) +
        (Math.log10(Math.max(1, totalBacklinks)) * 10)
      ));

      const metrics = {
        totalBacklinks,
        referringDomains: refDomainCount,
        domainRating,
        toxicScore: spamScore,
        followLinks,
        nofollowLinks,
        newBacklinks: summary.new_backlinks_last_30d || 0,
        lostBacklinks: summary.lost_backlinks_last_30d || 0,
        qualityScore: categoryScores.quality,
      };

      const domainRecs = generateDomainRecommendations({
        categoryScores,
        citationsFound,
        citationsTotal: citations.length,
        toxicLinkCount: toxicLinks.length,
        socialFound: socialPresence.filter(s => s.found).length,
        socialTotal: socialPresence.length,
        spamScore,
        dofollowRatio,
        brandedRatio,
        linkTrend: linkVelocity.trend,
        referringDomains: refDomainCount,
      });

      // ─── Location Phase ───

      const locationData: any[] = [];

      if (selectedLocs.length > 0) {
        // Pre-queue review tasks for all locations
        const reviewTaskIds: Map<string, string> = new Map();
        await Promise.allSettled(
          selectedLocs.map(async (loc) => {
            try {
              const keyword = loc.placeId
                ? undefined
                : `${loc.name} ${loc.city} ${loc.state}`;
              const taskBody: any = { depth: 100, sort_by: 'newest' };
              if (loc.placeId) taskBody.place_id = loc.placeId;
              else if (loc.cid) taskBody.cid = loc.cid;
              else taskBody.keyword = keyword;

              const resp = await dfsCall<any>('v3/business_data/google/reviews/task_post', [taskBody]);
              apiCost += 0.02;
              const taskId = resp?.tasks?.[0]?.id;
              if (taskId) reviewTaskIds.set(loc.id, taskId);
            } catch { /* skip */ }
          })
        );

        for (const loc of selectedLocs) {
          // GBP Profile
          await updateTask(id, 'GBP Profile');
          let gbpInfo: any = null;
          try {
            const gbpBody: any = {};
            if (loc.placeId) gbpBody.place_id = loc.placeId;
            else if (loc.cid) gbpBody.cid = loc.cid;
            else gbpBody.keyword = `${loc.name} ${loc.city} ${loc.state}`;

            const gbpData = await dfsCall<any>('v3/business_data/google/my_business_info/live', [gbpBody]);
            apiCost += 0.004;
            gbpInfo = gbpData?.tasks?.[0]?.result?.[0] || null;
          } catch { /* skip */ }

          // Reviews (poll for results)
          await updateTask(id, 'Reviews');
          let reviewsRaw: any[] = [];
          const reviewTaskId = reviewTaskIds.get(loc.id);
          if (reviewTaskId) {
            for (let attempt = 0; attempt < 15; attempt++) {
              await sleep(3000);
              try {
                const reviewResult = await dfsGet<any>(`v3/business_data/google/reviews/task_get/${reviewTaskId}`);
                const items = reviewResult?.tasks?.[0]?.result?.[0]?.items;
                if (items && items.length > 0) {
                  reviewsRaw = items;
                  break;
                }
                if (reviewResult?.tasks?.[0]?.status_code === 40000) break; // task not ready
              } catch { /* retry */ }
            }
          }

          const reviewInfo = processReviews(reviewsRaw);
          const rating = gbpInfo?.rating?.value || loc.rating || 0;
          const totalReviewCount = gbpInfo?.rating?.votes_count || loc.reviewCount || reviewsRaw.length;

          const reviewsScore = calcReviewsScore(
            rating,
            totalReviewCount,
            reviewInfo.velocity.last30,
            reviewInfo.velocity.last90,
            reviewInfo.sentiment.positive,
            reviewInfo.responseRate,
          );

          // NAP Analysis
          await updateTask(id, 'NAP Analysis');
          const canonical = {
            name: gbpInfo?.title || loc.name,
            address: gbpInfo?.address || loc.address,
            phone: gbpInfo?.phone || loc.phone,
          };

          const businessName = business?.name || '';
          const businessAddress = business?.address || '';
          const businessPhone = business?.phone || '';

          const nameMatch = normName(canonical.name) === normName(businessName);
          const addressMatch = normAddr(canonical.address) === normAddr(businessAddress);
          const phoneMatch = normPhone(canonical.phone) === normPhone(businessPhone);

          const mismatches: { field: string; expected: string; found: string }[] = [];
          if (canonical.name && !nameMatch) mismatches.push({ field: 'Name', expected: canonical.name, found: businessName });
          if (canonical.address && !addressMatch) mismatches.push({ field: 'Address', expected: canonical.address, found: businessAddress });
          if (canonical.phone && !phoneMatch) mismatches.push({ field: 'Phone', expected: canonical.phone, found: businessPhone });

          const napScore = calcNAPScore(
            !!canonical.name, !!canonical.address, !!canonical.phone,
            nameMatch, addressMatch, phoneMatch,
          );

          // GBP Completeness
          const gbpItems = GBP_CHECKLIST.map(item => {
            let status: 'complete' | 'partial' | 'missing' = 'missing';
            let points = 0;

            if (gbpInfo) {
              switch (item.key) {
                case 'claimed': status = 'complete'; points = item.maxPoints; break;
                case 'name': status = gbpInfo.title ? 'complete' : 'missing'; points = gbpInfo.title ? item.maxPoints : 0; break;
                case 'description':
                  if (gbpInfo.description && gbpInfo.description.length >= 50) { status = 'complete'; points = item.maxPoints; }
                  else if (gbpInfo.description) { status = 'partial'; points = item.partialPoints || 0; }
                  break;
                case 'primaryCategory': status = gbpInfo.category ? 'complete' : 'missing'; points = gbpInfo.category ? item.maxPoints : 0; break;
                case 'additionalCategories': status = gbpInfo.additional_categories?.length > 0 ? 'complete' : 'missing'; points = gbpInfo.additional_categories?.length > 0 ? item.maxPoints : 0; break;
                case 'phone': status = gbpInfo.phone ? 'complete' : 'missing'; points = gbpInfo.phone ? item.maxPoints : 0; break;
                case 'website': status = gbpInfo.url || gbpInfo.website ? 'complete' : 'missing'; points = gbpInfo.url || gbpInfo.website ? item.maxPoints : 0; break;
                case 'address': status = gbpInfo.address ? 'complete' : 'missing'; points = gbpInfo.address ? item.maxPoints : 0; break;
                case 'logo': status = gbpInfo.logo ? 'complete' : 'missing'; points = gbpInfo.logo ? item.maxPoints : 0; break;
                case 'coverPhoto': status = gbpInfo.main_image ? 'complete' : 'missing'; points = gbpInfo.main_image ? item.maxPoints : 0; break;
                case 'photos':
                  if ((gbpInfo.photos_count || 0) >= 10) { status = 'complete'; points = item.maxPoints; }
                  else if ((gbpInfo.photos_count || 0) > 0) { status = 'partial'; points = item.partialPoints || 0; }
                  break;
                case 'hours': status = gbpInfo.work_hours ? 'complete' : 'missing'; points = gbpInfo.work_hours ? item.maxPoints : 0; break;
                case 'reviews': status = totalReviewCount > 0 ? 'complete' : 'missing'; points = totalReviewCount > 0 ? item.maxPoints : 0; break;
                case 'bookingUrl': status = gbpInfo.booking_url ? 'complete' : 'missing'; points = gbpInfo.booking_url ? item.maxPoints : 0; break;
              }
            }

            return { label: item.label, points, maxPoints: item.maxPoints, status };
          });

          const gbpScore = calcGBPScore(gbpItems);

          // Brand Mentions
          await updateTask(id, 'Brand Mentions');
          let brandMentions: any[] = [];
          try {
            const mentionData = await dfsCall<any>('v3/serp/google/organic/live/advanced', [{
              keyword: `"${loc.name}" ${loc.city}`,
              location_name: 'United States',
              language_name: 'English',
              depth: 20,
            }]);
            apiCost += 0.002;

            const mentionItems = mentionData?.tasks?.[0]?.result?.[0]?.items || [];
            brandMentions = mentionItems
              .filter((item: any) => !extractDomain(item.url || '').includes(cleanedDomain))
              .slice(0, 10)
              .map((item: any) => ({
                url: item.url || '',
                title: item.title || '',
                snippet: item.description || '',
              }));
          } catch { /* skip */ }

          const locationOverall = calcLocationOverall(reviewsScore, napScore, gbpScore);

          const locRecs = generateLocationRecommendations({
            reviewsScore,
            napScore,
            gbpScore,
            rating,
            reviewCount: totalReviewCount,
            velocity30d: reviewInfo.velocity.last30,
            responseRate: reviewInfo.responseRate,
            napMismatches: mismatches.length,
            gbpMissingItems: gbpItems.filter(i => i.status === 'missing').map(i => i.label),
            brandMentionCount: brandMentions.length,
          });

          locationData.push({
            locationId: loc.id,
            name: loc.name,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            phone: loc.phone,
            placeId: loc.placeId,
            cid: loc.cid,
            overallScore: locationOverall,
            reviewsScore,
            napScore,
            gbpScore,
            reviews: {
              rating,
              totalCount: totalReviewCount,
              ...reviewInfo,
            },
            nap: { score: napScore, canonical, mismatches },
            gbp: { score: gbpScore, items: gbpItems },
            brandMentions,
            recommendations: locRecs,
          });
        }
      }

      // Combine all recommendations
      const allRecs = [
        ...domainRecs,
        ...locationData.flatMap((l: any) => l.recommendations || []),
      ];

      // ─── Save Results ───

      await (supabase as any)
        .from('off_page_audits')
        .update({
          status: 'complete',
          metrics,
          referring_domains: referringDomains,
          anchor_data: anchors,
          competitor_data: competitorData,
          backlink_data: [],
          category_scores: categoryScores,
          citations,
          link_velocity: linkVelocity,
          link_gaps: linkGaps,
          toxic_links: toxicLinks,
          social_presence: socialPresence,
          top_backlinks: topBacklinks,
          location_data: locationData.length > 0 ? locationData : null,
          recommendations: allRecs,
          api_cost: apiCost,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Deduct scan credit
      if (user?.id) {
        await (supabase as any).rpc('decrement_scan_credits', { p_user_id: user.id, p_amount: 1 });
      }

      await loadAuditResults(id);
    } catch (err: any) {
      console.error('Audit error:', err);
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

  // ═══ Render ═══

  return (
    <ToolGate tool="off-page-audit">
      <ToolPageShell
        icon="🔗"
        name="Off-Page Audit"
        description="Backlinks, citations, GBP analysis, reviews, and competitor comparison"
      >
        {error && (
          <div className="card p-4 mb-6 bg-danger/10 border-danger">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-display text-danger mb-1">Error</h3>
                <p className="text-ash-300">{error}</p>
                <button
                  onClick={() => { setError(null); setAuditStatus('idle'); }}
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
              defaultDomain={business?.domain || ''}
            />
          </>
        )}

        {auditStatus === 'discovering' && (
          <div className="max-w-3xl mx-auto">
            <div className="card p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-flame-gradient flex items-center justify-center animate-pulse">
                <span className="text-4xl">🔍</span>
              </div>
              <h2 className="text-2xl font-display mb-2">
                Discovering <span className="text-gradient-flame">Locations</span>
              </h2>
              <p className="text-ash-400">Searching for business listings associated with {domain}...</p>
            </div>
          </div>
        )}

        {auditStatus === 'configuring' && (
          <GBPDiscovery
            locations={discoveredLocations}
            onLocationsChange={setDiscoveredLocations}
            onContinue={startFullAudit}
            onDomainOnly={startDomainOnlyAudit}
            domain={domain}
          />
        )}

        {auditStatus === 'scanning' && (
          <ProgressTracker progress={progress} domain={domain} locationCount={locationCount} />
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
