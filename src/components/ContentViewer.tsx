import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentItem } from '../types/content';
import { allContentItems, getNavigationState, getNextItem, getPreviousItem } from '../data/contentStructure';

interface ContentViewerProps {
  currentContentId?: string;
  onContentChange?: (contentId: string) => void;
}

const ContentViewer: React.FC<ContentViewerProps> = ({ 
  currentContentId, 
  onContentChange 
}) => {
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Initialize with first item if no content ID provided
  useEffect(() => {
    const contentId = currentContentId || allContentItems[0]?.id;
    if (contentId) {
      const content = allContentItems.find(item => item.id === contentId);
      if (content) {
        setCurrentContent(content);
        loadContent(content);
      }
    }
  }, [currentContentId]);

  const loadContent = async (content: ContentItem) => {
    setLoading(true);
    try {
      // Since we're in a React app, we need to load the HTML content
      // For now, we'll create a placeholder that will load the actual HTML
      const response = await fetch(content.filePath);
      if (response.ok) {
        const html = await response.text();
        // Fix relative paths in HTML content for iframe srcDoc
        const basePath = content.filePath.substring(0, content.filePath.lastIndexOf('/') + 1);
        const fixedHtml = html.replace(
          /src="([^"]+\.mp4)"/g,
          (match, videoPath) => {
            // Convert relative video paths to absolute paths
            if (!videoPath.startsWith('http') && !videoPath.startsWith('/')) {
              return `src="${basePath}${videoPath}"`;
            }
            return match;
          }
        ).replace(
          /href="([^"]+\.mp4)"/g,
          (match, videoPath) => {
            // Convert relative video paths in href attributes too
            if (!videoPath.startsWith('http') && !videoPath.startsWith('/') && !videoPath.includes('index.html')) {
              return `href="${basePath}${videoPath}"`;
            }
            return match;
          }
        ).replace(
          /<header[^>]*>[\s\S]*?<\/header>/gi,
          ''
        ).replace(
          /<a[^>]*href=['"][^'"]*index\.html['"][^>]*>[\s\S]*?<\/a>/gi,
          ''
        );
        setHtmlContent(fixedHtml);
      } else {
        setHtmlContent(`
          <div style="padding: 2rem; text-align: center; color: #666;">
            <h2>Content: ${content.title}</h2>
            <p>Loading content from: ${content.filePath}</p>
            <p>Type: ${content.type}</p>
            <p>Section: ${content.section}</p>
            ${content.subsection ? `<p>Subsection: ${content.subsection}</p>` : ''}
          </div>
        `);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setHtmlContent(`
        <div style="padding: 2rem; text-align: center; color: #666;">
          <h2>Content: ${content.title}</h2>
          <p>File: ${content.filePath}</p>
          <p>Type: ${content.type}</p>
          <p>Section: ${content.section}</p>
          ${content.subsection ? `<p>Subsection: ${content.subsection}</p>` : ''}
          <p><em>Content will be loaded from the public folder</em></p>
        </div>
      `);
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (!currentContent) return;
    
    const nextItem = getNextItem(currentContent.id);
    if (nextItem) {
      setCurrentContent(nextItem);
      loadContent(nextItem);
      onContentChange?.(nextItem.id);
    }
  };

  const handlePrevious = () => {
    if (!currentContent) return;
    
    const prevItem = getPreviousItem(currentContent.id);
    if (prevItem) {
      setCurrentContent(prevItem);
      loadContent(prevItem);
      onContentChange?.(prevItem.id);
    }
  };


  if (!currentContent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading content...</div>
      </div>
    );
  }

  const navState = getNavigationState(currentContent.id);

  return (
    <div className="flex-1 flex flex-col">
      {/* Content Area */}
      <div className="flex-1 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
            title={currentContent.title}
          />
        )}
      </div>

      {/* Navigation Controls */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!navState.canGoPrevious}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
              ${navState.canGoPrevious
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>
              {navState.currentIndex + 1} of {navState.totalItems}
            </span>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((navState.currentIndex + 1) / navState.totalItems) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!navState.canGoNext}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
              ${navState.canGoNext
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Current Content Info */}
        <div className="mt-2 text-center">
          <div className="text-sm font-medium text-gray-900">
            {currentContent.title}
          </div>
          <div className="text-xs text-gray-500">
            {currentContent.section}
            {currentContent.subsection && ` • ${currentContent.subsection}`}
            {` • ${currentContent.type}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentViewer;