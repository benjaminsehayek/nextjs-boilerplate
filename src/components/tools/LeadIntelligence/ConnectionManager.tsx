'use client';

import { useState } from 'react';
import type { ConnectionManagerProps, Platform, PlatformConnection } from './types';

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: string; color: string }> = {
  google_ads: { name: 'Google Ads', icon: '🎯', color: 'text-success' },
  lsa: { name: 'Local Service Ads', icon: '🛠️', color: 'text-ember-500' },
  meta: { name: 'Meta Ads', icon: '📘', color: 'text-info' },
  search_console: { name: 'Search Console', icon: '🔍', color: 'text-heat-500' },
  gbp: { name: 'Google Business', icon: '📍', color: 'text-danger' },
};

export default function ConnectionManager({
  connections,
  onConnect,
  onDisconnect,
  onRefresh,
}: ConnectionManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  function handleConnectClick(platform: Platform) {
    setSelectedPlatform(platform);
    setShowModal(true);
  }

  function handleModalConnect() {
    if (selectedPlatform) {
      onConnect(selectedPlatform);
      setShowModal(false);
      setSelectedPlatform(null);
    }
  }

  const connectedCount = connections.filter(c => c.connected).length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display text-ash-200 mb-1">Platform Connections</h2>
          <p className="text-sm text-ash-400">
            {connectedCount} of {connections.length} platforms connected
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((connection) => {
          const config = PLATFORM_CONFIG[connection.platform];
          const isConnected = connection.connected;

          return (
            <div
              key={connection.platform}
              className={`card p-4 ${isConnected ? 'border-success/30' : 'border-char-700'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h3 className="font-display text-sm text-ash-200">{config.name}</h3>
                    {isConnected && connection.accountName && (
                      <p className="text-xs text-ash-500 mt-0.5">{connection.accountName}</p>
                    )}
                  </div>
                </div>
                {isConnected && (
                  <span className="tag tag-success text-xs">Connected</span>
                )}
              </div>

              {isConnected ? (
                <div className="space-y-3">
                  {connection.lastSync && (
                    <p className="text-xs text-ash-500">
                      Last synced: {new Date(connection.lastSync).toLocaleString()}
                    </p>
                  )}

                  {connection.error && (
                    <div className="p-2 bg-danger/10 rounded text-xs text-danger">
                      {connection.error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => onRefresh(connection.platform)}
                      className="btn-ghost text-xs flex-1"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => onDisconnect(connection.platform)}
                      className="btn-ghost text-xs text-danger hover:bg-danger/10"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleConnectClick(connection.platform)}
                  className="btn-primary w-full text-sm"
                >
                  Connect {config.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* OAuth Connection Modal (Placeholder) */}
      {showModal && selectedPlatform && (
        <div className="fixed inset-0 bg-char-900/90 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <span className="text-5xl mb-4 block">
                {PLATFORM_CONFIG[selectedPlatform].icon}
              </span>
              <h3 className="text-xl font-display text-ash-200 mb-2">
                Connect {PLATFORM_CONFIG[selectedPlatform].name}
              </h3>
              <p className="text-sm text-ash-400">
                Authorize ScorchLocal to access your {PLATFORM_CONFIG[selectedPlatform].name} account
              </p>
            </div>

            <div className="bg-char-900 p-4 rounded mb-6">
              <p className="text-xs text-ash-400 mb-3">What we'll access:</p>
              <ul className="space-y-2 text-xs text-ash-300">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Campaign performance data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Ad spend and conversion metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Lead source attribution data</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleModalConnect}
                className="btn-primary w-full"
              >
                Authorize Connection
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedPlatform(null);
                }}
                className="btn-ghost w-full"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-ash-500 text-center mt-4">
              OAuth integration coming soon. This is a placeholder modal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
