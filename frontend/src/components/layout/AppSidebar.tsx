'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

interface MenuChildItem {
  label: string;
  href: string;
  icon?: ReactNode;
  permission?: string;
  anyPermission?: string[];
  hideForRoles?: string[];
}

interface MenuLinkItem {
  label: string;
  href: string;
  icon: ReactNode;
  permission?: string;
  anyPermission?: string[];
  hideForRoles?: string[];
  children?: undefined;
}

interface MenuExpandableItem {
  label: string;
  href?: undefined;
  icon: ReactNode;
  permission?: string;
  anyPermission?: string[];
  hideForRoles?: string[];
  children: MenuChildItem[];
}

type MenuItem = MenuLinkItem | MenuExpandableItem;

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    permission: 'employees:read',
    hideForRoles: ['EMPLOYEE'],
  },
  {
    label: 'Departments',
    href: '/dashboard/departments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    permission: 'departments:read',
    hideForRoles: ['EMPLOYEE'],
  },
  {
    label: 'Attendance',
    href: '/dashboard/attendance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Holidays',
    href: '/dashboard/holidays',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Leave',
    href: '/dashboard/leave',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Tasks',
    href: '/dashboard/tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Work List',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    children: [
      {
        label: 'Work',
        href: '/dashboard/payments',
        anyPermission: ['payments:read', 'payments:read:own'],
      },
    ],
  },
  {
    label: 'Documents',
    href: '/dashboard/documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Mind Maps',
    href: '/dashboard/mindmaps',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Training',
    href: '/dashboard/training',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Expenses',
    href: '/dashboard/expenses',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Quotes',
    href: '/dashboard/quotes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE'],
  },
  {
    label: 'Invoices',
    href: '/dashboard/invoices',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE'],
  },
  {
    label: 'Complaints',
    href: '/dashboard/complaints',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE'],
  },
  {
    label: 'CRM',
    href: '/dashboard/crm',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Clients',
    href: '/dashboard/clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE'],
  },
  {
    label: 'Approvals',
    href: '/dashboard/approvals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Notifications',
    href: '/dashboard/notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    hideForRoles: ['EMPLOYEE', 'MANAGER'],
  },
  {
    label: 'Roles & Permissions',
    href: '/dashboard/roles',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    permission: 'roles:read',
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // sidebarCollapsed persists to localStorage (unavailable during SSR), same
  // hydration-mismatch hazard as isMounted below — force expanded until
  // mounted so the client's first paint matches the server's fixed w-64.
  const collapsed = isMounted && sidebarCollapsed;

  // Auto-expand any parent whose child href matches the current pathname,
  // so navigating directly to a nested route (e.g. /dashboard/payments)
  // shows its parent (e.g. Work List) already expanded.
  useEffect(() => {
    const parentsToExpand = menuItems
      .filter((item) =>
        item.children?.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + '/')
        )
      )
      .map((item) => item.label);

    if (parentsToExpand.length === 0) return;

    setExpandedItems((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const label of parentsToExpand) {
        if (!next.has(label)) {
          next.add(label);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const filteredMenuItems = useMemo(
    () =>
      menuItems
        .filter((item) => {
          // Before hydration, show all items to match server render
          if (!isMounted) return true;
          if (item.hideForRoles && hasAnyRole(item.hideForRoles)) return false;
          if (item.anyPermission) return hasAnyPermission(item.anyPermission);
          if (!item.permission) return true;
          // After hydration, filter based on actual permissions
          return hasPermission(item.permission);
        })
        .map((item) => {
          if (!item.children) return item;
          const filteredChildren = item.children.filter((child) => {
            if (!isMounted) return true;
            if (child.hideForRoles && hasAnyRole(child.hideForRoles)) return false;
            if (child.anyPermission) return hasAnyPermission(child.anyPermission);
            if (!child.permission) return true;
            return hasPermission(child.permission);
          });
          return { ...item, children: filteredChildren };
        }),
    [isMounted, hasPermission, hasAnyPermission, hasAnyRole]
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-gray-900 text-white hidden lg:block transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-gray-800 ${collapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
          {!collapsed && (
            <Link href="/dashboard" className="text-xl font-bold text-white">
              Wings Associates
            </Link>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <svg
              className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              // Items with children render as an expandable button + nested
              // submenu instead of a direct Link (they have no href of their own).
              if (item.children) {
                const isExpanded = !collapsed && expandedItems.has(item.label);
                const isChildActive = item.children.some(
                  (child) => pathname === child.href || pathname.startsWith(child.href + '/')
                );
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.label)}
                      aria-expanded={isExpanded}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isChildActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {item.icon}
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-4 space-y-1 border-l border-gray-800 pl-3">
                        {item.children.map((child) => {
                          const isChildLinkActive =
                            pathname === child.href || pathname.startsWith(child.href + '/');
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                                  isChildLinkActive
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                              >
                                {child.icon}
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              // Existing flat-item rendering path — unchanged from before
              // children support was added, to avoid any regression risk.
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-gray-800 ${collapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/"
            title={collapsed ? 'Back to Website' : undefined}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!collapsed && 'Back to Website'}
          </Link>
        </div>
      </div>
    </aside>
  );
}
