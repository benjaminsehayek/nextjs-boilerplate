'use client';

import { useState, useMemo } from 'react';
import type { KeywordTableProps, EnhancedKeyword } from './types';
import { fmtN } from '@/lib/dataforseo';
import { funnelBadgeBg } from '@/lib/contentStrategy/funnel';

type SortField = 'keyword' | 'searchVolume' | 'cpc' | 'funnel' | 'roi' | 'monthlyVisitors' | 'monthlyLeads' | 'pageType' | 'status';
type SortDir = 'asc' | 'desc';

export default function KeywordTable({ keywords }: KeywordTableProps) {
  const [search, setSearch] = useState('');
  const [funnelFilter, setFunnelFilter] = useState<'all' | 'bottom' | 'middle' | 'top'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'location' | 'blog'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'existing' | 'gap'>('all');
  const [sortField, setSortField] = useState<SortField>('roi');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    return keywords.filter(kw => {
      if (search && !kw.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      if (funnelFilter !== 'all' && kw.funnel !== funnelFilter) return false;
      if (typeFilter !== 'all' && kw.pageType !== typeFilter) return false;
      if (statusFilter !== 'all' && kw.status !== statusFilter) return false;
      return true;
    });
  }, [keywords, search, funnelFilter, typeFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'keyword': cmp = a.keyword.localeCompare(b.keyword); break;
        case 'searchVolume': cmp = a.searchVolume - b.searchVolume; break;
        case 'cpc': cmp = a.cpc - b.cpc; break;
        case 'funnel': cmp = a.funnel.localeCompare(b.funnel); break;
        case 'roi': cmp = a.roi - b.roi; break;
        case 'monthlyVisitors': cmp = a.monthlyVisitors - b.monthlyVisitors; break;
        case 'monthlyLeads': cmp = a.monthlyLeads - b.monthlyLeads; break;
        case 'pageType': cmp = a.pageType.localeCompare(b.pageType); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    }).slice(0, 250);
  }, [filtered, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function exportCSV() {
    const rows = [
      ['Keyword', 'Volume', 'CPC', 'Funnel', 'Page Type', 'Status', 'Monthly Visitors', 'Monthly Leads', 'Monthly ROI', 'Service', 'Profit/Job', 'Close Rate'].join(','),
      ...sorted.map(kw => [
        `"${kw.keyword}"`,
        kw.searchVolume,
        kw.cpc.toFixed(2),
        kw.funnel,
        kw.pageType,
        kw.status,
        kw.monthlyVisitors.toFixed(1),
        kw.monthlyLeads.toFixed(2),
        kw.roi,
        `"${kw.serviceName}"`,
        kw.profitPerJob,
        kw.closeRate,
      ].join(','))
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const sortIcon = (field: SortField) => sortField === field ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  const pageTypeIcon = (t: string) => t === 'service' ? '\uD83D\uDD27' : t === 'location' ? '\uD83D\uDCCD' : '\uD83D\uDCDD';
  const statusBadge = (s: string) => s === 'existing' ? 'bg-success/20 text-success' : s === 'gap' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning';

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <input
            type="text"
            className="input max-w-xs"
            placeholder="Search keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={exportCSV} className="btn-ghost text-sm">
            Export CSV
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'bottom', 'middle', 'top'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFunnelFilter(f)}
              className={`px-3 py-1 rounded-btn text-xs font-display transition-colors ${
                funnelFilter === f ? 'bg-flame-500 text-white' : 'bg-char-800 text-ash-400 hover:text-ash-200'
              }`}
            >
              {f === 'all' ? 'All Funnels' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span className="w-px h-6 bg-char-700 self-center" />
          {(['all', 'service', 'location', 'blog'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-btn text-xs font-display transition-colors ${
                typeFilter === t ? 'bg-flame-500 text-white' : 'bg-char-800 text-ash-400 hover:text-ash-200'
              }`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <span className="w-px h-6 bg-char-700 self-center" />
          {(['all', 'existing', 'gap'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-btn text-xs font-display transition-colors ${
                statusFilter === s ? 'bg-flame-500 text-white' : 'bg-char-800 text-ash-400 hover:text-ash-200'
              }`}
            >
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-ash-500">
        Showing {sorted.length} of {filtered.length} keywords
        {filtered.length !== keywords.length && ` (${keywords.length} total)`}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-char-700">
              {([
                ['keyword', 'Keyword'],
                ['searchVolume', 'Volume'],
                ['cpc', 'CPC'],
                ['funnel', 'Funnel'],
                ['pageType', 'Type'],
                ['status', 'Status'],
                ['monthlyVisitors', 'Visitors/mo'],
                ['monthlyLeads', 'Leads/mo'],
                ['roi', 'ROI/mo'],
              ] as [SortField, string][]).map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="p-3 text-left text-xs text-ash-500 cursor-pointer hover:text-ash-300 whitespace-nowrap"
                >
                  {label}{sortIcon(field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-char-800">
            {sorted.map((kw, i) => (
              <tr key={i} className="hover:bg-char-900/50">
                <td className="p-3 font-display text-ash-200 max-w-[200px] truncate">{kw.keyword}</td>
                <td className="p-3 text-ash-300">{fmtN(kw.searchVolume)}</td>
                <td className="p-3 text-ash-300">${kw.cpc.toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-btn text-xs ${funnelBadgeBg(kw.funnel)}`}>
                    {kw.funnel}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-xs">{pageTypeIcon(kw.pageType)} {kw.pageType}</span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-btn text-xs ${statusBadge(kw.status)}`}>
                    {kw.status}
                  </span>
                </td>
                <td className="p-3 text-flame-500 font-display">{kw.monthlyVisitors.toFixed(1)}</td>
                <td className="p-3 text-ember-500 font-display">{kw.monthlyLeads.toFixed(2)}</td>
                <td className="p-3 text-success font-display">${fmtN(kw.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">&#x1F50D;</div>
          <h3 className="font-display text-lg text-ash-300 mb-2">No keywords match your filters</h3>
          <p className="text-ash-500">Try adjusting your filter settings</p>
        </div>
      )}
    </div>
  );
}
