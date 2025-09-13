export type ContentType = 'introduction' | 'prompt' | 'video';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  filePath: string;
  section: string;
  subsection?: string;
  order: number;
}

export interface ContentSection {
  id: string;
  title: string;
  order: number;
  items: ContentItem[];
}

export interface NavigationState {
  currentIndex: number;
  totalItems: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export interface SearchResult {
  item: ContentItem;
  matchType: 'title' | 'section' | 'subsection';
  highlightedTitle: string;
  highlightedSnippet?: string;
}

// Enhanced search types
export interface SearchFilters {
  contentTypes: string[];  // ['introduction', 'prompt', 'video']
  sections: string[];      // Section names to filter by
  subsections: string[];   // Subsection names to filter by
  sortBy: 'relevance' | 'title' | 'section' | 'recent';
  sortOrder: 'asc' | 'desc';
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultsCount: number;
}

export interface SearchAnalytics {
  query: string;
  timestamp: number;
  resultsCount: number;
  searchDuration: number; // milliseconds
  selectedResult?: string; // content ID that was clicked
  userAgent: string;
  sessionId: string;
}

export interface SearchMetrics {
  totalSearches: number;
  averageResultsCount: number;
  averageSearchDuration: number;
  popularQueries: Array<{ query: string; count: number }>;
  noResultQueries: string[];
  clickThroughRate: number;
  performanceIssues: Array<{ query: string; duration: number; timestamp: number }>;
}
