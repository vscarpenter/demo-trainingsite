import React from 'react';
import { Search, HelpCircle, Settings, User, X, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 h-12 flex items-center px-4 relative z-10">
      <div className="flex items-center flex-1">
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
        <nav className="flex items-center ml-8 text-sm text-gray-600">
          <span className="hover:text-ms-blue cursor-pointer text-base">Sunit Carpenter Learning</span>
          <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium text-base">
            The Microsoft 365 Copilot Experience
          </span>
        </nav>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <User className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
