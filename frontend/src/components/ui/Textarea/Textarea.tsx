/**
 * MindFlow - Textarea Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1
 */

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-primary-500',
          className
        )}
        aria-invalid={error}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
