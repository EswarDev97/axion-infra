/**
 * MindFlow - Checkbox Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1
 */

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, size = 'md', id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || `checkbox-${generatedId}`;

    return (
      <label htmlFor={checkboxId} className="inline-flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            id={checkboxId}
            className={cn('peer sr-only', className)}
            {...props}
          />
          <div
            className={cn(
              'border-2 rounded flex items-center justify-center transition-colors',
              'border-gray-300 bg-white',
              'peer-checked:border-primary-600 peer-checked:bg-primary-600',
              'peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              sizeClasses[size]
            )}
          >
            <Check
              className={cn(
                'text-white opacity-0 peer-checked:opacity-100 transition-opacity',
                iconSizeClasses[size]
              )}
            />
          </div>
        </div>
        {label && (
          <span className="ml-2 text-sm text-gray-700 select-none">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
