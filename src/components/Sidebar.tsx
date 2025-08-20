import React from 'react';
import { Menu, FileText, BookOpen } from 'lucide-react';
import CourseOutline from './CourseOutline';

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('MENU');

  const tabs = [
    { id: 'MENU', label: 'MENU', icon: Menu },
    { id: 'TRANSCRIPT', label: 'TRANSCRIPT', icon: FileText },
    { id: 'RESOURCES', label: 'RESOURCES', icon: BookOpen },
  ];

  return (
    <aside className="w-80 bg-white sidebar-shadow flex flex-col h-full">
      {/* Microsoft Logo Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="microsoft-logo-squares">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Microsoft</div>
            <div className="text-xs text-gray-600">Sunit Carpenter Learning</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 'MENU' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Security Foundations: Guarding Against AI-powered Attacks
              </h3>
              <CourseOutline />
            </div>
          )}
          
          {activeTab === 'TRANSCRIPT' && (
            <div className="text-sm text-gray-600">
              <p>Transcript content will be displayed here...</p>
            </div>
          )}
          
          {activeTab === 'RESOURCES' && (
            <div className="text-sm text-gray-600">
              <p>Course resources and materials will be displayed here...</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Progress</span>
          <span>92%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="progress-bar h-2 rounded-full" style={{ width: '92%' }}></div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          11 of 12 sections completed
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
