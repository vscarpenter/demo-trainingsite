import { ContentItem, SearchResult, SearchFilters } from '@/types/content';


export const defaultFilters: SearchFilters = {
  contentTypes: [],
  sections: [],
  subsections: [],
  sortBy: 'relevance',
  sortOrder: 'desc'
};

export function getUniqueValues(items: ContentItem[]) {
  return {
    contentTypes: [...new Set(items.map(item => item.type))].sort(),
    sections: [...new Set(items.map(item => item.section))].sort(),
    subsections: [...new Set(items.map(item => item.subsection).filter(Boolean))].sort()
  };
}

export function applySearchFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  let filtered = results;

  // Apply content type filter
  if (filters.contentTypes.length > 0) {
    filtered = filtered.filter(result => 
      filters.contentTypes.includes(result.item.type)
    );
  }

  // Apply section filter
  if (filters.sections.length > 0) {
    filtered = filtered.filter(result => 
      filters.sections.includes(result.item.section)
    );
  }

  // Apply subsection filter
  if (filters.subsections.length > 0) {
    filtered = filtered.filter(result => 
      result.item.subsection && filters.subsections.includes(result.item.subsection)
    );
  }

  // Apply sorting
  if (filters.sortBy !== 'relevance') {
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'title':
          comparison = a.item.title.localeCompare(b.item.title);
          break;
        case 'section':
          comparison = a.item.section.localeCompare(b.item.section) || 
                      (a.item.subsection || '').localeCompare(b.item.subsection || '');
          break;
        case 'recent':
          comparison = (b.item.order || 0) - (a.item.order || 0);
          break;
        default:
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  return filtered;
}

// Search suggestions based on content structure
export function generateSearchSuggestions(items: ContentItem[]): string[] {
  const suggestions = new Set<string>();

  // Add common search terms
  const commonTerms = [
    'introduction', 'prompt', 'video', 'word', 'excel', 'powerpoint',
    'outlook', 'teams', 'sharepoint', 'copilot', 'microsoft', 'office'
  ];

  commonTerms.forEach(term => suggestions.add(term));

  // Extract unique words from titles
  items.forEach(item => {
    const words = item.title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonTerms.includes(word));
    
    words.forEach(word => suggestions.add(word));
  });

  // Add section-specific terms
  const sections = new Set(items.map(item => item.section));
  sections.forEach(section => {
    const sectionWords = section.toLowerCase()
      .replace(/^\d+\.\s*/, '') // Remove number prefix
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    sectionWords.forEach(word => suggestions.add(word));
  });

  return Array.from(suggestions).slice(0, 50).sort();
}

// Auto-complete functionality
export function getAutocompleteSuggestions(
  query: string, 
  allSuggestions: string[], 
  limit = 5
): string[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();
  
  return allSuggestions
    .filter(suggestion => 
      suggestion.toLowerCase().includes(normalizedQuery) ||
      suggestion.toLowerCase().startsWith(normalizedQuery)
    )
    .sort((a, b) => {
      // Prioritize starts-with matches
      const aStarts = a.toLowerCase().startsWith(normalizedQuery);
      const bStarts = b.toLowerCase().startsWith(normalizedQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Then by length (shorter first)
      return a.length - b.length;
    })
    .slice(0, limit);
}
