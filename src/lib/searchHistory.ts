// Search history management for improved user experience
import { SearchHistoryItem } from '@/types/content';

const STORAGE_KEY = 'search-history';
const MAX_HISTORY_ITEMS = 10;

export class SearchHistoryManager {
  private history: SearchHistoryItem[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch {
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch {
      // Ignore localStorage errors
    }
  }

  addSearch(query: string, resultsCount: number): void {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Remove existing instance of this query
    this.history = this.history.filter(item => item.query !== trimmed);

    // Add to front
    this.history.unshift({
      query: trimmed,
      timestamp: Date.now(),
      resultsCount
    });

    // Limit size
    if (this.history.length > MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
    }

    this.saveHistory();
  }

  getRecentSearches(limit = 5): SearchHistoryItem[] {
    return this.history.slice(0, limit);
  }

  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  // Get popular search terms for suggestions
  getPopularTerms(): string[] {
    const termCounts = new Map<string, number>();
    
    this.history.forEach(item => {
      const tokens = item.query.toLowerCase().split(/\s+/);
      tokens.forEach(token => {
        if (token.length > 2) {
          termCounts.set(token, (termCounts.get(token) || 0) + 1);
        }
      });
    });

    return Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }
}

export const searchHistoryManager = new SearchHistoryManager();
