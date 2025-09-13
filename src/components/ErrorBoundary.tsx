import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging (in development)
    if (import.meta.env.DEV) {
      console.error('Error Boundary Details', {
        error,
        errorInfo,
        componentStack: errorInfo.componentStack,
        context: this.props.context || 'Unknown',
      });
    }

    // Report error to monitoring service (if implemented)
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you'd send this to your error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      level: this.props.level,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Store in localStorage for debugging (development only)
    if (import.meta.env.DEV) {
      try {
        const existingErrors = JSON.parse(localStorage.getItem('error-reports') || '[]');
        existingErrors.push(errorReport);
        // Keep only last 10 errors
        if (existingErrors.length > 10) {
          existingErrors.splice(0, existingErrors.length - 10);
        }
        localStorage.setItem('error-reports', JSON.stringify(existingErrors));
      } catch (e) {
        console.warn('Failed to store error report:', e);
      }
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    if (retryCount >= maxRetries) {
      return;
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount) * 1000;
    
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }, delay);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderError() {
    const { level = 'component' } = this.props;

    // Different error UI based on level
    switch (level) {
      case 'page':
        return this.renderPageError();
      case 'section':
        return this.renderSectionError();
      default:
        return this.renderComponentError();
    }
  }

  private renderPageError() {
    const { error } = this.state;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error while loading this page. 
              Don't worry, your progress has been saved.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={this.handleRetry} 
              className="w-full"
              disabled={!this.canRetry()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={this.handleRefresh} 
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button 
              onClick={this.handleGoHome} 
              variant="ghost" 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>

          {import.meta.env.DEV && error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                <Bug className="w-4 h-4 inline mr-1" />
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  private renderSectionError() {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mx-4 my-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-red-800">
              Section Unavailable
            </h3>
            <p className="mt-1 text-red-700">
              This section couldn't be loaded. This might be due to a temporary issue.
            </p>
            <div className="mt-4 flex space-x-3">
              <Button 
                onClick={this.handleRetry} 
                size="sm"
                disabled={!this.canRetry()}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
              <Button 
                onClick={this.handleReset} 
                variant="outline" 
                size="sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderComponentError() {
    const { context } = this.props;
    
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 m-2">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800">
              {context ? `${context} Error` : 'Component Error'}
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              This component failed to load properly.
            </p>
          </div>
          <Button 
            onClick={this.handleRetry} 
            size="sm" 
            variant="outline"
            disabled={!this.canRetry()}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  private canRetry(): boolean {
    return this.state.retryCount < 3;
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || this.renderError();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
