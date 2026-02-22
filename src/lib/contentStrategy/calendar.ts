// 12-week phased content calendar

import type { ContentMapItem } from './contentMap';

export type CalendarPhase = 'Foundation' | 'Geographic' | 'Authority' | 'Ongoing';
export type CalendarPriority = 'high' | 'medium' | 'ongoing';

export interface CalendarItem {
  id: string;
  week: number;
  phase: CalendarPhase;
  calendarPriority: CalendarPriority;
  pageType: 'service' | 'location' | 'blog' | 'gbp';
  title: string;
  primaryKeyword: string;
  keywords: string[];
  url: string;
  totalVolume: number;
  totalRoi: number;
  status: 'planned' | 'in-progress' | 'published';
  clusterId: number;
}

/**
 * Build a 12-week phased content calendar from content map items.
 *
 * Phases:
 *   Weeks 1-4:  Foundation — top 4 service gap pages (high priority)
 *   Weeks 5-8:  Geographic — top 8 location gap pages (high priority)
 *   Weeks 9-12: Authority  — top 8 blog gap pages (medium priority)
 *   All weeks:  Ongoing    — 1 GBP post per week (ongoing priority)
 */
export function buildCalendar(contentMap: ContentMapItem[]): CalendarItem[] {
  const items: CalendarItem[] = [];
  let idCounter = 0;

  // Filter gaps sorted by ROI
  const serviceGaps = contentMap
    .filter(c => c.status === 'gap' && c.type === 'service')
    .sort((a, b) => b.totalRoi - a.totalRoi)
    .slice(0, 4);

  const locationGaps = contentMap
    .filter(c => c.status === 'gap' && c.type === 'location')
    .sort((a, b) => b.totalRoi - a.totalRoi)
    .slice(0, 8);

  const blogGaps = contentMap
    .filter(c => c.status === 'gap' && c.type === 'blog')
    .sort((a, b) => b.totalRoi - a.totalRoi)
    .slice(0, 8);

  // Foundation: weeks 1-4 (1 service page per week)
  serviceGaps.forEach((gap, i) => {
    items.push({
      id: `cal-${idCounter++}`,
      week: i + 1,
      phase: 'Foundation',
      calendarPriority: 'high',
      pageType: 'service',
      title: gap.title,
      primaryKeyword: gap.primaryKeyword,
      keywords: gap.keywords.slice(0, 5),
      url: gap.url,
      totalVolume: gap.totalVolume,
      totalRoi: gap.totalRoi,
      status: 'planned',
      clusterId: gap.clusterId,
    });
  });

  // Geographic: weeks 5-8 (2 location pages per week)
  locationGaps.forEach((gap, i) => {
    items.push({
      id: `cal-${idCounter++}`,
      week: 5 + Math.floor(i / 2),
      phase: 'Geographic',
      calendarPriority: 'high',
      pageType: 'location',
      title: gap.title,
      primaryKeyword: gap.primaryKeyword,
      keywords: gap.keywords.slice(0, 5),
      url: gap.url,
      totalVolume: gap.totalVolume,
      totalRoi: gap.totalRoi,
      status: 'planned',
      clusterId: gap.clusterId,
    });
  });

  // Authority: weeks 9-12 (2 blog posts per week)
  blogGaps.forEach((gap, i) => {
    items.push({
      id: `cal-${idCounter++}`,
      week: 9 + Math.floor(i / 2),
      phase: 'Authority',
      calendarPriority: 'medium',
      pageType: 'blog',
      title: gap.title,
      primaryKeyword: gap.primaryKeyword,
      keywords: gap.keywords.slice(0, 5),
      url: gap.url,
      totalVolume: gap.totalVolume,
      totalRoi: gap.totalRoi,
      status: 'planned',
      clusterId: gap.clusterId,
    });
  });

  // Ongoing: GBP posts every week (weeks 1-12)
  for (let w = 1; w <= 12; w++) {
    items.push({
      id: `cal-${idCounter++}`,
      week: w,
      phase: 'Ongoing',
      calendarPriority: 'ongoing',
      pageType: 'gbp',
      title: `GBP Post — Week ${w}`,
      primaryKeyword: '',
      keywords: [],
      url: '',
      totalVolume: 0,
      totalRoi: 0,
      status: 'planned',
      clusterId: -1,
    });
  }

  return items.sort((a, b) => a.week - b.week || priorityOrder(a.calendarPriority) - priorityOrder(b.calendarPriority));
}

function priorityOrder(p: CalendarPriority): number {
  switch (p) {
    case 'high': return 0;
    case 'medium': return 1;
    case 'ongoing': return 2;
  }
}
