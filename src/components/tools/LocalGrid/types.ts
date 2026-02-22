// TypeScript interfaces for Local Grid tool

export type GridSize = 3 | 5 | 7 | 9;

export interface Competitor {
  name: string;
  rank: number;
}

export interface ScanLogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export interface IndustryPreset {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export interface BusinessInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  // Google identifiers for accurate rank matching
  placeId?: string;
  cid?: string;
  featureId?: string;
  domain?: string;
  category?: string;
}

/** DataForSEO Maps SERP response item */
export interface MapsSerpItem {
  type: string; // "maps_search" | "maps_paid_item"
  rank_group: number;
  rank_absolute: number;
  domain: string | null;
  title: string;
  url: string | null;
  cid?: string;
  feature_id?: string;
  place_id?: string;
  address?: string;
  phone?: string;
  is_paid?: boolean;
  rating?: { value: number; votes_count: number } | null;
}

export type MatchMethod = 'cid' | 'placeId' | 'exactName' | 'significantWords' | 'domain' | null;

export interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  position: number; // 1-81 depending on grid size
  rank: number | null;
  url: string | null;
  matchMethod?: MatchMethod;
  distance: number; // miles from center
  competitors?: Competitor[];
}

export interface Keyword {
  id: string;
  text: string;
  active: boolean;
}

export interface GridConfig {
  size: GridSize;
  radius: number; // miles
  keywords: Keyword[];
}

export interface GridScanResult {
  id: string;
  business_id: string;
  business_info: BusinessInfo;
  config: GridConfig;
  points: GridPoint[];
  scan_date: string;
  total_cost: number;
  status: 'pending' | 'scanning' | 'complete' | 'failed';
  progress: {
    current: number;
    total: number;
    currentKeyword?: string;
    currentPoint?: number;
  };
}

export interface RankData {
  keyword: string;
  point: number;
  rank: number | null;
  url: string | null;
  matchMethod?: MatchMethod;
  topResults: {
    position: number;
    title: string;
    domain: string;
    url: string;
  }[];
}

export interface HeatmapData {
  keyword: string;
  points: {
    lat: number;
    lng: number;
    rank: number | null;
    intensity: number; // 0-1 for heatmap coloring
  }[];
  averageRank: number;
  pointsRanking: number; // count of points where business appears
  notRanking: number; // count of points where business doesn't appear
  top3Count: number; // count of points with rank 1-3
  visibilityScore: number; // (top3Count / totalPoints) * 100
}
