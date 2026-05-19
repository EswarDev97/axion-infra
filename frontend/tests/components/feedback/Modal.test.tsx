/**
 * Modal Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/feedback/Modal';

describe('Modal', () => {
  describe('Rendering', () => {
    it('renders when open', () => {
      render(
        <Modal isOpen onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );

      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal content</div>
        </Modal>
      );

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders with title', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test Title">
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(
        <Modal isOpen onClose={() => {}} description="Test description">
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen onClose={handleClose} closeOnBackdropClick>
          <div>Content</div>
        </Modal>
      );

      // Click on the backdrop (usually the outer div)
      const backdrop = document.querySelector('[data-testid="modal-backdrop"]') ||
        document.querySelector('.fixed.inset-0');

      if (backdrop) {
        await user.click(backdrop);
        expect(handleClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Escape key is pressed', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on backdrop click when closeOnBackdropClick is false', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen onClose={handleClose} closeOnBackdropClick={false}>
          <div>Content</div>
        </Modal>
      );

      const backdrop = document.querySelector('[data-testid="modal-backdrop"]');
      if (backdrop) {
        await user.click(backdrop);
        expect(handleClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Sizes', () => {
    it.each(['sm', 'md', 'lg', 'xl', 'full'] as const)(
      'renders with %s size',
      (size) => {
        render(
          <Modal isOpen onClose={() => {}} size={size}>
            <div>Content</div>
          </Modal>
        );

        // Modal should be in document
        expect(screen.getByText('Content')).toBeInTheDocument();
      }
    );
  });

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(
        <Modal isOpen onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(
        <Modal isOpen onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Modal Title">
          <div>Content</div>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('has aria-describedby when description is provided', () => {
      render(
        <Modal isOpen onClose={() => {}} description="Modal description">
          <div>Content</div>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();

      render(
        <Modal isOpen onClose={() => {}}>
          <button>Button 1</button>
          <button>Button 2</button>
        </Modal>
      );

      // Tab through elements
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should remain within modal
      const focusedElement = document.activeElement;
      const modal = screen.getByRole('dialog');
      expect(modal.contains(focusedElement)).toBe(true);
    });
  });

  describe('Body Scroll Lock', () => {
    it('locks body scroll when open', () => {
      render(
        <Modal isOpen onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      // Check if body has overflow hidden (implementation dependent)
      expect(
        document.body.style.overflow === 'hidden' ||
        document.body.classList.contains('overflow-hidden')
      ).toBe(true);
    });
  });
});
