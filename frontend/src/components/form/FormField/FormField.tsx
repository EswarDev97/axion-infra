/**
 * MindFlow - FormField Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2.1
 */

import { ReactNode } from 'react';
import { Label } from '@/components/ui/Label';
import { HelperText } from '@/components/ui/HelperText';
import { cn } from '@/utils/cn';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | false;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error && <HelperText error>{error}</HelperText>}
      {!error && hint && <HelperText>{hint}</HelperText>}
    </div>
  );
}
