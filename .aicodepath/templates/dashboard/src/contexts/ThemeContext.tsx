import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, darkModeOverrides, type Theme } from '../lib/themes';

interface ThemeContextValue {
  theme: Theme;
  themeId: string;
  isDark: boolean;
  setTheme: (id: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'aicodepath-theme';
const DARK_MODE_KEY = 'aicodepath-dark-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && themes.some(t => t.id === saved) ? saved : 'mission-control';
    } catch {
      return 'mission-control';
    }
  });

  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_KEY);
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return true; // Default to dark for Mission Control aesthetic
    }
  });

  const theme = themes.find(t => t.id === themeId) || themes[0];

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Get colors (merge with dark mode override if applicable)
    let colors = { ...theme.colors };

    // Check if this theme has a dark mode variant and we're in dark mode
    if (isDark && darkModeOverrides[themeId]) {
      colors = { ...colors, ...darkModeOverrides[themeId] };
    }

    // Apply CSS variables for colors
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--${key}`, value);
    }

    // Apply border radius
    root.style.setProperty('--radius', theme.radius);

    // Apply font family if specified
    if (theme.fontFamily) {
      root.style.setProperty('--font-family', theme.fontFamily);
    }

    // Apply dark mode class for conditional styling
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);

    // Set data attribute for theme-specific styling
    root.setAttribute('data-theme', themeId);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
      localStorage.setItem(DARK_MODE_KEY, isDark.toString());
    } catch {
      // Ignore localStorage errors
    }

    // Update Mission Control CSS variables for compatibility
    updateMissionControlVariables(root, colors);
  }, [themeId, isDark, theme]);

  const setTheme = useCallback((id: string) => {
    if (themes.some(t => t.id === id)) {
      setThemeId(id);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const setDarkMode = useCallback((isDark: boolean) => {
    setIsDark(isDark);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeId, isDark, setTheme, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Helper to sync theme variables with Mission Control CSS variables
function updateMissionControlVariables(root: HTMLElement, colors: Record<string, string>) {
  // Map theme colors to Mission Control variables
  const mcMapping: Record<string, string> = {
    background: '--mc-bg-primary',
    secondary: '--mc-bg-secondary',
    muted: '--mc-bg-tertiary',
    border: '--mc-border',
    primary: '--mc-working',
    accent: '--mc-testing',
    destructive: '--mc-error',
  };

  for (const [themeKey, mcVar] of Object.entries(mcMapping)) {
    if (colors[themeKey]) {
      root.style.setProperty(mcVar, colors[themeKey]);
    }
  }

  // Text colors
  root.style.setProperty('--mc-text-primary', colors.foreground);
  root.style.setProperty('--mc-text-secondary', colors.mutedForeground);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get theme-specific className
export function useThemeClassName() {
  const { themeId, isDark } = useTheme();
  return `${themeId}-theme ${isDark ? 'dark' : 'light'}-mode`;
}
