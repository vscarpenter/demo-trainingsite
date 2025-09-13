import React, { useEffect, useRef, useState } from 'react';
import { X, Palette, Monitor, Eye, Volume2, Keyboard, Shield, Download, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  sidebarWidth: 'compact' | 'normal' | 'wide';
  videoAutoplay: boolean;
  videoQuality: 'auto' | 'high' | 'medium' | 'low';
  highContrast: boolean;
  progressSync: 'local' | 'cloud';
  analytics: boolean;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        return { ...getDefaultSettings(), ...JSON.parse(saved) };
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  });

  function getDefaultSettings(): SettingsState {
    return {
      theme: 'auto',
      fontSize: 'medium',
      sidebarWidth: 'normal',
      videoAutoplay: false,
      videoQuality: 'auto',
      highContrast: false,
      progressSync: 'local',
      analytics: true,
    };
  }

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  function applySettings(newSettings: SettingsState) {
    // Apply theme
    const root = document.documentElement;
    if (newSettings.theme === 'dark') {
      root.classList.add('dark');
    } else if (newSettings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply font size
    root.style.fontSize = newSettings.fontSize === 'small' ? '14px' : 
                         newSettings.fontSize === 'large' ? '18px' : '16px';

    // Apply sidebar width
    const sidebar = document.querySelector('.sidebar-shadow');
    if (sidebar) {
      sidebar.className = sidebar.className.replace(/w-\d+/g, '');
      const widthClass = newSettings.sidebarWidth === 'compact' ? 'w-64' :
                        newSettings.sidebarWidth === 'wide' ? 'w-96' : 'w-80';
      sidebar.classList.add(widthClass);
    }

    // Apply high contrast
    if (newSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }

  useEffect(() => {
    if (isOpen) {
      firstFocusableRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
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

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(getDefaultSettings());
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'app-settings.json';
    link.click();
    URL.revokeObjectURL(url);
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
      aria-labelledby="settings-dialog-title"
    >
      <div
        ref={dialogRef}
        className={cn(
          "bg-white dark:bg-gray-900 rounded-2xl shadow-3xl max-w-3xl w-full",
          "max-h-[90vh] flex flex-col",
          "border border-gray-200/50 dark:border-gray-700/50",
          "transform transition-all duration-300 ease-out",
          "animate-in slide-in-from-bottom-4 fade-in-0",
          "backdrop-blur-sm"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-r from-ms-blue/5 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-ms-blue/10 to-ms-blue/20 shadow-sm">
              <Monitor className="w-7 h-7 text-ms-blue" />
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-3xl font-bold text-gray-900 dark:text-white">
                Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Customize your learning experience
              </p>
            </div>
          </div>
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="p-3 rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105 focus:ring-2 focus:ring-ms-blue/20 focus:ring-offset-2 active:scale-95"
            aria-label="Close settings dialog"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Display & Appearance */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 shadow-sm">
                <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Display & Appearance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customize the visual experience</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: 'Light', icon: '☀️', desc: 'Always light mode' },
                    { value: 'dark', label: 'Dark', icon: '🌙', desc: 'Always dark mode' },
                    { value: 'auto', label: 'Auto', icon: '🔄', desc: 'Follow system' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('theme', option.value as SettingsState['theme'])}
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all duration-300 text-center group hover:scale-105 hover:shadow-lg",
                        settings.theme === option.value
                          ? "border-ms-blue bg-gradient-to-br from-ms-blue/10 to-ms-blue/20 shadow-lg scale-105"
                          : "border-gray-200 dark:border-gray-600 hover:border-ms-blue/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{option.icon}</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{option.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Font Size
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'small', label: 'Small', size: '14px', desc: 'Compact text' },
                    { value: 'medium', label: 'Medium', size: '16px', desc: 'Standard text' },
                    { value: 'large', label: 'Large', size: '18px', desc: 'Larger text' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('fontSize', option.value as SettingsState['fontSize'])}
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all duration-300 text-center group hover:scale-105 hover:shadow-lg",
                        settings.fontSize === option.value
                          ? "border-ms-blue bg-gradient-to-br from-ms-blue/10 to-ms-blue/20 shadow-lg scale-105"
                          : "border-gray-200 dark:border-gray-600 hover:border-ms-blue/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2" style={{ fontSize: option.size }}>
                        Aa
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{option.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Width */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Sidebar Width
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'compact', label: 'Compact', width: '256px', desc: 'More content space' },
                    { value: 'normal', label: 'Normal', width: '320px', desc: 'Balanced layout' },
                    { value: 'wide', label: 'Wide', width: '384px', desc: 'More navigation space' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('sidebarWidth', option.value as SettingsState['sidebarWidth'])}
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all duration-300 text-center group hover:scale-105 hover:shadow-lg",
                        settings.sidebarWidth === option.value
                          ? "border-ms-blue bg-gradient-to-br from-ms-blue/10 to-ms-blue/20 shadow-lg scale-105"
                          : "border-gray-200 dark:border-gray-600 hover:border-ms-blue/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <div className="text-2xl mb-2">📏</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{option.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{option.width}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Content Preferences */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 shadow-sm">
                <Volume2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Content Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customize media and content behavior</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Video Autoplay */}
              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <div className="flex-1">
                  <label className="text-lg font-semibold text-gray-900 dark:text-white">
                    Video Autoplay
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Automatically play videos when content loads
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('videoAutoplay', !settings.videoAutoplay)}
                  className={cn(
                    "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ms-blue/20 focus:ring-offset-2",
                    settings.videoAutoplay ? "bg-ms-blue shadow-lg" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300",
                      settings.videoAutoplay ? "translate-x-7" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Video Quality */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Video Quality
                </label>
                <select
                  value={settings.videoQuality}
                  onChange={(e) => updateSetting('videoQuality', e.target.value as SettingsState['videoQuality'])}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-ms-blue/20 focus:border-ms-blue transition-all duration-200 text-lg"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="high">High Quality</option>
                  <option value="medium">Medium Quality</option>
                  <option value="low">Low Quality</option>
                </select>
              </div>
            </div>
          </section>

          {/* Accessibility */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Accessibility</h3>
            </div>
            
            <div className="space-y-6">
              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    High Contrast Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enhanced contrast for better visibility
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('highContrast', !settings.highContrast)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.highContrast ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.highContrast ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Data & Privacy */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Data & Privacy</h3>
            </div>
            
            <div className="space-y-6">
              {/* Progress Sync */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Progress Storage
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'local', label: 'Local Only', desc: 'Stored on this device' },
                    { value: 'cloud', label: 'Cloud Sync', desc: 'Synced across devices' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('progressSync', option.value as SettingsState['progressSync'])}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                        settings.progressSync === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      )}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Usage Analytics
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Help improve the app with anonymous usage data
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('analytics', !settings.analytics)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    settings.analytics ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      settings.analytics ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200/80 dark:border-gray-700/80 p-8 bg-gradient-to-r from-gray-50/80 to-gray-50/40 dark:from-gray-800/80 dark:to-gray-800/40">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={exportSettings}
                className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-ms-blue/50 hover:scale-105 transition-all duration-200 shadow-sm"
              >
                <Download className="w-5 h-5" />
                Export Settings
              </button>
              <button
                onClick={resetSettings}
                className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-ms-blue/50 hover:scale-105 transition-all duration-200 shadow-sm"
              >
                <RotateCcw className="w-5 h-5" />
                Reset to Defaults
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-ms-blue to-ms-blue/90 text-white rounded-xl hover:from-ms-blue/90 hover:to-ms-blue/80 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
