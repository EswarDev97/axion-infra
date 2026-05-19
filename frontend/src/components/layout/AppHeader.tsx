'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth/authService';

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use placeholder values before hydration to prevent mismatch
  const displayUser = isMounted ? user : null;

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                {displayUser?.avatar ? (
                  <img
                    src={displayUser.avatar}
                    alt={displayUser.firstName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-primary-600">
                    {displayUser?.firstName?.[0]}{displayUser?.lastName?.[0]}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {displayUser?.firstName} {displayUser?.lastName}
                </p>
                <p className="text-xs text-gray-500">{displayUser?.email}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                <Link
                  href="/dashboard/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsProfileOpen(false)}
                >
                  My Profile
                </Link>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t bg-white">
          <nav className="p-4 space-y-2">
            <Link href="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
              Dashboard
            </Link>
            <Link href="/dashboard/employees" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
              Employees
            </Link>
            <Link href="/dashboard/attendance" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
              Attendance
            </Link>
            <Link href="/dashboard/leave" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
              Leave
            </Link>
            <Link href="/dashboard/payroll" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
              Payroll
            </Link>
            <Link href="/dashboard/documents" className="block px-3 py-2 rounded-lg hover:bg-gray-100">
              Documents
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
