
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HeroSection from './components/HeroSection';
import ControlsBar from './components/ControlsBar';
import './styles/globals.css';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 font-geist">
      {/* Top Header */}
      <Header />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Hero Section */}
          <HeroSection />
          
          {/* Bottom Controls */}
          <ControlsBar />
        </main>
      </div>
    </div>
  );
}

export default App;
