// Content caching service for offline support and performance
import { allContentItems } from '@/data/contentStructure';

export interface CacheEntry {
  content: string;
  timestamp: number;
  etag?: string;
  contentType: string;
  size: number;
}

export interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  lastCleanup: number;
}

class ContentCacheService {
  private static instance: ContentCacheService;
  private cacheHits = 0;
  private cacheRequests = 0;
  private readonly CACHE_NAME = 'training-content-v1';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  public static getInstance(): ContentCacheService {
    if (!ContentCacheService.instance) {
      ContentCacheService.instance = new ContentCacheService();
    }
    return ContentCacheService.instance;
  }

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    try {
      // Schedule periodic cleanup
      this.scheduleCleanup();
      
      // Preload critical content if service worker is available
      if ('serviceWorker' in navigator && 'caches' in window) {
        await this.preloadCriticalContent();
      }
    } catch (error) {
      console.warn('Cache initialization failed:', error);
    }
  }

  /**
   * Get content from cache, with fallback to network
   */
  async getContent(path: string): Promise<string | null> {
    this.cacheRequests++;

    try {
      // Try Cache API first
      if ('caches' in window) {
        const cached = await this.getCachedResponse(path);
        if (cached) {
          this.cacheHits++;
          return cached;
        }
      }

      // Fallback to localStorage
      const localCached = this.getFromLocalStorage(path);
      if (localCached) {
        this.cacheHits++;
        return localCached;
      }

      return null;
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * Cache content with size and age management
   */
  async cacheContent(path: string, content: string, headers?: Headers): Promise<void> {
    try {
      const contentType = headers?.get('content-type') || 'text/html';
      const etag = headers?.get('etag') || undefined;
      
      const cacheEntry: CacheEntry = {
        content,
        timestamp: Date.now(),
        etag,
        contentType,
        size: new Blob([content]).size
      };

      // Use Cache API if available
      if ('caches' in window) {
        await this.setCachedResponse(path, content, headers);
      }

      // Also store in localStorage for smaller items
      if (cacheEntry.size < 100 * 1024) { // 100KB limit for localStorage
        this.setInLocalStorage(path, cacheEntry);
      }

      // Trigger cleanup if cache is getting large
      const stats = await this.getCacheStats();
      if (stats.totalSize > this.MAX_CACHE_SIZE) {
        await this.performCleanup();
      }
    } catch (error) {
      console.warn('Content caching failed:', error);
    }
  }

  /**
   * Preload critical content (first few items in each section)
   */
  private async preloadCriticalContent(): Promise<void> {
    try {
      const criticalPaths: string[] = [];
      
      // Get first few items for preloading (critical content)
      const firstItems = allContentItems.slice(0, 10); // First 10 items
      firstItems.forEach(item => {
        if (item.filePath) {
          criticalPaths.push(item.filePath);
        }
      });

      // Preload in chunks to avoid overwhelming the network
      const chunkSize = 3;
      for (let i = 0; i < criticalPaths.length; i += chunkSize) {
        const chunk = criticalPaths.slice(i, i + chunkSize);
        await Promise.allSettled(
          chunk.map(path => this.preloadContent(path))
        );
        
        // Small delay between chunks
        if (i + chunkSize < criticalPaths.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (import.meta.env.DEV) console.log(`Preloaded ${criticalPaths.length} critical content items`);
    } catch (error) {
      console.warn('Critical content preloading failed:', error);
    }
  }

  /**
   * Preload a single content item
   */
  private async preloadContent(path: string): Promise<void> {
    try {
      // Skip if already cached
      const cached = await this.getContent(path);
      if (cached) return;

      const response = await fetch(path, ({ cache: 'force-cache', priority: 'low' } as any));

      if (response.ok) {
        const content = await response.text();
        await this.cacheContent(path, content, response.headers);
      }
    } catch (error) {
      // Silently fail for preloading - not critical
      console.debug(`Preload failed for ${path}:`, error);
    }
  }

  /**
   * Get cached response from Cache API
   */
  private async getCachedResponse(path: string): Promise<string | null> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(path);
      
      if (response) {
        // Check if response is still fresh
        const date = response.headers.get('date');
        if (date) {
          const responseTime = new Date(date).getTime();
          if (Date.now() - responseTime > this.MAX_AGE) {
            await cache.delete(path);
            return null;
          }
        }
        
        return await response.text();
      }
      
      return null;
    } catch (error) {
      console.debug('Cache API retrieval failed:', error);
      return null;
    }
  }

  /**
   * Set cached response in Cache API
   */
  private async setCachedResponse(path: string, content: string, headers?: Headers): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      
      const responseHeaders = new Headers(headers || {});
      responseHeaders.set('date', new Date().toISOString());
      responseHeaders.set('cache-control', 'max-age=604800'); // 1 week
      
      const response = new Response(content, {
        status: 200,
        statusText: 'OK',
        headers: responseHeaders
      });
      
      await cache.put(path, response);
    } catch (error) {
      console.debug('Cache API storage failed:', error);
    }
  }

  /**
   * Get content from localStorage
   */
  private getFromLocalStorage(path: string): string | null {
    try {
      const cacheKey = `content-${path}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        
        // Check if entry is still fresh
        if (Date.now() - entry.timestamp > this.MAX_AGE) {
          localStorage.removeItem(cacheKey);
          return null;
        }
        
        return entry.content;
      }
      
      return null;
    } catch (error) {
      console.debug('localStorage retrieval failed:', error);
      return null;
    }
  }

  /**
   * Set content in localStorage
   */
  private setInLocalStorage(path: string, entry: CacheEntry): void {
    try {
      const cacheKey = `content-${path}`;
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded errors
      if (error instanceof DOMException && error.code === 22) {
        console.warn('localStorage quota exceeded, cleaning up...');
        this.cleanupLocalStorage();
        
        // Try again after cleanup
        try {
          const cacheKey = `content-${path}`;
          localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (retryError) {
          console.error('Failed to cache after cleanup:', retryError);
        }
      } else {
        console.debug('localStorage storage failed:', error);
      }
    }
  }

  /**
   * Clean up expired localStorage entries
   */
  private cleanupLocalStorage(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('content-')) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const entry: CacheEntry = JSON.parse(cached);
              if (Date.now() - entry.timestamp > this.MAX_AGE) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            // Remove corrupted entries
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      if (import.meta.env.DEV) console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
    } catch (error) {
      console.error('localStorage cleanup failed:', error);
    }
  }

  /**
   * Perform full cache cleanup
   */
  async performCleanup(): Promise<void> {
    try {
      // Clean localStorage
      this.cleanupLocalStorage();
      
      // Clean Cache API
      if ('caches' in window) {
        const cache = await caches.open(this.CACHE_NAME);
        const requests = await cache.keys();
        
        const toDelete: Request[] = [];
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const date = response.headers.get('date');
            if (date) {
              const responseTime = new Date(date).getTime();
              if (Date.now() - responseTime > this.MAX_AGE) {
                toDelete.push(request);
              }
            }
          }
        }
        
        await Promise.all(toDelete.map(request => cache.delete(request)));
        if (import.meta.env.DEV) console.log(`Cleaned up ${toDelete.length} expired cache API entries`);
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      let totalSize = 0;
      let entryCount = 0;

      // Count localStorage entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('content-')) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const entry: CacheEntry = JSON.parse(cached);
              totalSize += entry.size;
              entryCount++;
            }
          } catch (error) {
            // Skip corrupted entries
          }
        }
      }

      // Estimate Cache API size (rough approximation)
      if ('caches' in window) {
        const cache = await caches.open(this.CACHE_NAME);
        const requests = await cache.keys();
        entryCount += requests.length;
        // Rough estimate: 20KB average per cached response
        totalSize += requests.length * 20 * 1024;
      }

      const hitRate = this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0;

      return {
        totalSize,
        entryCount,
        hitRate,
        lastCleanup: Date.now()
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalSize: 0,
        entryCount: 0,
        hitRate: 0,
        lastCleanup: 0
      };
    }
  }

  /**
   * Clear all cached content
   */
  async clearCache(): Promise<void> {
    try {
      // Clear localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('content-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear Cache API
      if ('caches' in window) {
        await caches.delete(this.CACHE_NAME);
      }

      // Reset stats
      this.cacheHits = 0;
      this.cacheRequests = 0;

      if (import.meta.env.DEV) console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

// Export singleton instance
export const contentCache = ContentCacheService.getInstance();

// Initialize cache when module is loaded
if (typeof window !== 'undefined') {
  contentCache.initialize().catch(console.error);
}
