
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ContentViewer from './components/ContentViewer';
import './styles/globals.css';
import { allContentItems } from './data/contentStructure';

function App() {
  const [currentContentId, setCurrentContentId] = useState<string>(
    allContentItems[0]?.id || ''
  );

  const handleContentChange = (contentId: string) => {
    setCurrentContentId(contentId);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-geist">
      {/* Top Header */}
      <Header />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar 
          currentContentId={currentContentId}
          onContentSelect={handleContentChange}
        />
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Content Viewer */}
          <ContentViewer 
            currentContentId={currentContentId}
            onContentChange={handleContentChange}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
