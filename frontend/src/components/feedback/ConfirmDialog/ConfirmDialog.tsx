/**
 * MindFlow - ConfirmDialog Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 * Supports both old and new prop names for compatibility
 */

'use client';

import { AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { Modal, ModalFooter } from '../Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  // Support both description and message
  description?: string;
  message?: string;
  // Support both confirmLabel and confirmText
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonVariant: 'primary' as const,
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  // Support both prop names
  const displayMessage = description || message || '';
  const displayConfirmLabel = confirmLabel || confirmText || 'Confirm';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <div
          className={cn(
            'mx-auto flex items-center justify-center w-12 h-12 rounded-full mb-4',
            config.iconBg
          )}
        >
          <Icon className={cn('h-6 w-6', config.iconColor)} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">{displayMessage}</p>
      </div>

      <ModalFooter className="justify-center">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={config.buttonVariant}
          onClick={onConfirm}
          loading={loading}
        >
          {displayConfirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
