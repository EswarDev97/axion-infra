/**
 * MindFlow - Switch Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1
 */

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '@/utils/cn';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'h-3 w-3',
    translate: 'translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
  },
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, size = 'md', id, ...props }, ref) => {
    const generatedId = useId();
    const switchId = id || `switch-${generatedId}`;
    const sizes = sizeClasses[size];

    return (
      <label htmlFor={switchId} className="inline-flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            id={switchId}
            role="switch"
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'rounded-full transition-colors',
              'bg-gray-300 peer-checked:bg-primary-600',
              'peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              sizes.track,
              className
            )}
          />
          <div
            className={cn(
              'absolute top-0.5 left-0.5 bg-white rounded-full transition-transform',
              'peer-checked:' + sizes.translate,
              sizes.thumb
            )}
          />
        </div>
        {label && (
          <span className="ml-2 text-sm text-gray-700 select-none">{label}</span>
        )}
      </label>
    );
  }
);

Switch.displayName = 'Switch';
