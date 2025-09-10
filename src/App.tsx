
import { useEffect, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SearchDialog from './components/SearchDialog';
import HelpDialog from './components/HelpDialog';
import { Suspense, lazy } from 'react';
import './styles/globals.css';
import { allContentItems } from './data/contentStructure';

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
      // Escape key handling
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isHelpOpen) {
          setIsHelpOpen(false);
        } else {
          setIsSidebarOpen(false);
        }
      }
      
      // Ctrl+K for search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSearchOpen, isHelpOpen]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-geist">
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
            fixed top-12 left-0 z-30 w-80 h-[calc(100vh-3rem)] bg-white shadow-lg transform transition-transform duration-200 ease-in-out
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
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">Loading content…</div>}>
            <ContentViewer 
              currentContentId={currentContentId}
              onContentChange={handleContentChange}
            />
          </Suspense>
        </main>
      </div>

      {/* Search Dialog */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        contentItems={allContentItems}
        onSelectContent={handleContentChange}
      />

      {/* Help Dialog */}
      <HelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
const ContentViewer = lazy(() => import('./components/ContentViewer'));

export default App;
