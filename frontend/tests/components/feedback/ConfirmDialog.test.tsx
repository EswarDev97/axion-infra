/**
 * ConfirmDialog Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('renders confirm and cancel buttons', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmLabel="Delete"
          cancelLabel="Keep"
        />
      );

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders danger variant with correct styling', () => {
      const { container } = render(
        <ConfirmDialog {...defaultProps} variant="danger" />
      );

      const iconBg = container.querySelector('.bg-red-100');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders warning variant with correct styling', () => {
      const { container } = render(
        <ConfirmDialog {...defaultProps} variant="warning" />
      );

      const iconBg = container.querySelector('.bg-yellow-100');
      expect(iconBg).toBeInTheDocument();
    });

    it('renders info variant with correct styling', () => {
      const { container } = render(
        <ConfirmDialog {...defaultProps} variant="info" />
      );

      const iconBg = container.querySelector('.bg-blue-100');
      expect(iconBg).toBeInTheDocument();
    });

    it('uses danger as default variant', () => {
      const { container } = render(<ConfirmDialog {...defaultProps} />);

      const iconBg = container.querySelector('.bg-red-100');
      expect(iconBg).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: /confirm/i }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading state on confirm button', () => {
      render(<ConfirmDialog {...defaultProps} loading />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    });

    it('disables cancel button when loading', () => {
      render(<ConfirmDialog {...defaultProps} loading />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('disables confirm button when loading', () => {
      render(<ConfirmDialog {...defaultProps} loading />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('can navigate buttons with tab', async () => {
      const user = userEvent.setup();
      render(<ConfirmDialog {...defaultProps} />);

      await user.tab();
      await user.tab();

      // One of the buttons should have focus
      const buttons = screen.getAllByRole('button');
      const hasFocus = buttons.some((button) => button === document.activeElement);
      expect(hasFocus).toBe(true);
    });

    it('can confirm with Enter key', async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();

      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      confirmButton.focus();
      await user.keyboard('{Enter}');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Common Use Cases', () => {
    it('renders delete confirmation dialog', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete Item"
          description="This action cannot be undone. Are you sure?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
        />
      );

      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone. Are you sure?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('renders info confirmation dialog', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Confirm Submission"
          description="Your form will be submitted for review."
          confirmLabel="Submit"
          variant="info"
        />
      );

      expect(screen.getByText('Confirm Submission')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
  });
});
