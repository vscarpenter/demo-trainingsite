import React from 'react';
import { FileText, BookOpen, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { contentSections, allContentItems } from '../data/contentStructure';
import { ContentItem } from '../types/content';

interface ContentOutlineProps {
  currentContentId?: string;
  onContentSelect?: (contentId: string) => void;
}

const ContentOutline: React.FC<ContentOutlineProps> = ({
  currentContentId,
  onContentSelect
}) => {
  // Group items by subsection within each section
  const groupedSections = React.useMemo(() => {
    return contentSections.map(section => {
      const groupedItems = section.items.reduce((acc, item) => {
        const key = item.subsection || 'main';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, ContentItem[]>);
      return { ...section, groupedItems };
    });
  }, []);

  // Simplified navigation - no persistence needed

  const isSubsectionActive = React.useCallback((subsectionItems: ContentItem[]) =>
    subsectionItems.some(item => item.id === currentContentId)
  , [currentContentId]);

  const isSectionActive = React.useCallback((section: { groupedItems: Record<string, ContentItem[]> }) =>
    Object.values(section.groupedItems).some(items => isSubsectionActive(items))
  , [isSubsectionActive]);

  // Simplified: Only show current section expanded, others collapsed
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    
    // Find current section
    let currentSectionId: string | null = null;
    if (currentContentId) {
      for (const sec of groupedSections) {
        const contains = Object.values(sec.groupedItems).some(items =>
          items.some(i => i.id === currentContentId)
        );
        if (contains) { 
          currentSectionId = sec.id; 
          break; 
        }
      }
    }
    
    // Only expand current section, or first section if none
    groupedSections.forEach((sec, idx) => {
      init[sec.id] = sec.id === currentSectionId || (idx === 0 && !currentSectionId);
    });
    
    return init;
  });

  // Simplified: Only show current subsection expanded
  const [expandedSubsections, setExpandedSubsections] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    
    // Find current subsection
    let currentSubsectionKey: string | null = null;
    if (currentContentId) {
      for (const sec of groupedSections) {
        for (const [subKey, items] of Object.entries(sec.groupedItems)) {
          if (items.some(i => i.id === currentContentId)) {
            currentSubsectionKey = `${sec.id}::${subKey}`;
            break;
          }
        }
        if (currentSubsectionKey) break;
      }
    }
    
    // Only expand current subsection
    groupedSections.forEach(sec => {
      Object.keys(sec.groupedItems).forEach(subKey => {
        const key = `${sec.id}::${subKey}`;
        init[key] = key === currentSubsectionKey;
      });
    });
    
    return init;
  });

  // Simplified navigation - no persistence needed

  // Keep expansion in sync when currentContentId changes (e.g., via Next/Prev or Search)
  const didMountRef = React.useRef(false);
  React.useEffect(() => {
    if (!didMountRef.current) {
      // On initial mount, we already opened first section (or restored state). Do not override here.
      didMountRef.current = true;
      return;
    }
    
    // Find the current section and subsection
    let currentSectionId: string | null = null;
    let currentSubsectionKey: string | null = null;
    
    if (currentContentId) {
      for (const sec of groupedSections) {
        for (const [subKey, items] of Object.entries(sec.groupedItems)) {
          if (items.some(i => i.id === currentContentId)) {
            currentSectionId = sec.id;
            currentSubsectionKey = `${sec.id}::${subKey}`;
            break;
          }
        }
        if (currentSectionId) break;
      }
    }
    
    // Update sections - close all, open only current
    setExpandedSections(() => {
      const next: Record<string, boolean> = {};
      groupedSections.forEach(sec => {
        next[sec.id] = sec.id === currentSectionId;
      });
      return next;
    });
    
    // Update subsections - close all, open only current
    setExpandedSubsections(() => {
      const next: Record<string, boolean> = {};
      groupedSections.forEach(sec => {
        Object.keys(sec.groupedItems).forEach(subKey => {
          const key = `${sec.id}::${subKey}`;
          next[key] = key === currentSubsectionKey;
        });
      });
      return next;
    });
  }, [currentContentId, groupedSections]);

  // Simplified: Only one section open at a time
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newState: Record<string, boolean> = {};
      // Close all sections first
      groupedSections.forEach(sec => {
        newState[sec.id] = false;
      });
      // Open only the clicked section if it wasn't already open
      if (!prev[sectionId]) {
        newState[sectionId] = true;
      }
      return newState;
    });
  };

  // Simplified: Only one subsection open at a time within a section
  const toggleSubsection = (sectionId: string, subKey: string) => {
    const key = `${sectionId}::${subKey}`;
    setExpandedSubsections(prev => {
      const newState = { ...prev };
      
      // Close all subsections in this section first
      const section = groupedSections.find(s => s.id === sectionId);
      if (section) {
        Object.keys(section.groupedItems).forEach(sub => {
          newState[`${sectionId}::${sub}`] = false;
        });
      }
      
      // Open only the clicked subsection if it wasn't already open
      if (!prev[key]) {
        newState[key] = true;
      }
      
      return newState;
    });
  };

  return (
    <div className="space-y-2">
      {groupedSections.map((section) => {
        const sectionExpanded = expandedSections[section.id];
        const totalItems = Object.values(section.groupedItems).flat().length;
        const isActive = isSectionActive(section);
        
        return (
          <div key={section.id}>
            {/* Section header (collapsible) */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              aria-expanded={!!sectionExpanded}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors
                ${isActive 
                  ? 'bg-ms-blue/10 border border-ms-blue/20 text-ms-blue' 
                  : 'text-foreground hover:bg-muted'
                } focus:outline-none focus:ring-2 focus:ring-ms-blue/20`}
            >
              <span className="flex items-center space-x-2">
                {sectionExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate">{section.title}</span>
              </span>
              <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {totalItems}
              </span>
            </button>

            {/* Subsections */}
            {sectionExpanded && (
              <div className="mt-1 pl-4 space-y-1">
                {Object.entries(section.groupedItems).map(([subsectionKey, items]) => {
                  const isMainSection = subsectionKey === 'main';
                  const subsectionName = isMainSection ? 'Introduction' : subsectionKey;
                  const isActive = isSubsectionActive(items);
                  const subKey = `${section.id}::${subsectionKey}`;
                  const isOpen = !!expandedSubsections[subKey];

                  return (
                    <div key={subKey}>
                      <button
                        type="button"
                        onClick={() => toggleSubsection(section.id, subsectionKey)}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors
                          hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ms-blue/20
                          ${isActive ? 'bg-ms-blue/10 border border-ms-blue/20 text-ms-blue' : 'text-foreground'}`}
                      >
                        <span className="flex items-center space-x-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={`${isMainSection ? 'text-green-500' : 'text-ms-blue'}`}>
                            {isMainSection ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </span>
                          <span className="truncate font-medium">{subsectionName}</span>
                        </span>
                        <span className="ml-2 text-[10px] text-muted-foreground">{items.length}</span>
                      </button>

                      {/* Items list */}
                      {isOpen && (
                        <ul className="mt-1 mb-2 ml-8 space-y-1">
                          {items.map(item => {
                            const activeItem = item.id === currentContentId;
                            const globalIndex = allContentItems.findIndex(i => i.id === item.id);
                            const currentIndex = currentContentId ? allContentItems.findIndex(i => i.id === currentContentId) : -1;
                            const isCompleted = currentIndex >= 0 && globalIndex >= 0 && globalIndex <= currentIndex;
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => onContentSelect?.(item.id)}
                                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center justify-between
                                    hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ms-blue/20
                                    ${activeItem ? 'bg-ms-blue/10 text-ms-blue' : 'text-foreground'}`}
                                >
                                  <span className="truncate block">{item.title}</span>
                                  <span className="ml-2 shrink-0">
                                    {isCompleted && (
                                      <Check className={`h-3.5 w-3.5 ${activeItem ? 'text-ms-blue' : 'text-muted-foreground'}`} />
                                    )}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(ContentOutline);
