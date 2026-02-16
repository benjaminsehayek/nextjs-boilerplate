'use client';

import type { ContactFilters, Segment, ContactList, ContactSource, MarketName } from './types';
import { DEFAULT_SEGMENTS, MARKETS, SOURCE_COLORS } from './types';
import { formatSourceName } from './utils';

interface SidebarProps {
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  segments: Segment[];
  lists: ContactList[];
  onSegmentClick: (segment: Segment) => void;
  onListClick: (list: ContactList) => void;
  onCreateList: () => void;
  activeView: 'all' | 'segment' | 'list';
}

export default function Sidebar({
  filters,
  onFiltersChange,
  segments,
  lists,
  onSegmentClick,
  onListClick,
  onCreateList,
  activeView,
}: SidebarProps) {
  const handleSourceToggle = (source: ContactSource) => {
    const currentSources = filters.source || [];
    const newSources = currentSources.includes(source)
      ? currentSources.filter((s) => s !== source)
      : [...currentSources, source];
    onFiltersChange({ ...filters, source: newSources.length > 0 ? newSources : undefined });
  };

  const handleMarketToggle = (market: MarketName) => {
    const currentMarkets = filters.market || [];
    const newMarkets = currentMarkets.includes(market)
      ? currentMarkets.filter((m) => m !== market)
      : [...currentMarkets, market];
    onFiltersChange({ ...filters, market: newMarkets.length > 0 ? newMarkets : undefined });
  };

  return (
    <div className="w-64 border-r border-char-700 bg-char-800 overflow-y-auto">
      {/* Filters Header */}
      <div className="p-4 border-b border-char-700">
        <h3 className="text-sm font-display uppercase text-ash-400">
          Filters
        </h3>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-char-700">
        <input
          type="text"
          placeholder="Search contacts..."
          value={filters.search || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
          className="input text-sm"
        />
      </div>

      {/* Segments */}
      <div className="border-b border-char-700">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-char-700 transition-colors"
          onClick={() => {
            const segmentsEl = document.getElementById('segments-list');
            segmentsEl?.classList.toggle('hidden');
          }}
        >
          <span className="text-sm font-display uppercase text-ash-400">
            Segments
          </span>
          <span className="text-xs text-ash-500">▼</span>
        </button>
        <div id="segments-list">
          {segments.map((segment) => (
            <button
              key={segment.id}
              onClick={() => onSegmentClick(segment)}
              className={`w-full px-4 py-2 flex items-center justify-between hover:bg-char-700 transition-colors text-left ${
                activeView === 'segment' ? 'bg-char-700' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{segment.icon}</span>
                <span className="text-sm text-ash-300">{segment.name}</span>
              </div>
              <span className="text-xs text-ash-500">{segment.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lists */}
      <div className="border-b border-char-700">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-display uppercase text-ash-400">
            Lists
          </span>
          <button
            onClick={onCreateList}
            className="text-flame-500 hover:text-flame-400 text-xl leading-none"
            title="Create new list"
          >
            +
          </button>
        </div>
        <div>
          {lists.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ash-500">
              No lists yet
            </div>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                onClick={() => onListClick(list)}
                className={`w-full px-4 py-2 flex items-center justify-between hover:bg-char-700 transition-colors text-left ${
                  activeView === 'list' ? 'bg-char-700' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: list.color || '#FF5C1A' }}
                  />
                  <span className="text-sm text-ash-300">{list.name}</span>
                </div>
                <span className="text-xs text-ash-500">
                  {list.contactCount}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Source Filter */}
      <div className="border-b border-char-700">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-char-700 transition-colors"
          onClick={() => {
            const sourceEl = document.getElementById('source-filter');
            sourceEl?.classList.toggle('hidden');
          }}
        >
          <span className="text-sm font-display uppercase text-ash-400">
            Source
          </span>
          <span className="text-xs text-ash-500">▼</span>
        </button>
        <div id="source-filter" className="pb-2">
          {Object.entries(SOURCE_COLORS).map(([source, color]) => (
            <label
              key={source}
              className="flex items-center gap-2 px-4 py-2 hover:bg-char-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.source?.includes(source as ContactSource)}
                onChange={() => handleSourceToggle(source as ContactSource)}
                className="rounded"
              />
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-ash-300">
                {formatSourceName(source as ContactSource)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Market Filter */}
      <div className="border-b border-char-700">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-char-700 transition-colors"
          onClick={() => {
            const marketEl = document.getElementById('market-filter');
            marketEl?.classList.toggle('hidden');
          }}
        >
          <span className="text-sm font-display uppercase text-ash-400">
            Market
          </span>
          <span className="text-xs text-ash-500">▼</span>
        </button>
        <div id="market-filter" className="pb-2">
          {MARKETS.map((market) => (
            <label
              key={market.id}
              className="flex items-center gap-2 px-4 py-2 hover:bg-char-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.market?.includes(market.name)}
                onChange={() => handleMarketToggle(market.name)}
                className="rounded"
              />
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: market.color }}
              />
              <span className="text-sm text-ash-300">{market.displayName}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Opt-In Filter */}
      <div className="border-b border-char-700">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-char-700 transition-colors"
          onClick={() => {
            const optinEl = document.getElementById('optin-filter');
            optinEl?.classList.toggle('hidden');
          }}
        >
          <span className="text-sm font-display uppercase text-ash-400">
            Opt-Ins
          </span>
          <span className="text-xs text-ash-500">▼</span>
        </button>
        <div id="optin-filter" className="pb-2">
          <label className="flex items-center gap-2 px-4 py-2 hover:bg-char-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.emailOptIn === true}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  emailOptIn: e.target.checked ? true : undefined,
                })
              }
              className="rounded"
            />
            <span className="text-sm text-ash-300">Email Opted In</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 hover:bg-char-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.smsOptIn === true}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  smsOptIn: e.target.checked ? true : undefined,
                })
              }
              className="rounded"
            />
            <span className="text-sm text-ash-300">SMS Opted In</span>
          </label>
        </div>
      </div>

      {/* ELV Range */}
      <div className="border-b border-char-700">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-char-700 transition-colors"
          onClick={() => {
            const elvEl = document.getElementById('elv-filter');
            elvEl?.classList.toggle('hidden');
          }}
        >
          <span className="text-sm font-display uppercase text-ash-400">
            ELV Range
          </span>
          <span className="text-xs text-ash-500">▼</span>
        </button>
        <div id="elv-filter" className="p-4 space-y-3">
          <div>
            <label className="input-label">Min ELV</label>
            <input
              type="number"
              value={filters.minElv || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  minElv: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="input text-sm"
              placeholder="$0"
            />
          </div>
          <div>
            <label className="input-label">Max ELV</label>
            <input
              type="number"
              value={filters.maxElv || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  maxElv: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="input text-sm"
              placeholder="No limit"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      <div className="p-4">
        <button
          onClick={() =>
            onFiltersChange({
              search: undefined,
              source: undefined,
              market: undefined,
              emailOptIn: undefined,
              smsOptIn: undefined,
              minElv: undefined,
              maxElv: undefined,
            })
          }
          className="btn-ghost w-full text-sm"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
