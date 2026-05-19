/**
 * MindFlow - LoadingState Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 */

import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui/Spinner';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
      role="status"
      aria-label={message}
    >
      <Spinner size={size} className="text-primary-600" />
      {message && (
        <p className="mt-4 text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}
