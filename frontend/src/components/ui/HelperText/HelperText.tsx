/**
 * MindFlow - HelperText Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1
 */

import { cn } from '@/utils/cn';

export interface HelperTextProps {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}

export function HelperText({ children, error, className }: HelperTextProps) {
  return (
    <p
      className={cn(
        'text-sm',
        error ? 'text-red-500' : 'text-gray-500',
        className
      )}
      role={error ? 'alert' : undefined}
    >
      {children}
    </p>
  );
}
