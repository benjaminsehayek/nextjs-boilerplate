// Site Audit Tool - Scoring Algorithms (Pure Functions)

import type { AuditCheck, CategoryScore, Issue, QuickWin, PageData, Severity, Impact, Effort, Category } from './types';

/**
 * Calculate overall score from category scores
 */
export function calculateOverallScore(categoryScores: Record<string, CategoryScore> | Record<string, { score: number }>): number {
  const scores = Object.values(categoryScores).map(cat => cat.score);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * Calculate category score using weighted algorithm
 * Critical issues: weight 3, Warning: weight 2, Notice: weight 1
 */
export function calculateCategoryScore(checks: AuditCheck[]): number {
  if (checks.length === 0) return 100;

  let totalWeight = 0;
  let weightedSum = 0;

  checks.forEach(check => {
    const weight = check.severity === 'critical' ? 3 : check.severity === 'warning' ? 2 : 1;
    totalWeight += weight;
    weightedSum += (check.passed ? weight : 0);
  });

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 100;
}

/**
 * Calculate impact score for quick wins prioritization
 */
export function calculateImpactScore(issue: Issue): number {
  const impactPoints = { high: 10, medium: 5, low: 2 };
  const effortPoints = { easy: 10, medium: 5, hard: 2 };
  const severityPoints = { critical: 15, warning: 10, notice: 5 };

  const impact = impactPoints[issue.impact] || 0;
  const effort = effortPoints[issue.effort] || 0;
  const severity = severityPoints[issue.severity] || 0;
  const pageCount = Math.min(issue.affectedPages.length, 10); // Cap at 10 for scoring

  // Formula: (impact + severity + pages) * effort_multiplier
  return Math.round((impact + severity + pageCount) * (effort / 5));
}

/**
 * Detect issues from DataForSEO page data
 */
export function detectIssues(pageData: any, url: string): Issue[] {
  const issues: Issue[] = [];

  // Meta Data Issues
  if (!pageData.meta?.title || pageData.meta.title.length === 0) {
    issues.push({
      id: `missing_title_${url}`,
      type: 'missing_title',
      severity: 'critical',
      category: 'meta',
      title: 'Missing Page Title',
      description: 'Page is missing a title tag',
      affectedPages: [url],
      fix: 'Add a descriptive <title> tag to the <head> section (50-60 characters)',
      impact: 'high',
      effort: 'easy',
    });
  } else if (pageData.meta.title.length < 30) {
    issues.push({
      id: `short_title_${url}`,
      type: 'short_title',
      severity: 'warning',
      category: 'meta',
      title: 'Title Tag Too Short',
      description: `Title is only ${pageData.meta.title.length} characters`,
      affectedPages: [url],
      fix: 'Expand title to 50-60 characters for better SEO',
      impact: 'medium',
      effort: 'easy',
    });
  } else if (pageData.meta.title.length > 60) {
    issues.push({
      id: `long_title_${url}`,
      type: 'long_title',
      severity: 'warning',
      category: 'meta',
      title: 'Title Tag Too Long',
      description: `Title is ${pageData.meta.title.length} characters (may be truncated)`,
      affectedPages: [url],
      fix: 'Shorten title to 50-60 characters',
      impact: 'medium',
      effort: 'easy',
    });
  }

  if (!pageData.meta?.description || pageData.meta.description.length === 0) {
    issues.push({
      id: `missing_meta_description_${url}`,
      type: 'missing_meta_description',
      severity: 'critical',
      category: 'meta',
      title: 'Missing Meta Description',
      description: 'Page is missing a meta description',
      affectedPages: [url],
      fix: 'Add a compelling meta description (150-160 characters)',
      impact: 'high',
      effort: 'easy',
    });
  } else if (pageData.meta.description.length < 120) {
    issues.push({
      id: `short_meta_description_${url}`,
      type: 'short_meta_description',
      severity: 'warning',
      category: 'meta',
      title: 'Meta Description Too Short',
      description: `Meta description is only ${pageData.meta.description.length} characters`,
      affectedPages: [url],
      fix: 'Expand meta description to 150-160 characters',
      impact: 'medium',
      effort: 'easy',
    });
  }

  // Content Issues
  const wordCount = pageData.meta?.content?.plain_text_word_count || 0;
  if (wordCount < 300) {
    issues.push({
      id: `thin_content_${url}`,
      type: 'thin_content',
      severity: 'warning',
      category: 'content',
      title: 'Thin Content',
      description: `Page has only ${wordCount} words`,
      affectedPages: [url],
      fix: 'Add more valuable content (aim for 300+ words minimum)',
      impact: 'medium',
      effort: 'medium',
    });
  }

  if (!pageData.meta?.htags?.h1 || pageData.meta.htags.h1.length === 0) {
    issues.push({
      id: `missing_h1_${url}`,
      type: 'missing_h1',
      severity: 'critical',
      category: 'content',
      title: 'Missing H1 Tag',
      description: 'Page is missing an H1 heading',
      affectedPages: [url],
      fix: 'Add a clear, descriptive H1 heading',
      impact: 'high',
      effort: 'easy',
    });
  } else if (pageData.meta.htags.h1.length > 1) {
    issues.push({
      id: `multiple_h1_${url}`,
      type: 'multiple_h1',
      severity: 'warning',
      category: 'content',
      title: 'Multiple H1 Tags',
      description: `Page has ${pageData.meta.htags.h1.length} H1 tags`,
      affectedPages: [url],
      fix: 'Use only one H1 tag per page',
      impact: 'medium',
      effort: 'easy',
    });
  }

  // Image Issues
  const images = pageData.meta?.images || [];
  const imagesWithoutAlt = images.filter((img: any) => !img.alt || img.alt.length === 0);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      id: `missing_alt_text_${url}`,
      type: 'missing_alt_text',
      severity: 'warning',
      category: 'images',
      title: 'Images Missing Alt Text',
      description: `${imagesWithoutAlt.length} images missing alt text`,
      affectedPages: [url],
      fix: 'Add descriptive alt text to all images',
      impact: 'medium',
      effort: 'easy',
    });
  }

  // Links Issues
  const brokenLinks = pageData.meta?.links?.filter((link: any) => link.broken) || [];
  if (brokenLinks.length > 0) {
    issues.push({
      id: `broken_links_${url}`,
      type: 'broken_links',
      severity: 'critical',
      category: 'links',
      title: 'Broken Links Found',
      description: `${brokenLinks.length} broken links detected`,
      affectedPages: [url],
      fix: 'Fix or remove broken links',
      impact: 'high',
      effort: 'medium',
    });
  }

  // Security Issues
  if (!pageData.meta?.url?.startsWith('https://')) {
    issues.push({
      id: `no_https_${url}`,
      type: 'no_https',
      severity: 'critical',
      category: 'security',
      title: 'Not Using HTTPS',
      description: 'Page is not served over HTTPS',
      affectedPages: [url],
      fix: 'Install SSL certificate and redirect HTTP to HTTPS',
      impact: 'high',
      effort: 'medium',
    });
  }

  return issues;
}

/**
 * Identify quick wins from issues list
 * Quick wins = high impact + easy effort
 */
export function identifyQuickWins(issues: Issue[]): QuickWin[] {
  return issues
    .filter(issue => issue.impact === 'high' && issue.effort === 'easy')
    .map((issue, index) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      estimatedTime: '5-10 min',
      impactScore: calculateImpactScore(issue),
      affectedPages: issue.affectedPages.length,
      fix: issue.fix,
      category: issue.category,
      completed: false,
    }))
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10); // Top 10 quick wins
}

/**
 * Group issues by category
 */
export function groupIssuesByCategory(issues: Issue[]): Record<string, Issue[]> {
  return issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);
}

/**
 * Group issues by severity
 */
export function groupIssuesBySeverity(issues: Issue[]): Record<Severity, Issue[]> {
  return issues.reduce((acc, issue) => {
    if (!acc[issue.severity]) {
      acc[issue.severity] = [];
    }
    acc[issue.severity].push(issue);
    return acc;
  }, { critical: [], warning: [], notice: [] } as Record<Severity, Issue[]>);
}

/**
 * Calculate page health score
 */
export function calculatePageScore(page: PageData): number {
  const checks: AuditCheck[] = [];

  const metaDescription = page.meta_description || page.description;
  const statusCode = page.status_code || page.statusCode;
  const wordCount = page.word_count || page.wordCount;

  // Title check
  checks.push({
    id: 'title',
    category: 'meta',
    name: 'Title Tag',
    description: 'Page has proper title tag',
    passed: !!page.title && page.title.length >= 30 && page.title.length <= 60,
    severity: 'critical',
  });

  // Meta description check
  checks.push({
    id: 'meta_description',
    category: 'meta',
    name: 'Meta Description',
    description: 'Page has proper meta description',
    passed: !!metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160,
    severity: 'critical',
  });

  // H1 check
  checks.push({
    id: 'h1',
    category: 'content',
    name: 'H1 Heading',
    description: 'Page has H1 heading',
    passed: !!page.h1,
    severity: 'critical',
  });

  // Content length check
  checks.push({
    id: 'word_count',
    category: 'content',
    name: 'Content Length',
    description: 'Page has sufficient content',
    passed: (wordCount || 0) >= 300,
    severity: 'warning',
  });

  // Status code check
  checks.push({
    id: 'status_code',
    category: 'technical',
    name: 'HTTP Status',
    description: 'Page returns 200 status',
    passed: statusCode === 200,
    severity: 'critical',
  });

  return calculateCategoryScore(checks);
}
