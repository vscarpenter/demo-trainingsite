import React from 'react';
import { FileText, BookOpen } from 'lucide-react';
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
  const getGroupedSections = () => {
    return contentSections.map(section => {
      const groupedItems = section.items.reduce((acc, item) => {
        const key = item.subsection || 'main';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {} as Record<string, ContentItem[]>);

      return {
        ...section,
        groupedItems
      };
    });
  };

  const handleSubsectionClick = (subsectionItems: ContentItem[]) => {
    // Select the first item in the subsection
    const firstItem = subsectionItems[0];
    if (firstItem) {
      onContentSelect?.(firstItem.id);
    }
  };

  const isSubsectionActive = (subsectionItems: ContentItem[]) => {
    return subsectionItems.some(item => item.id === currentContentId);
  };

  return (
    <div className="space-y-4">
      {getGroupedSections().map((section) => (
        <div key={section.id} className="space-y-2">
          {/* Section Header */}
          <div className="font-semibold text-gray-900 text-sm border-b border-gray-200 pb-1">
            {section.title}
          </div>
          
          {/* Subsections */}
          <div className="space-y-1">
            {Object.entries(section.groupedItems).map(([subsectionKey, items]) => {
              const isMainSection = subsectionKey === 'main';
              const subsectionName = isMainSection ? section.title : subsectionKey;
              const isActive = isSubsectionActive(items);
              
              return (
                <button
                  key={`${section.id}-${subsectionKey}`}
                  onClick={() => handleSubsectionClick(items)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-xs transition-all
                    hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${isActive 
                      ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                      : 'text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`${isMainSection ? 'text-green-600' : 'text-blue-600'}`}>
                      {isMainSection ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {isMainSection ? 'Introduction' : subsectionName}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentOutline;