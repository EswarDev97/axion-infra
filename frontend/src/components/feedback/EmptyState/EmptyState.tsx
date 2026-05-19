/**
 * MindFlow - EmptyState Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { FileQuestion, Inbox, Search, Users, FolderOpen, ClipboardList } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

const icons = {
  default: Inbox,
  search: Search,
  file: FileQuestion,
  folder: FolderOpen,
  users: Users,
  tasks: ClipboardList,
};

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  icon?: keyof typeof icons;
  customIcon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction | ReactNode;
  className?: string;
}

export function EmptyState({
  icon = 'default',
  customIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
        {customIcon || <Icon className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 text-center max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {/* Check if action is a ReactNode or an EmptyStateAction object */}
          {typeof action === 'object' && 'label' in action ? (
            action.href ? (
              <Link href={action.href}>
                <Button variant="primary">{action.label}</Button>
              </Link>
            ) : (
              <Button variant="primary" onClick={action.onClick}>
                {action.label}
              </Button>
            )
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}
