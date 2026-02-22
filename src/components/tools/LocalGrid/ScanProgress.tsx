'use client';

import { useEffect, useRef } from 'react';
import type { GridScanResult, ScanLogEntry } from './types';

interface ScanProgressProps {
  scan: GridScanResult;
  logEntries?: ScanLogEntry[];
}

export function ScanProgress({ scan, logEntries = [] }: ScanProgressProps) {
  const { progress, config, business_info } = scan;
  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const totalChecks = config.size * config.size * config.keywords.length;
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries.length]);

  const logTypeColor = (type: ScanLogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-ash-400';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-heat-500/20 flex items-center justify-center">
            <div className="animate-spin text-2xl">🔄</div>
          </div>
          <div>
            <h2 className="text-xl font-display">Scanning Grid...</h2>
            <p className="text-sm text-ash-300">{business_info.name}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-char-900 rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-flame-500 to-heat-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-ash-300">
            Keyword {progress.current + 1} of {progress.total}
          </span>
          <span className="font-display text-heat-400">{progressPercent.toFixed(0)}%</span>
        </div>

        {/* Current Task */}
        {progress.currentKeyword && (
          <div className="mt-4 p-3 bg-char-900/50 rounded-lg">
            <div className="text-xs text-ash-400 mb-1">Currently scanning</div>
            <div className="text-sm font-medium">
              &quot;{progress.currentKeyword}&quot; — Point {progress.currentPoint || 0} of {config.size * config.size}
            </div>
          </div>
        )}
      </div>

      {/* Activity Log */}
      {logEntries.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-display mb-3">Activity Log</h3>
          <div className="max-h-48 overflow-y-auto bg-char-900/50 rounded-lg p-3 space-y-1">
            {logEntries.map((entry, i) => (
              <div key={i} className={`text-xs ${logTypeColor(entry.type)}`}>
                <span className="text-ash-500 mr-2">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                {entry.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Scan Details */}
      <div className="card p-6">
        <h3 className="text-lg font-display mb-4">Scan Configuration</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-char-900/30 rounded-lg">
            <div className="text-2xl font-display text-ash-100">{config.size}×{config.size}</div>
            <div className="text-xs text-ash-400 mt-1">Grid Size</div>
          </div>

          <div className="text-center p-4 bg-char-900/30 rounded-lg">
            <div className="text-2xl font-display text-ash-100">{config.radius} mi</div>
            <div className="text-xs text-ash-400 mt-1">Radius</div>
          </div>

          <div className="text-center p-4 bg-char-900/30 rounded-lg">
            <div className="text-2xl font-display text-ash-100">{config.keywords.length}</div>
            <div className="text-xs text-ash-400 mt-1">Keywords</div>
          </div>

          <div className="text-center p-4 bg-char-900/30 rounded-lg">
            <div className="text-2xl font-display text-ash-100">{totalChecks}</div>
            <div className="text-xs text-ash-400 mt-1">Total Checks</div>
          </div>
        </div>

        {/* Keywords List */}
        <div className="mt-4">
          <div className="text-sm text-ash-400 mb-2">Keywords being tracked:</div>
          <div className="flex flex-wrap gap-2">
            {config.keywords.map((keyword) => (
              <span key={keyword.id} className="tag-info">
                {keyword.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="card p-6 bg-heat-500/10 border border-heat-500/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⏱️</div>
          <div>
            <h4 className="font-display mb-1">Please Wait</h4>
            <p className="text-sm text-ash-300">
              This scan will take approximately {Math.ceil(totalChecks / 10)}-{Math.ceil(totalChecks / 5)} minutes
              to complete. The page will automatically update when finished.
            </p>
            <p className="text-xs text-ash-400 mt-2">
              You can safely leave this page and return later — your scan will continue in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
