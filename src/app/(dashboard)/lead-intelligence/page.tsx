'use client';

import { useState, useEffect } from 'react';
import { ToolGate } from '@/components/ui/ToolGate';
import { ToolPageShell } from '@/components/ui/ToolPageShell';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { useUser } from '@/lib/hooks/useUser';
import { useBusiness } from '@/lib/hooks/useBusiness';
import { useLocations } from '@/lib/hooks/useLocations';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

import type {
  PlatformConnection,
  Platform,
  DashboardData,
  TimeRange,
  Lead,
  LeadMetric,
  LeadSource,
  TrendData,
} from '@/components/tools/LeadIntelligence/types';

// Lazy load components
const ConnectionManager = dynamic(() => import('@/components/tools/LeadIntelligence/ConnectionManager'));
const Dashboard = dynamic(() => import('@/components/tools/LeadIntelligence/Dashboard'));
const LeadAttribution = dynamic(() => import('@/components/tools/LeadIntelligence/LeadAttribution'));

export default function LeadIntelligencePage() {
  const { user } = useUser();
  const { business } = useBusiness(user?.id);
  const { locations, selectedLocation, selectLocation } = useLocations(business?.id);
  const supabase = createClient();

  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const [connections, setConnections] = useState<PlatformConnection[]>([
    { platform: 'google_ads', connected: false },
    { platform: 'lsa', connected: false },
    { platform: 'meta', connected: false },
    { platform: 'search_console', connected: false },
    { platform: 'gbp', connected: false },
  ]);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnections, setShowConnections] = useState(false);
  const [showLeads, setShowLeads] = useState(false);

  // Load connections and data on mount
  useEffect(() => {
    if (business?.id) {
      loadConnections();
      loadDashboardData();
      loadLeads();
    } else {
      // If no business, set loading to false so UI doesn't hang
      setLoading(false);
    }
  }, [business?.id, timeRange]);

  async function loadConnections() {
    if (!business?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('platform_connections')
        .select('*')
        .eq('business_id', business.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setConnections((prev) =>
          prev.map((conn) => {
            const found = data.find((d: any) => d.platform === conn.platform);
            if (found) {
              return {
                platform: conn.platform,
                connected: found.connected,
                connectedAt: found.connected_at,
                accountName: found.account_name,
                accountId: found.account_id,
                lastSync: found.last_sync,
                error: found.error,
              };
            }
            return conn;
          })
        );
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  }

  async function loadDashboardData() {
    if (!business?.id) return;

    try {
      setLoading(true);

      // In production, this would fetch from Supabase
      // For now, we'll generate mock data
      const mockData = generateMockDashboardData(timeRange);
      setDashboardData(mockData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeads() {
    if (!business?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        setLeads(
          data.map((lead: any) => ({
            id: lead.id,
            source: lead.source,
            createdAt: lead.created_at,
            status: lead.status,
            value: lead.value,
            revenue: lead.revenue,
            attributionConfidence: lead.attribution_confidence || 'medium',
            metadata: lead.metadata,
          }))
        );
      } else {
        // Generate mock leads if none exist
        setLeads(generateMockLeads());
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      setLeads(generateMockLeads());
    }
  }

  async function handleConnect(platform: Platform) {
    if (!business?.id) return;

    try {
      // In production, this would initiate OAuth flow
      // For now, we'll just update the connection status
      const { error } = await (supabase as any)
        .from('platform_connections')
        .upsert({
          business_id: business.id,
          platform,
          connected: true,
          connected_at: new Date().toISOString(),
          account_name: `${platform} Account`,
          last_sync: new Date().toISOString(),
        });

      if (error) throw error;

      await loadConnections();
      await loadDashboardData();
    } catch (error) {
      console.error('Error connecting platform:', error);
    }
  }

  async function handleDisconnect(platform: Platform) {
    if (!business?.id) return;

    try {
      const { error } = await (supabase as any)
        .from('platform_connections')
        .update({ connected: false })
        .eq('business_id', business.id)
        .eq('platform', platform);

      if (error) throw error;

      await loadConnections();
      await loadDashboardData();
    } catch (error) {
      console.error('Error disconnecting platform:', error);
    }
  }

  async function handleRefresh(platform: Platform) {
    if (!business?.id) return;

    try {
      const { error } = await (supabase as any)
        .from('platform_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('business_id', business.id)
        .eq('platform', platform);

      if (error) throw error;

      await loadConnections();
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing platform:', error);
    }
  }

  const hasConnections = connections.some(c => c.connected);

  return (
    <ToolGate tool="lead-intelligence">
      <ToolPageShell
        icon="📡"
        name="Lead Intelligence"
        description="Multi-channel marketing dashboard with unified analytics"
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="spinner" />
          </div>
        ) : (
          <div className="space-y-6">
            <LocationSelector
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={selectLocation}
              showAllOption={true}
            />

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConnections(!showConnections)}
                className="btn-secondary"
              >
                {showConnections ? 'Hide' : 'Manage'} Connections
              </button>
              <button
                onClick={() => setShowLeads(!showLeads)}
                className="btn-ghost"
              >
                {showLeads ? 'Hide' : 'View'} Lead Attribution
              </button>
            </div>

            {/* Connection Manager */}
            {showConnections && (
              <ConnectionManager
                connections={connections}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRefresh={handleRefresh}
              />
            )}

            {/* Lead Attribution */}
            {showLeads && <LeadAttribution leads={leads} />}

            {/* Main Dashboard */}
            {!hasConnections && !showConnections ? (
              <div className="card p-12 text-center">
                <div className="text-6xl mb-4">📡</div>
                <h3 className="text-xl font-display mb-2 text-ash-300">
                  Connect Your Marketing Platforms
                </h3>
                <p className="text-ash-400 mb-6 max-w-lg mx-auto">
                  Connect Google Ads, Meta, Local Service Ads, and other platforms to track leads,
                  analyze ROI, and optimize your marketing spend.
                </p>
                <button
                  onClick={() => setShowConnections(true)}
                  className="btn-primary"
                >
                  Get Started
                </button>
              </div>
            ) : dashboardData ? (
              <Dashboard
                data={dashboardData}
                connections={connections}
                onTimeRangeChange={setTimeRange}
              />
            ) : (
              <div className="card p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-display mb-2 text-ash-300">
                  Loading Analytics...
                </h3>
              </div>
            )}
          </div>
        )}
      </ToolPageShell>
    </ToolGate>
  );
}

// Helper functions to generate mock data
function generateMockDashboardData(timeRange: TimeRange): DashboardData {
  const days = parseInt(timeRange);

  const channelMetrics: LeadMetric[] = [
    {
      source: 'ppc',
      leads: 45,
      spend: 3200,
      revenue: 18500,
      costPerLead: 71,
      closeRate: 42,
      revenuePerLead: 411,
      roi: 478,
      confidence: 'high',
      trend: 12.5,
    },
    {
      source: 'lsa',
      leads: 32,
      spend: 2800,
      revenue: 15200,
      costPerLead: 88,
      closeRate: 38,
      revenuePerLead: 475,
      roi: 443,
      confidence: 'high',
      trend: 8.3,
    },
    {
      source: 'meta',
      leads: 28,
      spend: 2400,
      revenue: 9800,
      costPerLead: 86,
      closeRate: 28,
      revenuePerLead: 350,
      roi: 308,
      confidence: 'medium',
      trend: -5.2,
    },
    {
      source: 'organic',
      leads: 52,
      spend: 0,
      revenue: 21600,
      costPerLead: 0,
      closeRate: 48,
      revenuePerLead: 415,
      roi: 0,
      confidence: 'medium',
      trend: 15.7,
    },
    {
      source: 'gbp',
      leads: 38,
      spend: 0,
      revenue: 14200,
      costPerLead: 0,
      closeRate: 35,
      revenuePerLead: 374,
      roi: 0,
      confidence: 'low',
      trend: 4.1,
    },
  ];

  const trendData: TrendData[] = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return {
      date: date.toISOString(),
      leads: Math.floor(Math.random() * 10) + 3,
      spend: Math.floor(Math.random() * 500) + 200,
      revenue: Math.floor(Math.random() * 2000) + 800,
    };
  });

  const totalLeads = channelMetrics.reduce((sum, m) => sum + m.leads, 0);
  const totalSpend = channelMetrics.reduce((sum, m) => sum + m.spend, 0);
  const totalRevenue = channelMetrics.reduce((sum, m) => sum + m.revenue, 0);

  return {
    timeRange,
    totalLeads,
    totalSpend,
    totalRevenue,
    avgCostPerLead: totalSpend / totalLeads,
    avgCloseRate: channelMetrics.reduce((sum, m) => sum + m.closeRate, 0) / channelMetrics.length,
    overallROI: ((totalRevenue - totalSpend) / totalSpend) * 100,
    channelMetrics,
    trendData,
    topPerformingChannel: 'ppc',
    recommendations: [
      'Google Ads showing strong ROI at 478%. Consider increasing budget by 20%.',
      'Meta Ads performance declining (-5.2%). Review ad creative and targeting.',
      'Organic search driving high-quality leads. Invest in content strategy.',
    ],
  };
}

function generateMockLeads(): Lead[] {
  const sources: LeadSource[] = ['ppc', 'lsa', 'meta', 'organic', 'gbp'];
  const statuses: Lead['status'][] = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  const confidences: Lead['attributionConfidence'][] = ['high', 'medium', 'low'];

  return Array.from({ length: 25 }, (_, i) => {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    return {
      id: `lead-${i}`,
      source,
      createdAt: date.toISOString(),
      status,
      value: status === 'converted' ? Math.floor(Math.random() * 5000) + 1000 : undefined,
      revenue: status === 'converted' ? Math.floor(Math.random() * 3000) + 500 : undefined,
      attributionConfidence: confidences[Math.floor(Math.random() * confidences.length)],
      metadata: {
        campaign: `Campaign ${Math.floor(Math.random() * 5) + 1}`,
        keyword: source === 'ppc' ? `keyword-${Math.floor(Math.random() * 10)}` : undefined,
      },
    };
  });
}
