/**
 * Mission Control Theme System
 * A collection of themes designed for the AICodePath dashboard
 * Each theme maintains the futuristic, space-tech aesthetic while offering unique visual personalities
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
  };
  radius: string;
  fontFamily?: string;
  previewColors: string[];
}

export const themes: Theme[] = [
  {
    id: 'mission-control',
    name: 'Mission Control',
    description: 'The original dark space-tech aesthetic',
    colors: {
      background: '#0a0a0f',
      foreground: '#e8e8f0',
      primary: '#00f5ff',
      primaryForeground: '#0a0a0f',
      secondary: '#1a1a24',
      secondaryForeground: '#e8e8f0',
      muted: '#12121a',
      mutedForeground: '#8a8a9e',
      accent: '#a855f7',
      accentForeground: '#ffffff',
      destructive: '#ff006e',
      border: 'rgba(255, 255, 255, 0.08)',
      input: '#1a1a24',
      ring: '#00f5ff',
    },
    radius: '0.75rem',
    fontFamily: '"Instrument Sans", system-ui, sans-serif',
    previewColors: ['#00f5ff', '#a855f7', '#22c55e', '#ffb000'],
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    description: 'Ultra-dark with purple nebula accents',
    colors: {
      background: '#050508',
      foreground: '#f0f0f5',
      primary: '#8b5cf6',
      primaryForeground: '#ffffff',
      secondary: '#0d0d12',
      secondaryForeground: '#f0f0f5',
      muted: '#0a0a0f',
      mutedForeground: '#7a7a8a',
      accent: '#06b6d4',
      accentForeground: '#ffffff',
      destructive: '#ef4444',
      border: 'rgba(139, 92, 246, 0.15)',
      input: '#0d0d12',
      ring: '#8b5cf6',
    },
    radius: '0.5rem',
    previewColors: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'],
  },
  {
    id: 'cyber-grid',
    name: 'Cyber Grid',
    description: 'High-contrast with green matrix aesthetic',
    colors: {
      background: '#030503',
      foreground: '#e0f5e0',
      primary: '#00ff88',
      primaryForeground: '#030503',
      secondary: '#0a140a',
      secondaryForeground: '#e0f5e0',
      muted: '#061006',
      mutedForeground: '#6a8a6a',
      accent: '#00d9ff',
      accentForeground: '#030503',
      destructive: '#ff3366',
      border: 'rgba(0, 255, 136, 0.2)',
      input: '#0a140a',
      ring: '#00ff88',
    },
    radius: '0rem',
    fontFamily: '"JetBrains Mono", monospace',
    previewColors: ['#00ff88', '#00d9ff', '#ffaa00', '#ff3366'],
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora',
    description: 'Gradient northern lights inspired',
    colors: {
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      foreground: '#e2e8f0',
      primary: '#6ee7b7',
      primaryForeground: '#0f172a',
      secondary: 'rgba(30, 41, 59, 0.8)',
      secondaryForeground: '#e2e8f0',
      muted: 'rgba(15, 23, 42, 0.6)',
      mutedForeground: '#94a3b8',
      accent: '#f472b6',
      accentForeground: '#0f172a',
      destructive: '#ef4444',
      border: 'rgba(148, 163, 184, 0.1)',
      input: 'rgba(30, 41, 59, 0.8)',
      ring: '#6ee7b7',
    },
    radius: '1rem',
    previewColors: ['#6ee7b7', '#f472b6', '#a78bfa', '#38bdf8'],
  },
  {
    id: 'mars-explorer',
    name: 'Mars Explorer',
    description: 'Warm terra-cotta space mission tones',
    colors: {
      background: '#1a0f0a',
      foreground: '#f5efe8',
      primary: '#ff6b35',
      primaryForeground: '#1a0f0a',
      secondary: '#2a1f1a',
      secondaryForeground: '#f5efe8',
      muted: '#231812',
      mutedForeground: '#9a8a7a',
      accent: '#ffb000',
      accentForeground: '#1a0f0a',
      destructive: '#dc3545',
      border: 'rgba(255, 107, 53, 0.2)',
      input: '#2a1f1a',
      ring: '#ff6b35',
    },
    radius: '0.5rem',
    previewColors: ['#ff6b35', '#ffb000', '#22c55e', '#00d9ff'],
  },
  {
    id: 'lunar-station',
    name: 'Lunar Station',
    description: 'Clean whites and grays for moon bases',
    colors: {
      background: '#f8fafc',
      foreground: '#0f172a',
      primary: '#4f46e5',
      primaryForeground: '#ffffff',
      secondary: '#e2e8f0',
      secondaryForeground: '#0f172a',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#06b6d4',
      accentForeground: '#ffffff',
      destructive: '#ef4444',
      border: '#e2e8f0',
      input: '#ffffff',
      ring: '#4f46e5',
    },
    radius: '0.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
    previewColors: ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b'],
  },
];

// Dark mode variants (for themes that support light mode)
export const darkModeOverrides: Record<string, Partial<Theme['colors']>> = {
  'lunar-station': {
    background: '#0f172a',
    foreground: '#f8fafc',
    secondary: '#1e293b',
    muted: '#020617',
    border: 'rgba(255, 255, 255, 0.1)',
    input: '#1e293b',
  },
};

// Helper to get theme by ID
export function getThemeById(id: string): Theme | undefined {
  return themes.find(t => t.id === id);
}

// Helper to get default theme
export function getDefaultTheme(): Theme {
  return themes[0]; // Mission Control
}

// Helper to check if theme supports light/dark modes
export function themeHasDarkMode(themeId: string): boolean {
  return themeId in darkModeOverrides;
}
