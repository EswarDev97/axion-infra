import { Palette, Sun, Moon, Check, X, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes, themeHasDarkMode } from '../../lib/themes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelector({ isOpen, onClose }: Props) {
  const { themeId, isDark, setTheme, toggleDarkMode, setDarkMode: _setDarkMode } = useTheme();

  if (!isOpen) return null;

  const supportsDarkMode = themeHasDarkMode(themeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 mc-modal-backdrop">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative mc-tech-border rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mc-header-gradient px-6 py-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <Palette className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mc-font-sans">
                  Theme Settings
                </h2>
                <p className="text-sm text-gray-400 mc-font-mono">
                  Customize your Mission Control
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 mc-scroll">
          {/* Dark Mode Toggle */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-all ${isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-amber-500/20 border border-amber-500/30'}`}>
                  {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <h3 className="text-white font-semibold mc-font-sans">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </h3>
                  <p className="text-sm text-gray-500 mc-font-mono">
                    {isDark ? 'Easy on the eyes' : 'Bright and clear'}
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={toggleDarkMode}
                className={`
                  relative w-14 h-7 rounded-full transition-all duration-300
                  ${isDark ? 'bg-indigo-500' : 'bg-amber-500'}
                  ${supportsDarkMode ? '' : 'opacity-50 cursor-not-allowed'}
                `}
                disabled={!supportsDarkMode}
                title={supportsDarkMode ? '' : 'This theme does not support light mode'}
              >
                <div
                  className={`
                    absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300
                    ${isDark ? 'left-8' : 'left-1'}
                  `}
                >
                  {isDark ? <Moon className="w-3 h-3 text-indigo-500 mx-auto mt-0.5" /> : <Sun className="w-3 h-3 text-amber-500 mx-auto mt-0.5" />}
                </div>
              </button>
            </div>

            {!supportsDarkMode && (
              <p className="text-xs text-gray-500 mc-font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                This theme is designed for {isDark ? 'dark' : 'light'} mode only
              </p>
            )}
          </div>

          {/* Theme Grid */}
          <div>
            <h3 className="text-white font-semibold mb-4 mc-font-sans flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Available Themes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((theme) => {
                const isSelected = themeId === theme.id;
                const isDarkTheme = theme.id === 'mission-control' ||
                                   theme.id === 'deep-space' ||
                                   theme.id === 'cyber-grid' ||
                                   theme.id === 'mars-explorer';

                return (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${isSelected
                        ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                        : 'border-gray-700/50 hover:border-gray-600 bg-gray-800/30 hover:bg-gray-800/50'
                      }
                    `}
                  >
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Theme type badge */}
                    <div className="mb-3">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mc-font-mono
                        ${isDarkTheme
                          ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50'
                          : 'bg-gray-200/50 text-gray-700 border border-gray-300/50'
                        }
                      `}>
                        {isDarkTheme ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                        {isDarkTheme ? 'DARK' : 'LIGHT'}
                      </span>
                    </div>

                    {/* Color preview */}
                    <div className="flex gap-1.5 mb-3">
                      {theme.previewColors.map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-lg border-2 border-black/10 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    {/* Theme name */}
                    <h4 className="text-white font-semibold mb-1 mc-font-sans">
                      {theme.name}
                    </h4>

                    {/* Theme description */}
                    <p className="text-sm text-gray-500 mc-font-mono line-clamp-1">
                      {theme.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold mc-font-sans hover:brightness-110 transition-all"
          >
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
}
