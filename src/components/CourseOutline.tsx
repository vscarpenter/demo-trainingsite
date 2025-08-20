import React from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle } from 'lucide-react';

interface CourseItem {
  id: number;
  title: string;
  completed?: boolean;
  active?: boolean;
  highlighted?: boolean;
}

const courseItems: CourseItem[] = [
  { id: 1, title: 'Welcome', completed: true },
  { id: 2, title: 'Human firewall', completed: true },
  { id: 3, title: 'Artificial intelligence', completed: true },
  { id: 4, title: 'Preventing attacks', completed: true },
  { id: 5, title: 'Identity protection', completed: true },
  { id: 6, title: 'Taking action', completed: true },
  { id: 7, title: 'Secure Future Initiative', completed: true },
  { id: 8, title: 'Call to action', completed: true },
  { id: 9, title: 'Keep informed', completed: true },
  { id: 10, title: 'Conclusion', completed: true },
  { id: 11, title: 'Receive credit', highlighted: true, active: true },
  { id: 12, title: 'Credit confirmed', completed: true },
];

const CourseOutline: React.FC = () => {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['course-content'])
  );

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-2">
      {/* Course Content Section */}
      <div className="border-b border-gray-200 pb-2">
        <button
          onClick={() => toggleSection('course-content')}
          className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Course Content</span>
          {expandedSections.has('course-content') ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.has('course-content') && (
          <div className="mt-2 space-y-1">
            {courseItems.map((item) => (
              <div
                key={item.id}
                className={`
                  course-item flex items-center space-x-3 py-2 px-3 rounded text-sm cursor-pointer
                  ${item.active ? 'active' : ''}
                  ${item.highlighted ? 'bg-blue-50 text-ms-blue font-medium' : 'text-gray-700'}
                `}
              >
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-xs text-gray-500 w-4">{item.id}</span>
                  <span className="text-xs">-</span>
                  <span className="flex-1">{item.title}</span>
                </div>
                <div className="flex-shrink-0">
                  {item.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseOutline;
