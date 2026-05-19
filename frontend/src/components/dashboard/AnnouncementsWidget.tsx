/**
 * MindFlow - Announcements Widget Component
 * Displays company announcements on the dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Megaphone, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  isNew: boolean;
}

export function AnnouncementsWidget() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        // TODO: Fetch actual announcements from API
        await new Promise((resolve) => setTimeout(resolve, 500));
        setAnnouncements([
          {
            id: '1',
            title: 'Office Closure - Republic Day',
            excerpt: 'The office will be closed on January 26th for Republic Day.',
            date: '2026-01-15',
            priority: 'high',
            isNew: true,
          },
          {
            id: '2',
            title: 'New Health Insurance Policy',
            excerpt: 'Updated health insurance benefits effective February 1st.',
            date: '2026-01-12',
            priority: 'medium',
            isNew: true,
          },
          {
            id: '3',
            title: 'Q1 Town Hall Meeting',
            excerpt: 'Join us for the quarterly town hall on January 30th.',
            date: '2026-01-10',
            priority: 'low',
            isNew: false,
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const getPriorityColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-amber-500';
      case 'low':
        return 'border-l-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
        </div>
        <Link
          href="/dashboard/notifications"
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No announcements at this time
        </p>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`p-3 bg-gray-50 rounded-lg border-l-4 ${getPriorityColor(
                announcement.priority
              )}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {announcement.title}
                </h3>
                {announcement.isNew && (
                  <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                    New
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {announcement.excerpt}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(announcement.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
