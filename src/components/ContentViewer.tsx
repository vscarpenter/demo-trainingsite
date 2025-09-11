import React, { useState, useEffect } from 'react';
// Icons retained minimal; chevrons no longer used
import { ContentItem } from '../types/content';
import { allContentItems, getNavigationState, getNextItem, getPreviousItem } from '../data/contentStructure';

interface ContentViewerProps {
  currentContentId?: string;
  onContentChange?: (contentId: string) => void;
}

// Simple in-memory cache of fetched HTML by filePath
const htmlCache = new Map<string, string>();

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
      // Serve from cache if present
      if (htmlCache.has(content.filePath)) {
        setHtmlContent(htmlCache.get(content.filePath) || '');
        setLoading(false);
        return;
      }

      const response = await fetch(content.filePath);
      if (response.ok) {
        const html = await response.text();
        const basePath = content.filePath.substring(0, content.filePath.lastIndexOf('/') + 1);
        const withBase = html.replace(/<head([^>]*)>/i, `<head$1><base href="${basePath}">`);
        const fixedHtml = withBase
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<a[^>]*href=['\"][^'\"]*index\.html['\"][^>]*>[\s\S]*?<\/a>/gi, '');
        htmlCache.set(content.filePath, fixedHtml);
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

  // Prefetch helper for adjacent items
  const prefetchFile = async (filePath: string) => {
    if (!filePath || htmlCache.has(filePath)) return;
    // Avoid prefetch if user enabled Data Saver
    // @ts-ignore
    if (navigator?.connection?.saveData) return;
    try {
      const res = await fetch(filePath);
      if (res.ok) {
        const html = await res.text();
        const basePath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        const withBase = html.replace(/<head([^>]*)>/i, `<head$1><base href="${basePath}">`);
        const fixedHtml = withBase
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<a[^>]*href=['\"][^'\"]*index\.html['\"][^>]*>[\s\S]*?<\/a>/gi, '');
        htmlCache.set(filePath, fixedHtml);
      }
    } catch {}
  };

  // When current item changes, prefetch next and (idle) previous
  useEffect(() => {
    if (!currentContent) return;
    const next = getNextItem(currentContent.id);
    const prev = getPreviousItem(currentContent.id);
    if (next) prefetchFile(next.filePath);
    if (prev) {
      if ('requestIdleCallback' in window) {
        // @ts-ignore
        requestIdleCallback(() => prefetchFile(prev.filePath));
      } else {
        setTimeout(() => prefetchFile(prev.filePath), 500);
      }
    }
  }, [currentContent?.id]);

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
            loading="lazy"
            title={currentContent.title}
          />
        )}
      </div>

      {/* Navigation Controls - slim bar inspired by Viva */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="progress-bar h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((navState.currentIndex + 1) / navState.totalItems) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-[12px] text-gray-600 whitespace-nowrap">
            {navState.currentIndex + 1} / {navState.totalItems}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handlePrevious}
              disabled={!navState.canGoPrevious}
              className={`px-3 py-1.5 text-[12px] uppercase tracking-wide rounded-md border transition-colors
                ${navState.canGoPrevious ? 'border-gray-300 text-gray-800 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Prev
            </button>
            <button
              onClick={handleNext}
              disabled={!navState.canGoNext}
              className={`px-3 py-1.5 text-[12px] uppercase tracking-wide rounded-md border transition-colors ml-1
                ${navState.canGoNext ? 'border-ms-blue text-ms-blue hover:bg-blue-50' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentViewer;
