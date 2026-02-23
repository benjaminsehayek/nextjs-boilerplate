// Site Audit Crawl Engine — Task submission, polling, data fetching
// Uses dfsCall/dfsGet from @/lib/dataforseo (proxied through /api/dataforseo)

import { dfsCall, dfsGet } from '@/lib/dataforseo';
import type {
  CrawlSummary,
  CrawledPage,
  CrawledResource,
  CrawledLink,
  DuplicateTag,
  DuplicateContent,
  NonIndexablePage,
  RedirectChain,
  LighthouseData,
  CrawlData,
  LogEntry,
} from '@/components/tools/SiteAudit/types';

type Logger = (message: string, level?: LogEntry['level']) => void;

// ─── Task Submission ────────────────────────────────────────────────

/**
 * Submit a crawl task to DataForSEO on_page/task_post.
 * Returns the task ID.
 */
export async function submitCrawlTask(
  domain: string,
  maxPages: number,
  log: Logger
): Promise<string> {
  log('Crawling ' + domain + ' — max ' + maxPages + ' pages');

  const data = await dfsCall<any>('on_page/task_post', [
    {
      target: domain,
      max_crawl_pages: maxPages,
      load_resources: true,
      enable_javascript: true,
      enable_www_redirect_check: true,
      enable_sitemap: true,
    },
  ]);

  if (data.status_code !== 20000 || !data.tasks?.[0]) {
    throw new Error(data.status_message || 'Task submission failed');
  }
  if (data.tasks[0].status_code !== 20100) {
    throw new Error(data.tasks[0].status_message || 'Task rejected');
  }

  const taskId = data.tasks[0].id;
  log('Task created: ' + taskId, 'success');
  log('Cost: $' + (data.tasks[0].cost || 0).toFixed(4));
  return taskId;
}

/**
 * Submit a Lighthouse task. Tries https:// then https://www.
 * Returns the task ID or null if both fail.
 */
export async function submitLighthouseTask(
  domain: string,
  log: Logger
): Promise<string | null> {
  log('Submitting Lighthouse task (parallel)...');
  const urls = ['https://' + domain, 'https://www.' + domain];

  for (const url of urls) {
    try {
      const data = await dfsCall<any>('on_page/lighthouse/task_post', [
        {
          url,
          for_mobile: false,
          categories: ['performance', 'accessibility', 'best_practices', 'seo'],
        },
      ]);

      if (data.status_code === 20000 && data.tasks?.[0]?.status_code === 20100) {
        const lhTaskId = data.tasks[0].id;
        log('  Lighthouse task queued: ' + lhTaskId, 'success');
        log('  Lighthouse cost: $' + (data.tasks[0].cost || 0).toFixed(4));
        return lhTaskId;
      }

      log(
        '  Lighthouse rejected for ' + url + ': ' +
        (data.tasks?.[0]?.status_message || data.status_message || 'unknown'),
        'warning'
      );
    } catch (e: any) {
      log('  Lighthouse submit failed for ' + url + ': ' + e.message, 'warning');
    }
  }

  log('  Lighthouse task could not be created — will use heuristic estimates', 'warning');
  return null;
}

// ─── Polling ────────────────────────────────────────────────────────

export interface PollResult {
  finished: boolean;
  pagesCrawled: number;
  pagesInQueue: number;
  maxCrawlPages: number;
  progress: string;
  summary: CrawlSummary | null;
}

/**
 * Poll the crawl task for status. Returns the current state.
 */
export async function pollCrawlStatus(taskId: string): Promise<PollResult> {
  const data = await dfsGet<any>('on_page/summary/' + taskId);

  if (data.status_code !== 20000) {
    throw new Error('Poll error: ' + (data.status_message || 'unknown'));
  }

  const task = data.tasks?.[0];
  const taskStatusCode = task?.status_code;

  // 20100 = Task In Queue — DataForSEO hasn't started crawling yet, result is null
  if (!task || taskStatusCode === 20100) {
    return {
      finished: false,
      pagesCrawled: 0,
      pagesInQueue: 0,
      maxCrawlPages: 0,
      progress: 'in_queue',
      summary: null,
    };
  }

  const result = task.result?.[0];
  if (!result) {
    return {
      finished: false,
      pagesCrawled: 0,
      pagesInQueue: 0,
      maxCrawlPages: 0,
      progress: 'in_queue',
      summary: null,
    };
  }

  const crawled = result.crawl_status?.pages_crawled || 0;
  const queued = result.crawl_status?.pages_in_queue || 0;
  const maxP = result.crawl_status?.max_crawl_pages || 1000;
  const progress = result.crawl_progress || 'unknown';

  return {
    finished: progress === 'finished',
    pagesCrawled: crawled,
    pagesInQueue: queued,
    maxCrawlPages: maxP,
    progress,
    summary: result as CrawlSummary,
  };
}

// ─── Data Fetching ──────────────────────────────────────────────────

interface EndpointConfig {
  key: keyof Pick<CrawlData, 'pages' | 'resources' | 'links' | 'duplicateTags' | 'duplicateContent' | 'nonIndexable' | 'redirectChains'>;
  path: string;
  label: string;
  filters?: unknown[];
  limit: number;
}

const ENDPOINTS: EndpointConfig[] = [
  { key: 'pages', path: 'on_page/pages', label: 'Pages', filters: [['resource_type', '=', 'html']], limit: 1000 },
  { key: 'resources', path: 'on_page/resources', label: 'Resources', limit: 1000 },
  { key: 'links', path: 'on_page/links', label: 'Links', limit: 1000 },
  { key: 'duplicateTags', path: 'on_page/duplicate_tags', label: 'Duplicate Tags', limit: 500 },
  { key: 'duplicateContent', path: 'on_page/duplicate_content', label: 'Duplicate Content', limit: 500 },
  { key: 'nonIndexable', path: 'on_page/non_indexable', label: 'Non-Indexable Pages', limit: 500 },
  { key: 'redirectChains', path: 'on_page/redirect_chains', label: 'Redirect Chains', limit: 500 },
];

/**
 * Fetch all 7 data endpoints + Lighthouse results after crawl completes.
 * Calls onTaskComplete for each endpoint to update progress.
 */
export async function fetchCrawlData(
  taskId: string,
  lhTaskId: string | null,
  log: Logger,
  onTaskComplete?: (taskName: string) => void
): Promise<Omit<CrawlData, 'summary' | 'business' | 'markets' | 'keywords' | 'keywordDebug'>> {
  const result: CrawlData = {};

  // Fetch 7 endpoints sequentially (to avoid rate limiting)
  for (const ep of ENDPOINTS) {
    log('Fetching ' + ep.label + '...');
    try {
      const body: any[] = [{ id: taskId, limit: ep.limit }];
      if (ep.filters) body[0].filters = ep.filters;

      const data = await dfsCall<any>(ep.path, body);
      const items = data.tasks?.[0]?.result?.[0]?.items || [];
      const totalCount = data.tasks?.[0]?.result?.[0]?.total_items_count || items.length;

      (result as any)[ep.key] = { items, totalCount };
      log(
        '  ' + items.length + ' items' +
        (totalCount > items.length ? ' (of ' + totalCount + ' total)' : ''),
        'success'
      );
    } catch (e: any) {
      log('  Failed: ' + e.message, 'error');
      (result as any)[ep.key] = { items: [], totalCount: 0 };
    }
    onTaskComplete?.('Fetching ' + ep.label.toLowerCase());
  }

  // Fetch Lighthouse results
  const lhData = await fetchLighthouseResult(lhTaskId, log);
  result.lighthouse = lhData;
  onTaskComplete?.('Fetching Lighthouse results');

  return result;
}

/**
 * Poll Lighthouse task_get until result is ready. Up to 15 attempts (60s).
 */
async function fetchLighthouseResult(
  lhTaskId: string | null,
  log: Logger
): Promise<LighthouseData | null> {
  if (!lhTaskId) {
    log('  No Lighthouse task ID — skipping', 'warning');
    return null;
  }

  log('Retrieving Lighthouse results...');
  const maxAttempts = 15;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await dfsGet<any>('on_page/lighthouse/task_get/json/' + lhTaskId);

      if (data.status_code !== 20000) {
        log('  Lighthouse poll error: ' + (data.status_message || 'unknown'), 'warning');
        return null;
      }

      const taskStatus = data.tasks?.[0]?.status_code;

      if (taskStatus === 20000) {
        // Task complete
        const result = data.tasks?.[0]?.result?.[0] || null;
        if (result) {
          const lhData = result.categories
            ? result
            : result.lighthouseResult || result.lighthouse_result || null;
          if (lhData?.categories) {
            log(
              '  Lighthouse complete — ' + Object.keys(lhData.categories).join(', '),
              'success'
            );
            return lhData as LighthouseData;
          }
          log('  Lighthouse result has no categories', 'warning');
        }
        return null;
      }

      if (taskStatus === 20100 || taskStatus === 20200) {
        // Still processing
        log('  Lighthouse still processing (attempt ' + attempt + '/' + maxAttempts + ')...');
        await sleep(4000);
        continue;
      }

      // Error status
      log(
        '  Lighthouse task failed: ' +
        (data.tasks?.[0]?.status_message || 'status ' + taskStatus),
        'warning'
      );
      return null;
    } catch (e: any) {
      log('  Lighthouse poll failed: ' + e.message, 'warning');
      if (attempt < maxAttempts) {
        await sleep(4000);
        continue;
      }
      return null;
    }
  }

  log('  Lighthouse timed out after ' + maxAttempts + ' attempts — using heuristic estimates', 'warning');
  return null;
}

// ─── DataForSEO Labs: Domain Rank Overview ───────────────────────────

/**
 * Fetch organic keyword count, ETV, and position distribution for a domain
 * from dataforseo_labs/google/domain_rank_overview/live.
 * Non-blocking — returns null if it fails.
 */
export async function fetchDomainRankOverview(
  domain: string,
  log: Logger
): Promise<import('@/components/tools/SiteAudit/types').DomainRankOverview | null> {
  log('Fetching domain rank overview (organic keyword count + ETV)...');
  try {
    const data = await dfsCall<any>('dataforseo_labs/google/domain_rank_overview/live', [
      {
        target: domain,
        location_name: 'United States',
        language_name: 'English',
      },
    ]);

    const result = data.tasks?.[0]?.result?.[0];
    if (!result) {
      log('  Domain rank overview: no result returned', 'warning');
      return null;
    }

    log(
      `  Domain rank overview: ${result.metrics?.organic?.count ?? 0} keywords, ETV ${result.metrics?.organic?.etv ?? 0}`,
      'success'
    );

    return {
      target: domain,
      organic: result.metrics?.organic,
      paid: result.metrics?.paid,
    };
  } catch (e: any) {
    log('  Domain rank overview failed: ' + e.message, 'warning');
    return null;
  }
}

// ─── Mobile Lighthouse ───────────────────────────────────────────────

/**
 * Submit a Mobile Lighthouse task. Tries https:// then https://www.
 * Returns the task ID or null if both fail.
 */
export async function submitMobileLighthouseTask(
  domain: string,
  log: Logger
): Promise<string | null> {
  log('Submitting Mobile Lighthouse task...');
  const urls = ['https://' + domain, 'https://www.' + domain];

  for (const url of urls) {
    try {
      const data = await dfsCall<any>('on_page/lighthouse/task_post', [
        {
          url,
          for_mobile: true,
          categories: ['performance', 'accessibility', 'best_practices', 'seo'],
        },
      ]);

      if (data.status_code === 20000 && data.tasks?.[0]?.status_code === 20100) {
        const taskId = data.tasks[0].id;
        log('  Mobile Lighthouse task queued: ' + taskId, 'success');
        return taskId;
      }

      log(
        '  Mobile Lighthouse rejected for ' + url + ': ' +
        (data.tasks?.[0]?.status_message || data.status_message || 'unknown'),
        'warning'
      );
    } catch (e: any) {
      log('  Mobile Lighthouse submit failed for ' + url + ': ' + e.message, 'warning');
    }
  }

  log('  Mobile Lighthouse task could not be created', 'warning');
  return null;
}

/**
 * Poll and retrieve Mobile Lighthouse results. Up to 15 attempts (60s).
 */
export async function fetchMobileLighthouseResult(
  lhMobileTaskId: string | null,
  log: Logger
): Promise<import('@/components/tools/SiteAudit/types').LighthouseData | null> {
  if (!lhMobileTaskId) return null;

  log('Retrieving Mobile Lighthouse results...');
  const maxAttempts = 15;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await dfsGet<any>('on_page/lighthouse/task_get/json/' + lhMobileTaskId);

      if (data.status_code !== 20000) return null;

      const taskStatus = data.tasks?.[0]?.status_code;

      if (taskStatus === 20000) {
        const result = data.tasks?.[0]?.result?.[0] || null;
        if (result) {
          const lhData = result.categories
            ? result
            : result.lighthouseResult || result.lighthouse_result || null;
          if (lhData?.categories) {
            log('  Mobile Lighthouse complete', 'success');
            return lhData as import('@/components/tools/SiteAudit/types').LighthouseData;
          }
        }
        return null;
      }

      if (taskStatus === 20100 || taskStatus === 20200) {
        log('  Mobile Lighthouse processing (attempt ' + attempt + '/' + maxAttempts + ')...');
        await sleep(4000);
        continue;
      }

      return null;
    } catch (e: any) {
      if (attempt < maxAttempts) { await sleep(4000); continue; }
      return null;
    }
  }

  log('  Mobile Lighthouse timed out', 'warning');
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
