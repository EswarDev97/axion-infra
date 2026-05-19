/**
 * MindFlow - Select Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1.3
 * Supports both `options` prop and children `<option>` syntax
 */

import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  error?: boolean;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border bg-white px-3 py-2 pr-10 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500',
            className
          )}
          aria-invalid={error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {/* Support both options prop and children */}
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';
