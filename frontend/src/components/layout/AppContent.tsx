'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

export function AppContent({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Same SSR/localStorage hydration hazard as AppSidebar's `collapsed` —
  // force the server's default (expanded, pl-64) until mounted.
  const collapsed = isMounted && sidebarCollapsed;

  return <div className={collapsed ? 'lg:pl-20' : 'lg:pl-64'}>{children}</div>;
}
