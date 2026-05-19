/**
 * MindFlow - Quick Actions Widget Component
 * Provides quick access to common actions on the dashboard
 */

'use client';

import Link from 'next/link';
import {
  Calendar,
  FileText,
  Clock,
  Users,
  Receipt,
  MessageSquare,
} from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'Apply Leave',
    href: '/dashboard/leave?action=new',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    label: 'Submit Expense',
    href: '/dashboard/expenses?action=new',
    icon: <Receipt className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    label: 'Request OT',
    href: '/dashboard/attendance?action=overtime',
    icon: <Clock className="h-5 w-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
  },
  {
    label: 'View Team',
    href: '/dashboard/employees',
    icon: <Users className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    label: 'My Documents',
    href: '/dashboard/documents',
    icon: <FileText className="h-5 w-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
  },
  {
    label: 'Raise Complaint',
    href: '/dashboard/complaints?action=new',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`flex items-center gap-3 p-3 rounded-lg ${action.bgColor} transition-colors`}
          >
            <span className={action.color}>{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
