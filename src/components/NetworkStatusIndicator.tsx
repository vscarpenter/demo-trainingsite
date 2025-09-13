import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from '@/lib/networkStatus';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className,
  showDetails = false,
  position = 'top-right'
}) => {
  const networkStatus = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [lastOfflineTime, setLastOfflineTime] = useState<number | null>(null);

  // Show notification when network status changes
  useEffect(() => {
    if (!networkStatus.isOnline && !lastOfflineTime) {
      setLastOfflineTime(Date.now());
      setShowNotification(true);
      
      // Hide notification after 5 seconds
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    } else if (networkStatus.isOnline && lastOfflineTime) {
      setShowNotification(true);
      setLastOfflineTime(null);
      
      // Hide notification after 3 seconds
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOnline, lastOfflineTime]);

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }

    switch (networkStatus.connectionType) {
      case 'fast':
        return <Wifi className="w-4 h-4" />;
      case 'slow':
        return <Signal className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'text-red-500 bg-red-50 border-red-200';
    if (networkStatus.connectionType === 'slow') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) return 'Offline';
    if (networkStatus.connectionType === 'slow') return 'Slow Connection';
    if (networkStatus.connectionType === 'fast') return 'Online';
    return 'Online';
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const formatConnectionDetails = () => {
    const details = [];
    
    if (networkStatus.effectiveType !== 'unknown') {
      details.push(`Type: ${networkStatus.effectiveType.toUpperCase()}`);
    }
    
    if (networkStatus.downlink !== undefined) {
      details.push(`Speed: ${networkStatus.downlink} Mbps`);
    }
    
    if (networkStatus.rtt !== undefined) {
      details.push(`Latency: ${networkStatus.rtt}ms`);
    }
    
    if (networkStatus.saveData) {
      details.push('Data Saver: On');
    }
    
    return details;
  };

  return (
    <>
      {/* Main Status Indicator - Only show when offline or slow connection */}
      {(!networkStatus.isOnline || networkStatus.connectionType === 'slow') && (
        <div
          className={cn(
            'fixed z-50 flex items-center space-x-2 px-3 py-2 rounded-lg border backdrop-blur-sm',
            'transition-all duration-300 ease-in-out',
            getStatusColor(),
            getPositionClasses(),
            className
          )}
        >
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>

          {showDetails && (
            <div className="border-l border-gray-300 pl-3 ml-3">
              <div className="text-xs space-y-1">
                {formatConnectionDetails().map((detail, index) => (
                  <div key={index}>{detail}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Change Notification */}
      {showNotification && (
        <div 
          className={cn(
            'fixed z-50 flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg',
            'transition-all duration-300 ease-in-out transform',
            'bg-white border-l-4',
            networkStatus.isOnline 
              ? 'border-l-green-500 text-green-800' 
              : 'border-l-red-500 text-red-800',
            position.includes('top') ? 'top-16' : 'bottom-16',
            position.includes('right') ? 'right-4' : 'left-4'
          )}
        >
          {networkStatus.isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          
          <div className="flex-1">
            <div className="font-medium text-sm">
              {networkStatus.isOnline ? 'Back Online' : 'Connection Lost'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {networkStatus.isOnline 
                ? 'You can continue learning normally'
                : 'Some content may not load properly'
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Simple inline status indicator for use in components
export const InlineNetworkStatus: React.FC<{ className?: string }> = ({ className }) => {
  const networkStatus = useNetworkStatus();

  if (networkStatus.isOnline) return null;

  return (
    <div className={cn('flex items-center space-x-2 text-sm text-red-600', className)}>
      <WifiOff className="w-4 h-4" />
      <span>Offline - Some features may not work</span>
    </div>
  );
};

// Hook for components to react to network status
export function useNetworkStatusEffects() {
  const networkStatus = useNetworkStatus();
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (networkStatus.isOnline && isRecovering) {
      // Give a short delay for the network to stabilize
      const timer = setTimeout(() => setIsRecovering(false), 1000);
      return () => clearTimeout(timer);
    } else if (!networkStatus.isOnline) {
      setIsRecovering(true);
    }
  }, [networkStatus.isOnline, isRecovering]);

  return {
    ...networkStatus,
    isRecovering,
    shouldShowOfflineMessage: !networkStatus.isOnline,
    shouldOptimizeForSpeed: networkStatus.connectionType === 'slow',
    canLoadHeavyContent: networkStatus.connectionType === 'fast' && !networkStatus.saveData
  };
}