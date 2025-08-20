import React from 'react';
import { Play, Pause, Volume2, Settings, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

const ControlsBar: React.FC = () => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress] = React.useState(75);

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Playback controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Time display */}
          <div className="text-sm text-gray-600 font-geist-mono">
            <span>33:45</span>
            <span className="mx-1">/</span>
            <span>45:00</span>
          </div>
        </div>

        {/* Center - Progress bar */}
        <div className="flex-1 mx-8">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Right side - Additional controls */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Volume2 className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize className="h-4 w-4" />
          </Button>

          {/* PREV button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4 text-xs font-medium px-3 py-1 h-8"
          >
            PREV
          </Button>
        </div>
      </div>

      {/* Microsoft footer links */}
      <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-6 text-xs text-gray-500">
          <a href="#" className="hover:text-ms-blue transition-colors">Privacy & cookies</a>
          <a href="#" className="hover:text-ms-blue transition-colors">Terms of use</a>
          <a href="#" className="hover:text-ms-blue transition-colors">Trademarks</a>
          <a href="#" className="hover:text-ms-blue transition-colors">Safety & eco</a>
          <span>© Microsoft 2024</span>
        </div>
      </div>
    </div>
  );
};

export default ControlsBar;
