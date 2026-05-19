/**
 * MindFlow - Button Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1.1
 */

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 active:bg-gray-100',
        ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  isLoading?: boolean; // Alias for loading
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    // Support both loading and isLoading props
    const isLoadingState = loading || isLoading;
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoadingState}
        aria-busy={isLoadingState}
        {...props}
      >
        {isLoadingState && <Spinner size="sm" className="mr-2" />}
        {!isLoadingState && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoadingState && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
