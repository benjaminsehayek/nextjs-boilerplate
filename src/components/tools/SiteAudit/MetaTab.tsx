'use client';

import { useMemo } from 'react';
import type { TabProps, CrawledPage } from './types';
import { StatGrid } from './shared/StatGrid';
import { DataTable } from './shared/DataTable';
import { shortUrl } from '@/lib/siteAudit/utils';

function lengthBadge(length: number, low: number, high: number, missing: boolean) {
  if (missing) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/20 text-danger">Missing</span>;
  if (length < low) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning">{length}</span>;
  if (length > high) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/20 text-danger">{length}</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success">{length}</span>;
}

export default function MetaTab({ results }: TabProps) {
  const pages = results.crawlData.pages?.items || [];
  const duplicateTags = results.crawlData.duplicateTags?.items || [];

  const stats = useMemo(() => {
    let missingTitles = 0;
    let missingDescs = 0;
    let shortTitles = 0;
    let longTitles = 0;
    let shortDescs = 0;
    let longDescs = 0;

    pages.forEach((p) => {
      const title = p.meta?.title;
      const desc = p.meta?.description;

      if (!title) missingTitles++;
      else if (title.length < 30) shortTitles++;
      else if (title.length > 60) longTitles++;

      if (!desc) missingDescs++;
      else if (desc.length < 70) shortDescs++;
      else if (desc.length > 160) longDescs++;
    });

    const dupTitles = duplicateTags.filter((d) => d.type === 'title').length;
    const dupDescs = duplicateTags.filter((d) => d.type === 'description').length;

    return { missingTitles, missingDescs, dupTitles, dupDescs, shortTitles, longTitles, shortDescs, longDescs };
  }, [pages, duplicateTags]);

  const columns = useMemo(
    () => [
      {
        key: 'url',
        label: 'URL',
        sortable: true,
        className: 'max-w-[200px]',
        render: (p: CrawledPage) => (
          <span className="font-mono text-xs text-ash-300 truncate block" title={p.url}>
            {shortUrl(p.url)}
          </span>
        ),
      },
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        className: 'max-w-[250px]',
        render: (p: CrawledPage) => {
          const title = p.meta?.title;
          return (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ash-300 truncate block max-w-[200px]" title={title || ''}>
                {title || <em className="text-danger">Missing</em>}
              </span>
              {lengthBadge(title?.length || 0, 30, 60, !title)}
            </div>
          );
        },
      },
      {
        key: 'description',
        label: 'Description',
        sortable: true,
        className: 'max-w-[300px]',
        render: (p: CrawledPage) => {
          const desc = p.meta?.description;
          const truncated = desc && desc.length > 80 ? desc.slice(0, 80) + '...' : desc;
          return (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ash-300 truncate block max-w-[240px]" title={desc || ''}>
                {truncated || <em className="text-danger">Missing</em>}
              </span>
              {lengthBadge(desc?.length || 0, 70, 160, !desc)}
            </div>
          );
        },
      },
      {
        key: 'canonical',
        label: 'Has Canonical',
        sortable: true,
        render: (p: CrawledPage) => (
          <span className={p.meta?.canonical ? 'text-success' : 'text-danger'}>
            {p.meta?.canonical ? '\u2713' : '\u2717'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg mb-4">Meta Tag Analysis</h3>
        <StatGrid
          stats={[
            { value: stats.missingTitles, label: 'Missing Titles', isWarning: stats.missingTitles > 0 },
            { value: stats.missingDescs, label: 'Missing Descriptions', isWarning: stats.missingDescs > 0 },
            { value: stats.dupTitles, label: 'Duplicate Titles', isWarning: stats.dupTitles > 0 },
            { value: stats.dupDescs, label: 'Duplicate Descriptions', isWarning: stats.dupDescs > 0 },
            { value: stats.shortTitles, label: 'Short Titles (<30)', isWarning: stats.shortTitles > 0 },
            { value: stats.longTitles, label: 'Long Titles (>60)', isWarning: stats.longTitles > 0 },
            { value: stats.shortDescs, label: 'Short Desc. (<70)', isWarning: stats.shortDescs > 0 },
            { value: stats.longDescs, label: 'Long Desc. (>160)', isWarning: stats.longDescs > 0 },
          ]}
        />
      </div>

      <div>
        <h3 className="font-display text-lg mb-4">All Pages</h3>
        <div className="card p-4">
          <DataTable
            data={pages}
            columns={columns}
            searchable
            searchKeys={['url']}
            emptyMessage="No pages found"
          />
        </div>
      </div>
    </div>
  );
}
