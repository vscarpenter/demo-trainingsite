// Network status detection and monitoring utilities

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'fast' | 'slow' | 'offline' | 'unknown';
  effectiveType: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface NetworkStatusCallbacks {
  onOnline?: () => void;
  onOffline?: () => void;
  onSlowConnection?: () => void;
  onFastConnection?: () => void;
}

class NetworkStatusManager {
  private callbacks: NetworkStatusCallbacks = {};
  private currentStatus: NetworkStatus;
  private listeners: Array<(status: NetworkStatus) => void> = [];

  constructor() {
    this.currentStatus = this.getInitialStatus();
    this.setupEventListeners();
  }

  private getInitialStatus(): NetworkStatus {
    const isOnline = navigator.onLine;
    
    // Check for Network Information API support
    const connection = this.getConnection();
    
    return {
      isOnline,
      connectionType: isOnline ? this.determineConnectionType(connection) : 'offline',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData
    };
  }

  private getConnection(): any {
    return (navigator as any).connection || 
           (navigator as any).mozConnection || 
           (navigator as any).webkitConnection;
  }

  private determineConnectionType(connection: any): 'fast' | 'slow' | 'unknown' {
    if (!connection) return 'unknown';

    // Use effective connection type if available
    if (connection.effectiveType) {
      const type = connection.effectiveType;
      if (type === 'slow-2g' || type === '2g') return 'slow';
      if (type === '3g') return 'slow';
      if (type === '4g') return 'fast';
    }

    // Use downlink speed if available (Mbps)
    if (connection.downlink !== undefined) {
      if (connection.downlink < 1.5) return 'slow';
      if (connection.downlink >= 1.5) return 'fast';
    }

    // Use RTT if available (ms)
    if (connection.rtt !== undefined) {
      if (connection.rtt > 300) return 'slow';
      if (connection.rtt <= 300) return 'fast';
    }

    return 'unknown';
  }

  private setupEventListeners() {
    // Online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Connection change events
    const connection = this.getConnection();
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange);
    }
  }

  private handleOnline = () => {
    const wasOffline = !this.currentStatus.isOnline;
    
    this.updateStatus({
      isOnline: true,
      connectionType: this.determineConnectionType(this.getConnection())
    });

    if (wasOffline) {
      if (import.meta.env.DEV) console.log('🟢 Network: Back online');
      this.callbacks.onOnline?.();
    }
  };

  private handleOffline = () => {
    const wasOnline = this.currentStatus.isOnline;
    
    this.updateStatus({
      isOnline: false,
      connectionType: 'offline'
    });

    if (wasOnline) {
      if (import.meta.env.DEV) console.log('🔴 Network: Gone offline');
      this.callbacks.onOffline?.();
    }
  };

  private handleConnectionChange = () => {
    const connection = this.getConnection();
    const newConnectionType = this.determineConnectionType(connection);
    const wasSlowConnection = this.currentStatus.connectionType === 'slow';
    const isFastConnection = newConnectionType === 'fast';
    const isSlowConnection = newConnectionType === 'slow';

    this.updateStatus({
      connectionType: newConnectionType,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData
    });

    // Notify about connection quality changes
    if (!wasSlowConnection && isSlowConnection) {
      if (import.meta.env.DEV) console.log('🟡 Network: Connection became slow');
      this.callbacks.onSlowConnection?.();
    } else if (wasSlowConnection && isFastConnection) {
      if (import.meta.env.DEV) console.log('🟢 Network: Connection became fast');
      this.callbacks.onFastConnection?.();
    }
  };

  private updateStatus(partial: Partial<NetworkStatus>) {
    // Store old status for comparison if needed in the future
    this.currentStatus = { ...this.currentStatus, ...partial };

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public isOnline(): boolean {
    return this.currentStatus.isOnline;
  }

  public isSlowConnection(): boolean {
    return this.currentStatus.connectionType === 'slow';
  }

  public isFastConnection(): boolean {
    return this.currentStatus.connectionType === 'fast';
  }

  public shouldReduceDataUsage(): boolean {
    return this.currentStatus.saveData === true || this.isSlowConnection();
  }

  public setCallbacks(callbacks: NetworkStatusCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public addListener(listener: (status: NetworkStatus) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    const connection = this.getConnection();
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange);
    }

    this.listeners = [];
    this.callbacks = {};
  }
}

// Create singleton instance
export const networkStatus = new NetworkStatusManager();

// React hook for using network status in components
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(networkStatus.getStatus());

  useEffect(() => {
    const unsubscribe = networkStatus.addListener(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// Utility functions for common network checks
export function isOnline(): boolean {
  return networkStatus.isOnline();
}

export function isSlowConnection(): boolean {
  return networkStatus.isSlowConnection();
}

export function shouldOptimizeForSlowConnection(): boolean {
  return networkStatus.shouldReduceDataUsage();
}

// Network-aware fetch wrapper
export async function fetchWithNetworkAwareness(
  url: string, 
  options: RequestInit = {},
  retryOptions: { maxRetries?: number; backoffMs?: number } = {}
): Promise<Response> {
  const { maxRetries = 3, backoffMs = 1000 } = retryOptions;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we're online before attempting
      if (!networkStatus.isOnline()) {
        throw new Error('Network offline');
      }

      // Adjust timeout based on connection speed
      const timeoutMs = networkStatus.isSlowConnection() ? 30000 : 10000;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error) {
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt + 1} failed:`, error);

      // Don't retry on certain errors
      if (error instanceof TypeError && error.message.includes('aborted')) {
        break; // Request was aborted (timeout)
      }

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
