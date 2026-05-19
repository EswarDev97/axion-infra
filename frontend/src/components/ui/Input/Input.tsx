/**
 * MindFlow - Input Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1.2
 */

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, type, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          aria-invalid={error}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
