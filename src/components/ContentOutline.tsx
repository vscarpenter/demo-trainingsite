import React from 'react';
import { FileText, BookOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { contentSections } from '../data/contentStructure';
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

  // -- Persistence helpers --
  const SECTIONS_KEY = 'sidebar:expandedSections';
  const SUBSECTIONS_KEY = 'sidebar:expandedSubsections';
  const readMap = (key: string): Record<string, boolean> | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') return obj as Record<string, boolean>;
      return null;
    } catch {
      return null;
    }
  };
  const writeMap = (key: string, value: Record<string, boolean>) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  const isSubsectionActive = (subsectionItems: ContentItem[]) =>
    subsectionItems.some(item => item.id === currentContentId);

  const isSectionActive = (section: { groupedItems: Record<string, ContentItem[]> }) =>
    Object.values(section.groupedItems).some(items => isSubsectionActive(items));

  // Manage expanded state for sections and subsections
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    const stored = readMap(SECTIONS_KEY);
    const init: Record<string, boolean> = {};
    // Determine which section contains the current item (for deep-links)
    let targetSectionId: string | null = null;
    if (!stored && currentContentId) {
      for (const sec of groupedSections) {
        const contains = Object.values(sec.groupedItems).some(items =>
          items.some(i => i.id === currentContentId)
        );
        if (contains) { targetSectionId = sec.id; break; }
      }
    }
    groupedSections.forEach((sec, idx) => {
      if (stored) {
        init[sec.id] = !!stored[sec.id];
      } else if (targetSectionId) {
        init[sec.id] = sec.id === targetSectionId;
      } else {
        init[sec.id] = idx === 0; // default open first section
      }
    });
    return init;
  });

  const [expandedSubsections, setExpandedSubsections] = React.useState<Record<string, boolean>>(() => {
    const stored = readMap(SUBSECTIONS_KEY);
    const init: Record<string, boolean> = {};
    let target: string | null = null;
    if (!stored && currentContentId) {
      for (const sec of groupedSections) {
        for (const [subKey, items] of Object.entries(sec.groupedItems)) {
          if (items.some(i => i.id === currentContentId)) {
            target = `${sec.id}::${subKey}`;
            break;
          }
        }
        if (target) break;
      }
    }
    groupedSections.forEach(sec => {
      Object.keys(sec.groupedItems).forEach(subKey => {
        const key = `${sec.id}::${subKey}`;
        if (stored) {
          init[key] = !!stored[key];
        } else if (target) {
          init[key] = key === target;
        } else {
          init[key] = false;
        }
      });
    });
    return init;
  });

  // Persist when changes occur
  React.useEffect(() => {
    writeMap(SECTIONS_KEY, expandedSections);
  }, [expandedSections]);
  React.useEffect(() => {
    writeMap(SUBSECTIONS_KEY, expandedSubsections);
  }, [expandedSubsections]);

  // Keep expansion in sync when currentContentId changes (e.g., via Next/Prev)
  const didMountRef = React.useRef(false);
  React.useEffect(() => {
    if (!didMountRef.current) {
      // On initial mount, we already opened first section (or restored state). Do not override here.
      didMountRef.current = true;
      return;
    }
    setExpandedSections(prev => {
      const next = { ...prev };
      groupedSections.forEach(sec => {
        if (isSectionActive(sec)) next[sec.id] = true;
      });
      return next;
    });
    setExpandedSubsections(prev => {
      const next = { ...prev };
      groupedSections.forEach(sec => {
        Object.entries(sec.groupedItems).forEach(([subKey, items]) => {
          const key = `${sec.id}::${subKey}`;
          if (isSubsectionActive(items)) next[key] = true;
        });
      });
      return next;
    });
  }, [currentContentId, groupedSections]);

  const toggleSection = (sectionId: string) =>
    setExpandedSections(s => ({ ...s, [sectionId]: !s[sectionId] }));

  const toggleSubsection = (sectionId: string, subKey: string) => {
    const key = `${sectionId}::${subKey}`;
    setExpandedSubsections(s => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div className="space-y-3">
      {/* Bulk expand/collapse controls */}
      <div className="flex items-center justify-end mb-1">
        {(() => {
          const allExpanded = Object.values(expandedSections).every(Boolean) && Object.values(expandedSubsections).every(Boolean);
          const label = allExpanded ? 'Collapse all' : 'Expand all';
          const handleToggleAll = () => {
            const nextVal = !allExpanded;
            setExpandedSections(() => {
              const m: Record<string, boolean> = {};
              groupedSections.forEach(sec => { m[sec.id] = nextVal; });
              return m;
            });
            setExpandedSubsections(() => {
              const m: Record<string, boolean> = {};
              groupedSections.forEach(sec => {
                Object.keys(sec.groupedItems).forEach(sub => { m[`${sec.id}::${sub}`] = nextVal; });
              });
              return m;
            });
          };
          return (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-xs text-ms-blue hover:underline px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`${label} sections and subsections`}
            >
              {label}
            </button>
          );
        })()}
      </div>
      {groupedSections.map((section) => {
        const sectionExpanded = expandedSections[section.id];
        return (
          <div key={section.id}>
            {/* Section header (collapsible) */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              aria-expanded={!!sectionExpanded}
              className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-sm font-semibold
                text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <span className="flex items-center space-x-2">
                {sectionExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span>{section.title}</span>
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
                          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${isActive ? 'bg-blue-50 border border-blue-200 text-blue-900' : 'text-gray-800'}`}
                      >
                        <span className="flex items-center space-x-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <span className={`${isMainSection ? 'text-green-600' : 'text-blue-600'}`}>
                            {isMainSection ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </span>
                          <span className="truncate font-medium">{subsectionName}</span>
                        </span>
                        <span className="ml-2 text-[10px] text-gray-500">{items.length}</span>
                      </button>

                      {/* Items list */}
                      {isOpen && (
                        <ul className="mt-1 mb-2 ml-8 space-y-1">
                          {items.map(item => {
                            const activeItem = item.id === currentContentId;
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => onContentSelect?.(item.id)}
                                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs
                                    hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                                    ${activeItem ? 'bg-blue-100 text-blue-900' : 'text-gray-700'}`}
                                >
                                  <span className="truncate block">{item.title}</span>
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
