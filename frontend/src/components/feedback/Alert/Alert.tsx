/**
 * MindFlow - Alert Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';

const alertVariants = cva(
  'relative flex items-start gap-3 rounded-lg p-4',
  {
    variants: {
      variant: {
        info: 'bg-blue-50 text-blue-800 border border-blue-200',
        success: 'bg-green-50 text-green-800 border border-green-200',
        warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
        error: 'bg-red-50 text-red-800 border border-red-200',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  onClose?: () => void;
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props
}: AlertProps) {
  const Icon = icons[variant || 'info'];

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        {title && <h3 className="font-medium">{title}</h3>}
        {children && <div className={cn(title && 'mt-1', 'text-sm')}>{children}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { alertVariants };
