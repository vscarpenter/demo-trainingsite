import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Play, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { ContentItem, SearchResult } from '@/types/content';
import { searchContent, searchContentWithBody, debounce } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contentItems: ContentItem[];
  onSelectContent: (contentId: string) => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({
  isOpen,
  onClose,
  contentItems,
  onSelectContent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const latestReq = useRef(0);
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      const reqId = ++latestReq.current;
      // Fast header-only results for responsiveness
      const quick = searchContent(contentItems, query);
      if (reqId === latestReq.current) {
        setSearchResults(quick);
        setSelectedIndex(-1);
      }
      // Enhanced results with body + snippets
      try {
        const enhanced = await searchContentWithBody(contentItems, query);
        if (reqId === latestReq.current) {
          setSearchResults(enhanced);
          setSelectedIndex(-1);
        }
      } catch {
        // ignore
      }
    }, 300),
    [contentItems]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectResult(searchResults[selectedIndex]);
        }
        break;
    }
  };

  // Handle result selection
  const handleSelectResult = (result: SearchResult) => {
    onSelectContent(result.item.id);
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get content type icon
  const getContentTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'introduction':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'prompt':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'video':
        return <Play className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-start justify-center",
        "bg-black/60 backdrop-blur-sm",
        "pt-4 sm:pt-8 md:pt-16 lg:pt-20",
        "px-4 sm:px-6 md:px-8",
        "transition-all duration-300 ease-out",
        isOpen ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-title"
    >
      <div
        ref={dialogRef}
        className={cn(
          "bg-white rounded-xl shadow-2xl w-full max-w-2xl",
          "max-h-[85vh] sm:max-h-[80vh] flex flex-col",
          "border border-gray-200/50",
          "transform transition-all duration-300 ease-out",
          "animate-in slide-in-from-top-4 fade-in-0",
          "hover:shadow-3xl"
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center p-4 sm:p-6 border-b border-gray-200/80 bg-gradient-to-r from-ms-blue/5 to-transparent">
          <div className="flex items-center flex-1 space-x-3">
            <Search className="h-5 w-5 text-ms-blue/70 flex-shrink-0" />
            <h2 id="search-dialog-title" className="sr-only">Search Content</h2>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={cn(
                "flex-1 text-lg outline-none placeholder-gray-400",
                "bg-transparent border-none",
                "focus:placeholder-gray-300 transition-colors duration-200",
                "text-gray-900"
              )}
              aria-label="Search content"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              "h-9 w-9 flex-shrink-0 ml-2",
              "hover:bg-gray-100 hover:text-gray-700",
              "focus:bg-ms-blue/10 focus:text-ms-blue",
              "transition-all duration-200 ease-out",
              "rounded-lg"
            )}
            aria-label="Close search dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          {searchQuery.trim() === '' ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <div className="relative mb-6">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-ms-blue/10 to-ms-blue/5 flex items-center justify-center">
                  <Search className="h-8 w-8 text-ms-blue/60" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-ms-blue/10 rounded-full animate-pulse" />
              </div>
              <p className="text-lg font-semibold mb-2 text-gray-700">Search Learning Content</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Type to search across all course materials, sections, and topics
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <div className="relative mb-6">
                <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <p className="text-lg font-semibold mb-2 text-gray-700">No results found</p>
              <p className="text-sm mb-6 text-gray-500 max-w-sm mx-auto">
                Try searching for different keywords or check your spelling
              </p>
              <div className="bg-gray-50/80 rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-xs font-medium text-gray-600 mb-2">Search tips:</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Try broader terms like "Word", "Excel", or "PowerPoint"</p>
                  <p>• Search for specific topics like "prompts" or "introduction"</p>
                  <p>• Use partial words to find related content</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={resultsContainerRef}
              className="overflow-y-auto max-h-96 custom-scrollbar"
              role="listbox"
              aria-label="Search results"
            >
              {searchResults.map((result, index) => (
                <div
                  key={result.item.id}
                  className={cn(
                    "flex items-center p-4 cursor-pointer border-b border-gray-100/80 last:border-b-0",
                    "transition-all duration-200 ease-out",
                    "hover:bg-gradient-to-r hover:from-ms-blue/5 hover:to-transparent",
                    "hover:border-ms-blue/20",
                    selectedIndex === index && [
                      "bg-gradient-to-r from-ms-blue/10 to-ms-blue/5",
                      "border-ms-blue/30 shadow-sm"
                    ]
                  )}
                  onClick={() => handleSelectResult(result)}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className="p-1.5 rounded-lg bg-white shadow-sm border border-gray-100">
                      {getContentTypeIcon(result.item.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium text-gray-900 mb-1 leading-tight"
                      dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                    />
                    {result.highlightedSnippet && (
                      <div
                        className="text-sm text-gray-600 line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: result.highlightedSnippet }}
                      />
                    )}
                    <div className="text-sm text-gray-500 flex items-center space-x-2 flex-wrap">
                      <span className="font-medium">{result.item.section}</span>
                      {result.item.subsection && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{result.item.subsection}</span>
                        </>
                      )}
                      <span className="text-gray-300">•</span>
                      <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium">
                        {result.item.type}
                      </span>
                    </div>
                  </div>
                  {result.matchType !== 'title' && (
                    <div className="flex-shrink-0 ml-2">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        "bg-ms-blue/10 text-ms-blue border border-ms-blue/20"
                      )}>
                        {result.matchType === 'section' ? 'Section match' : 'App match'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {searchResults.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-gray-200/80 bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↑↓</kbd>
                  <span className="hidden sm:inline">Navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↵</kbd>
                  <span className="hidden sm:inline">Select</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">Esc</kbd>
                  <span className="hidden sm:inline">Close</span>
                </span>
              </div>
              <span className="font-medium text-ms-blue">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchDialog;
