import React, { useState, useEffect } from 'react';
// Icons retained minimal; chevrons no longer used
import { ContentItem } from '../types/content';
import { allContentItems, getNavigationState, getNextItem, getPreviousItem } from '../data/contentStructure';
import ReliableContentLoader from './ReliableContentLoader';
import { contentCache } from '@/lib/contentCache';
import { useNetworkStatusEffects } from './NetworkStatusIndicator';

interface ContentViewerProps {
  currentContentId?: string;
  onContentChange?: (contentId: string) => void;
}

// We now use the contentCache service instead of this in-memory cache
// But we'll keep a small in-memory cache for the current session as a performance optimization
const htmlCache = new Map<string, string>();

// Non-standard fetch priority extension used by some browsers
interface RequestInitWithPriority extends RequestInit {
  priority?: 'high' | 'low' | 'auto';
}

const ContentViewer: React.FC<ContentViewerProps> = ({ 
  currentContentId, 
  onContentChange 
}) => {
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  // Loading is now handled by ReliableContentLoader
  const networkStatus = useNetworkStatusEffects();

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentContentId]);

  const loadContent = async (content: ContentItem) => {
    try {
      // First check in-memory cache for instant loading
      if (htmlCache.has(content.filePath)) {
        setHtmlContent(htmlCache.get(content.filePath) || '');
        return;
      }

      // Then try to load from contentCache service
      const cachedContent = await contentCache.getContent(content.filePath);
      if (cachedContent) {
        // Process HTML as before
        const basePath = content.filePath.substring(0, content.filePath.lastIndexOf('/') + 1);
        const withBase = cachedContent.replace(/<head([^>]*)>/i, `<head$1><base href="${basePath}">`);
        const processedHtml = processHtml(withBase, basePath);
        htmlCache.set(content.filePath, processedHtml);
        setHtmlContent(processedHtml);
        return;
      }

      // Not in any cache, load from network
      const fallbackHtml = generateFallbackHtml(content);
      
      // We'll let ReliableContentLoader handle the actual loading process now
      // and rely on its error/retry mechanisms
      // So we'll just show a loading state until it's ready
      setHtmlContent(fallbackHtml);
    } catch (error) {
      console.error('Error preparing content:', error);
      setHtmlContent(generateFallbackHtml(content));
    }
  };

  // Helper to process HTML content
  const processHtml = (html: string, basePath: string): string => {
    // Add base tag if not present with properly encoded URL
    const encodedBasePath = basePath.replace(/ /g, '%20');
    const withBase = html.includes('<base ') 
      ? html 
      : html.replace(/<head([^>]*)>/i, `<head$1><base href="${encodedBasePath}">`);
    
    // Fix video source paths to use absolute URLs
    // This is needed because srcDoc doesn't resolve relative paths correctly with base tags
    const fixedVideoPaths = withBase.replace(
      /<source([^>]*?)src=['"]([^'"]*?)['"]([^>]*?)>/gi, 
      (match, beforeSrc, srcValue, afterSrc) => {
        // If it's already an absolute URL, leave it as is
        if (srcValue.startsWith('http') || srcValue.startsWith('/')) {
          return match;
        }
        // Convert relative path to absolute path with proper encoding
        const absolutePath = (basePath + srcValue).replace(/ /g, '%20');
        return `<source${beforeSrc}src="${absolutePath}"${afterSrc}>`;
      }
    );
    
    // Also fix video tag src attributes (in case source tags aren't used)
    const fixedVideoSrc = fixedVideoPaths.replace(
      /<video([^>]*?)src=['"]([^'"]*?)['"]([^>]*?)>/gi,
      (match, beforeSrc, srcValue, afterSrc) => {
        // If it's already an absolute URL, leave it as is
        if (srcValue.startsWith('http') || srcValue.startsWith('/')) {
          return match;
        }
        // Convert relative path to absolute path with proper encoding
        const absolutePath = (basePath + srcValue).replace(/ /g, '%20');
        return `<video${beforeSrc}src="${absolutePath}"${afterSrc}>`;
      }
    );
    
    // Clean up unnecessary elements
    return fixedVideoSrc
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<a[^>]*href=['\"][^'\"]*index\.html['\"][^>]*>[\s\S]*?<\/a>/gi, '');
  };

  // Generate fallback HTML when content is not available
  const generateFallbackHtml = (content: ContentItem): string => {
    return `
      <div style="padding: 2rem; text-align: center; color: #666;">
        <h2>Content: ${content.title}</h2>
        <p>Loading content from: ${content.filePath}</p>
        <p>Type: ${content.type}</p>
        <p>Section: ${content.section}</p>
        ${content.subsection ? `<p>Subsection: ${content.subsection}</p>` : ''}
        ${!networkStatus.isOnline ? '<p><strong style="color: #e53e3e;">You are currently offline</strong></p>' : ''}
      </div>
    `;
  };

  // Handler for successful content load from ReliableContentLoader
  const handleContentLoaded = (content: string, filePath: string) => {
    try {
      const basePath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
      const processedHtml = processHtml(content, basePath);
      
      // Update caches
      htmlCache.set(filePath, processedHtml);
      contentCache.cacheContent(filePath, content).catch(console.error);
      
      setHtmlContent(processedHtml);
    } catch (error) {
      console.error('Error processing loaded content:', error);
    }
  };

  // Prefetch helper for adjacent items
  const prefetchFile = async (filePath: string) => {
    if (!filePath || htmlCache.has(filePath)) return;
    // Avoid prefetch if user enabled Data Saver or on slow connection
    if (networkStatus.shouldOptimizeForSpeed || networkStatus.saveData) return;
    
    try {
      // First check content cache
      const cachedContent = await contentCache.getContent(filePath);
      if (cachedContent) {
        const basePath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        const processedHtml = processHtml(cachedContent, basePath);
        htmlCache.set(filePath, processedHtml);
        return;
      }
      
      // Only prefetch if we're online and not in the middle of a recovery
      if (networkStatus.isOnline && !networkStatus.isRecovering) {
        // Use low priority for prefetch (non-standard; cast safely)
        const res = await fetch(filePath, { cache: 'force-cache', priority: 'low' } as RequestInitWithPriority);
        if (res.ok) {
          const html = await res.text();
          const basePath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
          const processedHtml = processHtml(html, basePath);
          
          // Store in both caches
          htmlCache.set(filePath, processedHtml);
          contentCache.cacheContent(filePath, html, res.headers).catch(console.error);
        }
      }
    } catch (error) {
      // Silently fail for prefetching
      console.warn(`Prefetch error for ${filePath}:`, error);
    }
  };

  // When current item changes, prefetch next and (idle) previous
  useEffect(() => {
    if (!currentContent) return;
    const next = getNextItem(currentContent.id);
    const prev = getPreviousItem(currentContent.id);
    if (next) prefetchFile(next.filePath);
    if (prev) {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => prefetchFile(prev.filePath));
      } else {
        setTimeout(() => prefetchFile(prev.filePath), 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="flex-1 bg-background overflow-hidden">
        {currentContent ? (
          <ReliableContentLoader
            contentPath={currentContent.filePath}
            fallbackContent={htmlContent}
            maxRetries={3}
            retryDelay={1000}
            className="w-full h-full"
            onSuccess={(content) => handleContentLoaded(content, currentContent.filePath)}
          >
            {({ content, loading }) => {
              // Process content to fix video paths if we have raw content from ReliableContentLoader
              let processedContent = content || htmlContent;

              if (content && currentContent) {
                const basePath = currentContent.filePath.substring(0, currentContent.filePath.lastIndexOf('/') + 1);
                // Always process content (don't skip if cached)
                processedContent = processHtml(content, basePath);

                // Cache the processed content
                htmlCache.set(currentContent.filePath, processedContent);

                if (import.meta.env.DEV) {
                  console.warn('Processed content for:', currentContent.filePath);
                  console.warn('Encoded path present:', processedContent.includes('%20'));
                }
              } else {
                if (import.meta.env.DEV) console.warn('Using fallback content or no content to process');
              }

              return (
                <div className="h-full">
                  {loading && !content ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500">Loading...</div>
                    </div>
                  ) : (
                    <iframe
                      srcDoc={processedContent}
                      className="w-full h-full border-none"
                      // Note: allow-scripts + allow-same-origin can escape sandboxing but is needed for:
                      // - Video playbook (allow-same-origin for loading video files)
                      // - Interactive content functionality (allow-scripts)
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      loading="lazy"
                      title={currentContent.title}
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  )}
                </div>
              );
            }}
          </ReliableContentLoader>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading content...</div>
          </div>
        )}
      </div>

      {/* Navigation Controls - slim bar inspired by Viva */}
      <div className="bg-card border-t border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="progress-bar h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((navState.currentIndex + 1) / navState.totalItems) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-[12px] text-muted-foreground whitespace-nowrap">
            {navState.currentIndex + 1} / {navState.totalItems}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handlePrevious}
              disabled={!navState.canGoPrevious}
              className={`px-3 py-1.5 text-[12px] uppercase tracking-wide rounded-md border transition-colors
                ${navState.canGoPrevious ? 'border-border text-foreground hover:bg-muted' : 'border-muted text-muted-foreground cursor-not-allowed'}`}
            >
              Prev
            </button>
            <button
              onClick={handleNext}
              disabled={!navState.canGoNext}
              className={`px-3 py-1.5 text-[12px] uppercase tracking-wide rounded-md border transition-colors ml-1
                ${navState.canGoNext ? 'border-ms-blue text-ms-blue hover:bg-ms-blue/10' : 'border-muted text-muted-foreground cursor-not-allowed'}`}
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
