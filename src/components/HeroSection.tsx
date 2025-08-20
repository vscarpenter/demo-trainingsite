import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <div className="flex-1 hero-background flex items-center justify-center relative">
      {/* Flowing curve overlay */}
      <div className="flowing-curve"></div>
      
      {/* Floating dots */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full opacity-60 animate-pulse-dot"></div>
      <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full opacity-40 animate-pulse-dot" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white rounded-full opacity-50 animate-pulse-dot" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white rounded-full opacity-30 animate-pulse-dot" style={{ animationDelay: '0.5s' }}></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center px-8 max-w-4xl">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Security Foundations:
          <br />
          <span className="text-blue-100">
            Guarding Against AI-powered Attacks
          </span>
        </h1>
        
        <div className="flex items-center justify-center space-x-4 text-white/80 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>Interactive Learning</span>
          </div>
          <div className="w-1 h-1 bg-white/50 rounded-full"></div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>45 minutes</span>
          </div>
          <div className="w-1 h-1 bg-white/50 rounded-full"></div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>Beginner Level</span>
          </div>
        </div>
      </div>

      {/* Abstract geometric shapes */}
      <div className="absolute top-20 left-20 w-32 h-32 border border-white/20 rounded-full animate-float"></div>
      <div className="absolute bottom-20 right-20 w-24 h-24 border border-white/15 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-10 w-16 h-16 border border-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10"></div>
    </div>
  );
};

export default HeroSection;
