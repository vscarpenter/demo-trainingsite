import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Filter, Clock, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { ContentItem, SearchResult, SearchFilters } from '@/types/content';
import { searchContent, searchContentWithBody, debounce, cn } from '@/lib/utils';
import { 
  defaultFilters, 
  applySearchFilters, 
  getUniqueValues,
  getAutocompleteSuggestions,
  generateSearchSuggestions 
} from '@/lib/searchFilters';
import { searchHistoryManager } from '@/lib/searchHistory';
import { searchAnalytics, measureSearchPerformance } from '@/lib/searchAnalytics';

interface EnhancedSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentItems: ContentItem[];
  onSelectContent: (contentId: string) => void;
}

export const EnhancedSearchDialog: React.FC<EnhancedSearchDialogProps> = ({
  isOpen,
  onClose,
  contentItems,
  onSelectContent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const latestReq = useRef(0);

  // Initialize suggestions
  useEffect(() => {
    const allSuggestions = generateSearchSuggestions(contentItems);
    setSuggestions(allSuggestions);
  }, [contentItems]);

  // Enhanced search with analytics
  const runSearch = useCallback(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setFilteredResults([]);
        setAutocompleteSuggestions([]);
        return;
      }

      const reqId = ++latestReq.current;

      try {
        const { result: quickResults, duration: quickDuration } = await measureSearchPerformance(
          () => searchContent(contentItems, query)
        );

        if (reqId === latestReq.current) {
          setSearchResults(quickResults);
          const filtered = applySearchFilters(quickResults, filters);
          setFilteredResults(filtered);
          setSelectedIndex(-1);

          // Record analytics for quick search
          searchAnalytics.recordSearch(query, quickResults.length, quickDuration);
        }

        // Enhanced search with body content
        const { result: enhancedResults, duration: enhancedDuration } = await measureSearchPerformance(
          () => searchContentWithBody(contentItems, query)
        );

        if (reqId === latestReq.current) {
          setSearchResults(enhancedResults);
          const filtered = applySearchFilters(enhancedResults, filters);
          setFilteredResults(filtered);
          
          // Update analytics with enhanced results
          searchAnalytics.recordSearch(query, enhancedResults.length, enhancedDuration);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (reqId === latestReq.current) {
          setSearchResults([]);
          setFilteredResults([]);
        }
      }

      // Update autocomplete suggestions
      const autocomplete = getAutocompleteSuggestions(query, suggestions);
      setAutocompleteSuggestions(autocomplete);
  }, [contentItems, filters, suggestions]);

  const debouncedSearch = useMemo(() => debounce(runSearch, 300), [runSearch]);

  // Apply filters when they change
  useEffect(() => {
    const filtered = applySearchFilters(searchResults, filters);
    setFilteredResults(filtered);
    setSelectedIndex(-1);
  }, [searchResults, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowHistory(query.trim().length === 0);
    debouncedSearch(query);
  };

  const handleSelectResult = (result: SearchResult) => {
    // Record click analytics
    searchAnalytics.recordResultClick(searchQuery, result.item.id);
    
    // Add to search history
    searchHistoryManager.addSearch(searchQuery, searchResults.length);
    
    onSelectContent(result.item.id);
    onClose();
  };

  const handleHistoryItemClick = (historyQuery: string) => {
    setSearchQuery(historyQuery);
    setShowHistory(false);
    debouncedSearch(historyQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setAutocompleteSuggestions([]);
    debouncedSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (autocompleteSuggestions.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      // Handle autocomplete navigation
      return;
    }

    switch (e.key) {
      case 'Escape':
        if (showFilters) {
          setShowFilters(false);
        } else {
          onClose();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredResults[selectedIndex]) {
          handleSelectResult(filteredResults[selectedIndex]);
        }
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setShowHistory(true);
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setFilteredResults([]);
      setSelectedIndex(-1);
      setShowFilters(false);
      setShowHistory(false);
      setAutocompleteSuggestions([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const recentSearches = searchHistoryManager.getRecentSearches();
  const popularFromAnalytics = searchAnalytics.getSuggestionsFromAnalytics();
  const uniqueValues = getUniqueValues(contentItems);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-4 sm:pt-8 md:pt-16 lg:pt-20 px-4 sm:px-6 md:px-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] sm:max-h-[80vh] flex flex-col border border-gray-200/50"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center p-4 sm:p-6 border-b border-gray-200/80 bg-gradient-to-r from-ms-blue/5 to-transparent">
          <div className="flex items-center flex-1 space-x-3 relative">
            <Search className="h-5 w-5 text-ms-blue/70 flex-shrink-0" />
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full text-lg outline-none placeholder-gray-400 bg-transparent border-none focus:placeholder-gray-300 transition-colors duration-200 text-gray-900"
                aria-label="Search content"
              />
              
              {/* Autocomplete suggestions */}
              {autocompleteSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {autocompleteSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="h-9 w-9"
              aria-label="Search history"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 w-9"
              aria-label="Search filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
              aria-label="Close search dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Filters */}
        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Content Type Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Content Type</label>
                <div className="space-y-1">
                  {uniqueValues.contentTypes.map(type => (
                    <label key={type} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.contentTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked 
                            ? [...filters.contentTypes, type]
                            : filters.contentTypes.filter(t => t !== type);
                          setFilters(prev => ({ ...prev, contentTypes: newTypes }));
                        }}
                        className="mr-2 h-4 w-4 text-ms-blue focus:ring-ms-blue border-gray-300 rounded"
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Section</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {uniqueValues.sections.map(section => (
                    <label key={section} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={filters.sections.includes(section)}
                        onChange={(e) => {
                          const newSections = e.target.checked 
                            ? [...filters.sections, section]
                            : filters.sections.filter(s => s !== section);
                          setFilters(prev => ({ ...prev, sections: newSections }));
                        }}
                        className="mr-2 h-4 w-4 text-ms-blue focus:ring-ms-blue border-gray-300 rounded"
                      />
                      <span>{section}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    sortBy: e.target.value as SearchFilters['sortBy']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-ms-blue focus:border-ms-blue"
                >
                  <option value="relevance">Relevance</option>
                  <option value="title">Title</option>
                  <option value="section">Section</option>
                  <option value="recent">Recent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-gray-500">
                {filteredResults.length} of {searchResults.length} results shown
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(defaultFilters)}
                className="text-xs"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-hidden">
          {showHistory && searchQuery.trim() === '' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Recent Searches
                    </h3>
                    <div className="space-y-1">
                      {recentSearches.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleHistoryItemClick(item.query)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center justify-between"
                        >
                          <span>{item.query}</span>
                          <span className="text-xs text-gray-400">{item.resultsCount} results</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Searches */}
                {popularFromAnalytics.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Popular Searches
                    </h3>
                    <div className="space-y-1">
                      {popularFromAnalytics.slice(0, 5).map((query, index) => (
                        <button
                          key={index}
                          onClick={() => handleHistoryItemClick(query)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : searchQuery.trim() === '' ? (
            <div className="p-6 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2">Search Learning Content</p>
              <p className="text-sm">Type to search across all course materials</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2">No results found</p>
              <p className="text-sm mb-4">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div
              ref={resultsContainerRef}
              className="overflow-y-auto max-h-96 custom-scrollbar"
              role="listbox"
              aria-label="Search results"
            >
              {filteredResults.map((result, index) => (
                <div
                  key={result.item.id}
                  className={cn(
                    "flex items-center p-4 cursor-pointer border-b border-gray-100/80 last:border-b-0",
                    "transition-all duration-200 ease-out",
                    "hover:bg-gradient-to-r hover:from-ms-blue/5 hover:to-transparent",
                    selectedIndex === index && "bg-gradient-to-r from-ms-blue/10 to-ms-blue/5"
                  )}
                  onClick={() => handleSelectResult(result)}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium text-gray-900 mb-1"
                      dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                    />
                    {result.highlightedSnippet && (
                      <div
                        className="text-sm text-gray-600 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: result.highlightedSnippet }}
                      />
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      {result.item.section}
                      {result.item.subsection && ` • ${result.item.subsection}`}
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs capitalize">
                        {result.item.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredResults.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-gray-200/80 bg-gray-50/50 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↑↓</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">Esc</kbd>
              </div>
              <span className="font-medium text-ms-blue">
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
