// TypeScript interfaces for Local Grid tool

export type GridSize = 3 | 5 | 7 | 9;

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
}

export interface GridPoint {
  id: string;
  lat: number;
  lng: number;
  position: number; // 1-81 depending on grid size
  rank: number | null;
  url: string | null;
  distance: number; // km from center
}

export interface Keyword {
  id: string;
  text: string;
  active: boolean;
}

export interface GridConfig {
  size: GridSize;
  radius: number; // km
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
}
