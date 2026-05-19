/**
 * MindFlow - UI Store
 * Per FRONTEND_ARCHITECTURE.md Section 2.2.5
 * Zustand store for UI state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: 'light',

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setSidebarMobileOpen: (sidebarMobileOpen) => set({ sidebarMobileOpen }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'mindflow-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selector hooks
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useSidebarMobileOpen = () => useUIStore((state) => state.sidebarMobileOpen);
export const useTheme = () => useUIStore((state) => state.theme);
