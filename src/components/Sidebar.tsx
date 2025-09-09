import React, { useRef } from 'react';
import { Menu, FileText, BookOpen } from 'lucide-react';
import ContentOutline from './ContentOutline';
import { getNavigationState, allContentItems } from '@/data/contentStructure';

interface SidebarProps {
  currentContentId?: string;
  onContentSelect?: (contentId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentContentId, onContentSelect }) => {
  const [activeTab, setActiveTab] = React.useState('MENU');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const tabs = [
    { id: 'MENU', label: 'MENU', icon: Menu },
    { id: 'TRANSCRIPT', label: 'TRANSCRIPT', icon: FileText },
    { id: 'RESOURCES', label: 'RESOURCES', icon: BookOpen },
  ];

  const onKeyDownTabs = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = tabs.map(t => t.id);
    const currentIndex = ids.indexOf(activeTab);
    if (e.key === 'ArrowRight') {
      const next = ids[(currentIndex + 1) % ids.length];
      setActiveTab(next);
      tabRefs.current[next]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      const prev = ids[(currentIndex - 1 + ids.length) % ids.length];
      setActiveTab(prev);
      tabRefs.current[prev]?.focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      const first = ids[0];
      setActiveTab(first);
      tabRefs.current[first]?.focus();
      e.preventDefault();
    } else if (e.key === 'End') {
      const last = ids[ids.length - 1];
      setActiveTab(last);
      tabRefs.current[last]?.focus();
      e.preventDefault();
    }
  };

  const navState = getNavigationState(currentContentId || allContentItems[0]?.id || '');
  const percent = Math.round(((navState.currentIndex + 1) / navState.totalItems) * 100);

  return (
    <aside className="w-80 bg-white sidebar-shadow flex flex-col h-full border-r border-gray-400">
      {/* Sidebar Header removed per request */}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex" role="tablist" aria-label="Sidebar Tabs" onKeyDown={onKeyDownTabs}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                onClick={() => setActiveTab(tab.id)}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`
                  flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-medium
                  transition-colors duration-200
                  ${
                    activeTab === tab.id
                      ? 'text-ms-blue border-b-2 border-ms-blue bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <section
            id="panel-MENU"
            role="tabpanel"
            aria-labelledby="tab-MENU"
            hidden={activeTab !== 'MENU'}
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Microsoft 365 Copilot Experience
            </h3>
            <ContentOutline 
              currentContentId={currentContentId}
              onContentSelect={onContentSelect}
            />
          </section>

          <section
            id="panel-TRANSCRIPT"
            role="tabpanel"
            aria-labelledby="tab-TRANSCRIPT"
            hidden={activeTab !== 'TRANSCRIPT'}
            className="text-sm text-gray-600"
          >
            <p>Coming Soon</p>
          </section>

          <section
            id="panel-RESOURCES"
            role="tabpanel"
            aria-labelledby="tab-RESOURCES"
            hidden={activeTab !== 'RESOURCES'}
            className="text-sm text-gray-600"
          >
            <p>Coming Soon</p>
          </section>
        </div>
      </div>

      {/* Progress Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="progress-bar h-2 rounded-full" style={{ width: `${percent}%` }}></div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {navState.currentIndex + 1} of {navState.totalItems} items viewed
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
