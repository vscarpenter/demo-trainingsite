// Search analytics and performance monitoring
import { SearchAnalytics, SearchMetrics } from '@/types/content';

const STORAGE_KEY = 'search-analytics';
const PERFORMANCE_THRESHOLD = 1000; // 1 second
const SESSION_STORAGE_KEY = 'search-session-id';

class SearchAnalyticsManager {
  private analytics: SearchAnalytics[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.loadAnalytics();
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  }

  private loadAnalytics(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.analytics = JSON.parse(stored);
      }
    } catch {
      this.analytics = [];
    }
  }

  private saveAnalytics(): void {
    try {
      // Keep only last 1000 entries to avoid storage bloat
      if (this.analytics.length > 1000) {
        this.analytics = this.analytics.slice(-1000);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.analytics));
    } catch {
      // Ignore localStorage errors
    }
  }

  recordSearch(
    query: string, 
    resultsCount: number, 
    searchDuration: number
  ): void {
    const analytics: SearchAnalytics = {
      query: query.trim(),
      timestamp: Date.now(),
      resultsCount,
      searchDuration,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    };

    this.analytics.push(analytics);
    this.saveAnalytics();

    // Log performance issues to console in development
    if (searchDuration > PERFORMANCE_THRESHOLD && import.meta.env.DEV) {
      console.warn(`Slow search detected: "${query}" took ${searchDuration}ms`);
    }
  }

  recordResultClick(query: string, contentId: string): void {
    // Find the most recent search with this query and update it
    for (let i = this.analytics.length - 1; i >= 0; i--) {
      if (this.analytics[i].query === query && !this.analytics[i].selectedResult) {
        this.analytics[i].selectedResult = contentId;
        this.saveAnalytics();
        break;
      }
    }
  }

  getMetrics(days = 30): SearchMetrics {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentAnalytics = this.analytics.filter(a => a.timestamp >= cutoff);

    // Calculate popular queries
    const queryCount = new Map<string, number>();
    recentAnalytics.forEach(a => {
      if (a.query.length > 0) {
        queryCount.set(a.query, (queryCount.get(a.query) || 0) + 1);
      }
    });

    const popularQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Find queries with no results
    const noResultQueries = recentAnalytics
      .filter(a => a.resultsCount === 0)
      .map(a => a.query)
      .filter((query, index, arr) => arr.indexOf(query) === index) // unique
      .slice(0, 20);

    // Calculate click-through rate
    const totalSearches = recentAnalytics.length;
    const searchesWithClicks = recentAnalytics.filter(a => a.selectedResult).length;
    const clickThroughRate = totalSearches > 0 ? (searchesWithClicks / totalSearches) * 100 : 0;

    // Find performance issues
    const performanceIssues = recentAnalytics
      .filter(a => a.searchDuration > PERFORMANCE_THRESHOLD)
      .map(a => ({
        query: a.query,
        duration: a.searchDuration,
        timestamp: a.timestamp
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalSearches,
      averageResultsCount: totalSearches > 0 
        ? recentAnalytics.reduce((sum, a) => sum + a.resultsCount, 0) / totalSearches 
        : 0,
      averageSearchDuration: totalSearches > 0
        ? recentAnalytics.reduce((sum, a) => sum + a.searchDuration, 0) / totalSearches
        : 0,
      popularQueries,
      noResultQueries,
      clickThroughRate,
      performanceIssues
    };
  }

  // Get search suggestions based on analytics
  getSuggestionsFromAnalytics(limit = 10): string[] {
    const metrics = this.getMetrics();
    return metrics.popularQueries
      .filter(q => q.query.length > 2) // Filter out very short queries
      .slice(0, limit)
      .map(q => q.query);
  }

  clearAnalytics(): void {
    this.analytics = [];
    this.saveAnalytics();
  }

  // Export analytics data for analysis
  exportAnalytics(): string {
    return JSON.stringify(this.analytics, null, 2);
  }

  // Get performance insights
  getPerformanceInsights(): {
    slowQueries: Array<{ query: string; averageDuration: number; count: number }>;
    fastQueries: Array<{ query: string; averageDuration: number; count: number }>;
    totalSearchVolume: Array<{ date: string; count: number }>;
  } {
    // Group by query and calculate average duration
    const queryMetrics = new Map<string, { durations: number[]; count: number }>();
    
    this.analytics.forEach(a => {
      if (!queryMetrics.has(a.query)) {
        queryMetrics.set(a.query, { durations: [], count: 0 });
      }
      const metrics = queryMetrics.get(a.query)!;
      metrics.durations.push(a.searchDuration);
      metrics.count++;
    });

    const queryPerformance = Array.from(queryMetrics.entries()).map(([query, metrics]) => ({
      query,
      averageDuration: metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length,
      count: metrics.count
    }));

    const slowQueries = queryPerformance
      .filter(q => q.averageDuration > PERFORMANCE_THRESHOLD)
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    const fastQueries = queryPerformance
      .filter(q => q.averageDuration < 100 && q.count > 1)
      .sort((a, b) => a.averageDuration - b.averageDuration)
      .slice(0, 10);

    // Group searches by date for volume tracking
    const dailyVolume = new Map<string, number>();
    this.analytics.forEach(a => {
      const date = new Date(a.timestamp).toISOString().split('T')[0];
      dailyVolume.set(date, (dailyVolume.get(date) || 0) + 1);
    });

    const totalSearchVolume = Array.from(dailyVolume.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      slowQueries,
      fastQueries,
      totalSearchVolume
    };
  }
}

export const searchAnalytics = new SearchAnalyticsManager();

// Performance measurement utility
export function measureSearchPerformance<T>(
  searchFunction: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  
  const resultOrPromise = searchFunction();
  
  if (resultOrPromise instanceof Promise) {
    return resultOrPromise.then(result => {
      const duration = performance.now() - start;
      return { result, duration };
    });
  } else {
    const duration = performance.now() - start;
    return Promise.resolve({ result: resultOrPromise, duration });
  }
}
