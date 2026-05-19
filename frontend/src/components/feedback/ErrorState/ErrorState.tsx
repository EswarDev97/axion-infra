/**
 * MindFlow - ErrorState Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4',
        className
      )}
      role="alert"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 text-center max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
