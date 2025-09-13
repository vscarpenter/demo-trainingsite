import React, { useEffect, useRef } from 'react';
import { X, Book, Navigation, Play, Keyboard, AlertCircle, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the first focusable element when dialog opens
      firstFocusableRef.current?.focus();
      
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when dialog closes
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }

      // Handle focus trapping
      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "p-4 sm:p-6 md:p-8",
        "transition-all duration-300 ease-out",
        isOpen ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      aria-describedby="help-dialog-description"
    >
      <div
        ref={dialogRef}
        className={cn(
          "bg-white rounded-xl shadow-2xl max-w-4xl w-full",
          "max-h-[90vh] flex flex-col",
          "border border-gray-200/50",
          "transform transition-all duration-300 ease-out",
          "animate-in slide-in-from-bottom-4 fade-in-0",
          "hover:shadow-3xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/80 bg-gradient-to-r from-ms-blue/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-ms-blue/10">
              <Book className="w-6 h-6 text-ms-blue" />
            </div>
            <h2 id="help-dialog-title" className="text-2xl font-semibold text-gray-900">
              Help & User Guide
            </h2>
          </div>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 ease-out",
              "hover:bg-gray-100 hover:text-gray-700",
              "focus:bg-ms-blue/10 focus:text-ms-blue focus:ring-2 focus:ring-ms-blue/20",
              "active:scale-95"
            )}
            aria-label="Close help dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div id="help-dialog-description" className="space-y-8">
            {/* Getting Started Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-ms-blue/10">
                  <Book className="w-5 h-5 text-ms-blue" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Getting Started</h3>
              </div>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Welcome to the Microsoft 365 Copilot Learning Platform! This interactive training application 
                  helps you learn how to effectively use Microsoft Copilot across various Office applications.
                </p>
                <p>
                  The platform is organized into sections covering different Microsoft Office applications, 
                  with each section containing introduction materials, interactive prompts, and video demonstrations.
                </p>
                <div className="bg-gradient-to-r from-ms-blue/5 to-ms-blue/10 border border-ms-blue/20 p-5 rounded-xl">
                  <h4 className="font-semibold text-ms-blue mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-ms-blue rounded-full"></div>
                    Quick Start Tips:
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-ms-blue/60 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Use the sidebar menu to navigate between different sections</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-ms-blue/60 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Your progress is automatically saved as you move through content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-ms-blue/60 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Use Next/Previous buttons or keyboard arrows to navigate sequentially</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-ms-blue/60 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Search for specific topics using the search icon in the header</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Navigation Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-ms-green/10">
                  <Navigation className="w-5 h-5 text-ms-green" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Navigation</h3>
              </div>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sequential Navigation</h4>
                  <p>
                    Use the Next and Previous buttons in the content viewer to move through the course 
                    materials in order. The buttons will be disabled when you reach the beginning or end.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sidebar Menu</h4>
                  <p>
                    The sidebar contains three tabs:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>MENU:</strong> Course outline with all sections and subsections</li>
                    <li><strong>TRANSCRIPT:</strong> Coming soon - will contain lesson transcripts</li>
                    <li><strong>RESOURCES:</strong> Coming soon - will contain additional resources</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Progress Tracking</h4>
                  <p>
                    Your progress is displayed in the sidebar and automatically saved. The progress bar 
                    shows your completion percentage, and you can see "X of Y items viewed" status.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Search Functionality</h4>
                  <p>
                    Click the search icon in the header to quickly find specific content. Search works 
                    across content titles, sections, and subsections with real-time results.
                  </p>
                </div>
              </div>
            </section>

            {/* Content Types Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-ms-red/10">
                  <Play className="w-5 h-5 text-ms-red" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Content Types</h3>
              </div>
              <div className="space-y-4 text-gray-700">
                <p className="leading-relaxed">The platform includes three main types of learning content:</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-gradient-to-br from-ms-blue/5 to-ms-blue/10 border border-ms-blue/20 p-5 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-5 h-5 text-ms-blue" />
                      <h4 className="font-semibold text-gray-900">Introduction</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Overview and explanatory content that introduces new sections and concepts.
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-ms-green/5 to-ms-green/10 border border-ms-green/20 p-5 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-ms-green" />
                      <h4 className="font-semibold text-gray-900">Prompt</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Interactive examples and hands-on exercises showing how to use Copilot effectively.
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-ms-red/5 to-ms-red/10 border border-ms-red/20 p-5 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Play className="w-5 h-5 text-ms-red" />
                      <h4 className="font-semibold text-gray-900">Video</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Demonstration videos and tutorials showing Copilot features in action.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Keyboard Shortcuts Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-ms-yellow/10">
                  <Keyboard className="w-5 h-5 text-ms-yellow" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200/80 shadow-sm">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50">
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                        Action
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                        Keyboard Shortcut
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Next Content</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">→</kbd>
                          <span className="text-gray-400">or</span>
                          <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">Space</kbd>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Navigate to the next content item
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Previous Content</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">←</kbd>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Navigate to the previous content item
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">First Content</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">Home</kbd>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Jump to the first content item
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Last Content</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">End</kbd>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Jump to the last content item
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Open Search</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">Ctrl</kbd>
                          <span className="text-gray-400">+</span>
                          <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">K</kbd>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Open the search dialog
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Close Dialog</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">Escape</kbd>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Close any open dialog (search, help)
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Tab Navigation</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">Tab</kbd>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Navigate between interactive elements
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="border-b border-gray-100 px-4 py-3 font-medium text-gray-900">Sidebar Tabs</td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">←</kbd>
                          <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">→</kbd>
                        </div>
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3 text-gray-600">
                        Navigate between sidebar tabs when focused
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-4 py-3 font-medium text-gray-900">Toggle Sidebar</td>
                      <td className="px-4 py-3">
                        <kbd className="px-2.5 py-1 bg-gradient-to-b from-white to-gray-50 border border-gray-200 rounded-md text-sm font-mono shadow-sm">Escape</kbd>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        Close sidebar on mobile devices
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Troubleshooting Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-ms-red/10">
                  <AlertCircle className="w-5 h-5 text-ms-red" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Troubleshooting</h3>
              </div>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Not Loading</h4>
                  <p className="mb-2">If content fails to load, try these steps:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Refresh the page to reload the content</li>
                    <li>Check your internet connection</li>
                    <li>Clear your browser cache and cookies</li>
                    <li>Try using a different browser or incognito/private mode</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Progress Not Saving</h4>
                  <p className="mb-2">If your progress isn't being saved:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Ensure your browser allows localStorage</li>
                    <li>Check if you're in private/incognito mode (progress won't persist)</li>
                    <li>Try clearing browser data and starting fresh</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Video Playback Issues</h4>
                  <p className="mb-2">If videos aren't playing properly:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Ensure your browser supports HTML5 video</li>
                    <li>Check if audio is muted or volume is turned down</li>
                    <li>Try refreshing the page or navigating away and back</li>
                    <li>Update your browser to the latest version</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Mobile Experience Issues</h4>
                  <p className="mb-2">For mobile device problems:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Rotate your device to landscape mode for better viewing</li>
                    <li>Use the sidebar menu button to access navigation</li>
                    <li>Tap outside the sidebar to close it</li>
                    <li>Ensure you have a stable internet connection</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-r from-ms-yellow/10 to-ms-orange/10 border border-ms-yellow/30 p-5 rounded-xl">
                  <h4 className="font-semibold text-ms-yellow mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Still Having Issues?
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    If you continue to experience problems, try refreshing the page or restarting your browser. 
                    Most issues can be resolved by clearing your browser cache and cookies.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200/80 p-4 bg-gradient-to-r from-gray-50/80 to-gray-50/40">
          <p className="text-sm text-gray-600 text-center flex items-center justify-center gap-2">
            <span>Microsoft 365 Copilot Learning Platform</span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center gap-1">
              Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm">Escape</kbd> to close
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpDialog;