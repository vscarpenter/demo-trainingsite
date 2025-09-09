import React from 'react';
import { Search, HelpCircle, Settings, User, X, ChevronRight, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { SITE_NAME, COURSE_TITLE } from '@/lib/constants';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  return (
    <header className="bg-white border-b border-gray-200 h-12 flex items-center px-4 relative z-10">
      <div className="flex items-center flex-1">
        {/* Mobile sidebar toggle */}
        <Button
          aria-label="Toggle menu"
          variant="ghost"
          size="icon"
          className="h-8 w-8 mr-2 md:hidden"
          onClick={onToggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Microsoft Logo */}
        <div className="flex items-center space-x-3">
          <div className="microsoft-logo-squares">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <span className="text-sm font-medium text-gray-700">Microsoft</span>
        </div>

        {/* Breadcrumb Navigation */}
        <nav className="ml-8 text-sm text-gray-600" aria-label="Breadcrumb">
          <ol className="flex items-center">
            <li>
              <span className="hover:text-ms-blue cursor-pointer text-base">{SITE_NAME}</span>
            </li>
            <li aria-hidden="true" className="px-2">
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </li>
            <li aria-current="page">
              <span className="text-gray-900 font-medium text-base">{COURSE_TITLE}</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center space-x-2">
        <Button aria-label="Search" variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
        <Button aria-label="Help" variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button aria-label="Settings" variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
        <Button aria-label="Account" variant="ghost" size="icon" className="h-8 w-8">
          <User className="h-4 w-4" />
        </Button>
        <Button aria-label="Close" variant="ghost" size="icon" className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
