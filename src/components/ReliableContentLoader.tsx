import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { fetchWithNetworkAwareness } from '@/lib/networkStatus';
import { useNetworkStatusEffects } from './NetworkStatusIndicator';
import { cn } from '@/lib/utils';

interface ReliableContentLoaderProps {
  contentPath: string;
  fallbackContent?: string;
  maxRetries?: number;
  retryDelay?: number;
  className?: string;
  onError?: (error: Error) => void;
  onSuccess?: (content: string) => void;
  children?: (props: {
    content: string | null;
    loading: boolean;
    error: Error | null;
    retry: () => void;
    retryCount: number;
  }) => React.ReactNode;
}

interface LoadingState {
  loading: boolean;
  error: Error | null;
  content: string | null;
  retryCount: number;
}

export const ReliableContentLoader: React.FC<ReliableContentLoaderProps> = ({
  contentPath,
  fallbackContent,
  maxRetries = 3,
  retryDelay = 1000,
  className,
  onError,
  onSuccess,
  children
}) => {
  const [state, setState] = useState<LoadingState>({
    loading: true,
    error: null,
    content: null,
    retryCount: 0
  });

  const networkStatus = useNetworkStatusEffects();

  const loadContent = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        retryCount: prev.retryCount + 1
      }));
    } else {
      setState({
        loading: true,
        error: null,
        content: null,
        retryCount: 0
      });
    }

    try {
      // Use network-aware fetch with automatic retries
      const response = await fetchWithNetworkAwareness(contentPath, {
        cache: 'force-cache', // Use cache when possible for reliability
        headers: {
          'Accept': 'text/html,application/xhtml+xml,text/plain,*/*'
        }
      }, {
        maxRetries: maxRetries,
        backoffMs: retryDelay
      });

      const content = await response.text();

      // Validate content is not empty or just whitespace
      if (!content.trim()) {
        throw new Error('Content is empty');
      }

      // Basic HTML validation
      if (contentPath.endsWith('.html')) {
        if (!content.includes('<') || content.length < 50) {
          console.warn('Content may be malformed HTML');
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        content,
        error: null
      }));

      onSuccess?.(content);

    } catch (error) {
      const errorObj = error as Error;
      console.error('Content loading failed:', errorObj);

      // Try to use cached content if available
      const cachedContent = await tryGetCachedContent(contentPath);
      if (cachedContent) {
        console.warn('Using cached content as fallback');
        setState(prev => ({
          ...prev,
          loading: false,
          content: cachedContent,
          error: null
        }));
        return;
      }

      // Use fallback content if provided
      if (fallbackContent) {
        console.warn('Using provided fallback content');
        setState(prev => ({
          ...prev,
          loading: false,
          content: fallbackContent,
          error: errorObj
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj
      }));

      onError?.(errorObj);
    }
  }, [contentPath, fallbackContent, maxRetries, retryDelay, onError, onSuccess]);

  // Load content on mount and when path changes
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Retry when network comes back online
  useEffect(() => {
    if (networkStatus.isOnline && !networkStatus.isRecovering && state.error) {
      if (import.meta.env.DEV) console.warn('Network recovered, retrying content load');
      loadContent(true);
    }
  }, [networkStatus.isOnline, networkStatus.isRecovering, state.error, loadContent]);

  const handleRetry = () => {
    if (state.retryCount < maxRetries) {
      loadContent(true);
    }
  };

  // If children render prop is provided, use it
  if (children) {
    return (
      <div className={className}>
        {children({
          content: state.content,
          loading: state.loading,
          error: state.error,
          retry: handleRetry,
          retryCount: state.retryCount
        })}
      </div>
    );
  }

  // Default rendering logic
  if (state.loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading content...
            {networkStatus.shouldOptimizeForSpeed && (
              <span className="block text-sm text-yellow-500 mt-1">
                Slow connection detected - this may take longer
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (state.error && !state.content) {
    return (
      <div className={cn('bg-destructive/10 border border-destructive/20 rounded-lg p-6', className)}>
        <div className="flex items-start">
          <AlertCircle className="w-6 h-6 text-destructive mt-1 flex-shrink-0" />
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-destructive mb-2">
              Content Loading Failed
            </h3>
            <p className="text-destructive/80 mb-4">
              {getErrorMessage(state.error, networkStatus.isOnline)}
            </p>
            
            {!networkStatus.isOnline && (
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3 mb-4">
                <p className="text-sm text-destructive">
                  You're currently offline. Content will load automatically when your connection is restored.
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button 
                onClick={handleRetry}
                size="sm"
                disabled={state.retryCount >= maxRetries || !networkStatus.isOnline}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {state.retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again'}
              </Button>
              
              {state.retryCount > 0 && (
                <span className="text-sm text-red-600 self-center">
                  Attempt {state.retryCount + 1} of {maxRetries + 1}
                </span>
              )}
            </div>

            {import.meta.env.DEV && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-red-600">Error Details</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                  {state.error.stack || state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.content) {
    return (
      <div className={className}>
        {state.error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Using fallback content due to loading issues
              </span>
            </div>
          </div>
        )}
        
        <div 
          dangerouslySetInnerHTML={{ __html: state.content }}
          className="content-viewer"
        />
      </div>
    );
  }

  return null;
};

// Helper function to try getting cached content
async function tryGetCachedContent(contentPath: string): Promise<string | null> {
  try {
    // Try to get from cache API if available
    if ('caches' in window) {
      const cache = await caches.open('content-cache');
      const response = await cache.match(contentPath);
      if (response) {
        return await response.text();
      }
    }

    // Fallback to localStorage for small content
    const cacheKey = `content-cache-${contentPath}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is not too old (1 hour)
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed.content;
      }
    }
  } catch (error) {
    console.warn('Failed to retrieve cached content:', error);
  }

  return null;
}

// Helper function to provide user-friendly error messages
function getErrorMessage(error: Error, isOnline: boolean): string {
  if (!isOnline) {
    return 'Unable to load content while offline. Please check your internet connection.';
  }

  if (error.message.includes('404') || error.message.includes('Not Found')) {
    return 'The requested content could not be found. It may have been moved or deleted.';
  }

  if (error.message.includes('403') || error.message.includes('Forbidden')) {
    return 'You do not have permission to access this content.';
  }

  if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
    return 'There is a problem with the server. Please try again later.';
  }

  if (error.message.includes('timeout') || error.message.includes('aborted')) {
    return 'The content is taking too long to load. This might be due to a slow connection.';
  }

  if (error.message.includes('Network offline')) {
    return 'No internet connection detected. Content will load when you\'re back online.';
  }

  return `Unable to load content: ${error.message}`;
}

export default ReliableContentLoader;
