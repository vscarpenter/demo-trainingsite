
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { Suspense, lazy } from 'react';
import './styles/globals.css';
import { allContentItems, getNextItem, getPreviousItem, getFirstItem, getLastItem } from './data/contentStructure';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [currentContentId, setCurrentContentId] = useState<string>(() => {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('id') || '';
      const fromHash = !fromQuery && url.hash ? url.hash.replace(/^#/, '') : '';
      const fromStorage = localStorage.getItem('currentContentId') || '';
      const fallback = allContentItems[0]?.id || '';
      return fromQuery || fromHash || fromStorage || fallback;
    } catch {
      return '';
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Initialize theme from settings on app load
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        const root = document.documentElement;
        
        // Apply theme
        if (settings.theme === 'dark') {
          root.classList.add('dark');
        } else if (settings.theme === 'light') {
          root.classList.remove('dark');
        } else {
          // Auto - use system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }

        // Apply font size
        root.style.fontSize = settings.fontSize === 'small' ? '14px' : 
                             settings.fontSize === 'large' ? '18px' : '16px';

        // Apply high contrast
        if (settings.highContrast) {
          root.classList.add('high-contrast');
        } else {
          root.classList.remove('high-contrast');
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    }
  }, []);

  // Listen for history changes to update currentContentId
  useEffect(() => {
    const onPopState = () => {
      const u = new URL(window.location.href);
      const id = u.searchParams.get('id') || (u.hash ? u.hash.replace(/^#/, '') : '');
      if (id) setCurrentContentId(id);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleContentChange = (contentId: string) => {
    setCurrentContentId(contentId);
    const url = new URL(window.location.href);
    url.searchParams.set('id', contentId);
    window.history.pushState({}, '', url.toString());
    try {
      localStorage.setItem('currentContentId', contentId);
    } catch {}
  };

  // Handle global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't handle navigation keys if dialogs are open or if user is typing in an input
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA' ||
                            (document.activeElement as HTMLElement)?.contentEditable === 'true';
      
      // Escape key handling
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isHelpOpen) {
          setIsHelpOpen(false);
        } else {
          setIsSidebarOpen(false);
        }
        return;
      }
      
      // Ctrl+K for search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Don't handle content navigation if dialogs are open or input is focused
      if (isSearchOpen || isHelpOpen || isInputFocused) {
        return;
      }

      // Content navigation shortcuts
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        const nextItem = getNextItem(currentContentId);
        if (nextItem) {
          handleContentChange(nextItem.id);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevItem = getPreviousItem(currentContentId);
        if (prevItem) {
          handleContentChange(prevItem.id);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        const firstItem = getFirstItem();
        if (firstItem) {
          handleContentChange(firstItem.id);
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        const lastItem = getLastItem();
        if (lastItem) {
          handleContentChange(lastItem.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSearchOpen, isHelpOpen, currentContentId]);

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-background font-geist">
        {/* Network Status Indicator */}
        <NetworkStatusIndicator 
          position="top-right"
          className="z-50"
        />
        
        {/* Top Header */}
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(s => !s)} 
          isSidebarOpen={isSidebarOpen}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {/* Mobile: off-canvas; Desktop: static */}
        <div
          id="app-sidebar"
          className={
            `md:static md:translate-x-0 md:w-80 md:flex-shrink-0 md:h-auto md:shadow-none
            fixed top-12 left-0 z-30 w-80 h-[calc(100vh-3rem)] bg-card shadow-lg transform transition-transform duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} `
          }
          aria-hidden={!isSidebarOpen && window.innerWidth < 768}
        >
          <Sidebar 
            currentContentId={currentContentId}
            onContentSelect={handleContentChange}
          />
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 top-12 bg-black/30 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Content Viewer */}
          <ErrorBoundary>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">Loading content…</div>}>
              <ContentViewer 
                currentContentId={currentContentId}
                onContentChange={handleContentChange}
              />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

        {/* Enhanced Search Dialog */}
        {isSearchOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <EnhancedSearchDialog
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                contentItems={allContentItems}
                onSelectContent={handleContentChange}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Help Dialog */}
        {isHelpOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <HelpDialog
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}
const ContentViewer = lazy(() => import('./components/ContentViewer'));
const EnhancedSearchDialog = lazy(() => import('./components/EnhancedSearchDialog').then(module => ({ default: module.EnhancedSearchDialog })));
const HelpDialog = lazy(() => import('./components/HelpDialog'));

export default App;
