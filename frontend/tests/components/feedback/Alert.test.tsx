/**
 * Alert Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from '@/components/feedback/Alert';

describe('Alert', () => {
  describe('Rendering', () => {
    it('renders with children content', () => {
      render(<Alert>This is an alert message</Alert>);

      expect(screen.getByText('This is an alert message')).toBeInTheDocument();
    });

    it('renders with title', () => {
      render(<Alert title="Warning">Content here</Alert>);

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Content here')).toBeInTheDocument();
    });

    it('renders without title', () => {
      render(<Alert>Just content</Alert>);

      expect(screen.getByText('Just content')).toBeInTheDocument();
    });

    it('has role="alert"', () => {
      render(<Alert>Alert content</Alert>);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it.each([
      ['info', 'bg-blue-50'],
      ['success', 'bg-green-50'],
      ['warning', 'bg-yellow-50'],
      ['error', 'bg-red-50'],
    ] as const)('renders %s variant correctly', (variant, expectedClass) => {
      render(<Alert variant={variant}>Alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain(expectedClass);
    });

    it('uses info as default variant', () => {
      render(<Alert>Default</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-blue-50');
    });
  });

  describe('Icons', () => {
    it('renders icon for each variant', () => {
      const { rerender } = render(<Alert variant="info">Info</Alert>);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();

      rerender(<Alert variant="success">Success</Alert>);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();

      rerender(<Alert variant="warning">Warning</Alert>);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();

      rerender(<Alert variant="error">Error</Alert>);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('shows close button when onClose is provided', () => {
      const handleClose = vi.fn();
      render(<Alert onClose={handleClose}>Dismissible</Alert>);

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('does not show close button when onClose is not provided', () => {
      render(<Alert>Not dismissible</Alert>);

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(<Alert onClose={handleClose}>Dismissible</Alert>);

      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Title and Content Layout', () => {
    it('renders title with proper styling', () => {
      render(<Alert title="Important Notice">Details here</Alert>);

      const title = screen.getByText('Important Notice');
      expect(title.tagName).toBe('H3');
      expect(title.className).toContain('font-medium');
    });

    it('applies margin-top to content when title exists', () => {
      render(<Alert title="Title">Content with margin</Alert>);

      const content = screen.getByText('Content with margin');
      expect(content.className).toContain('mt-1');
    });

    it('does not apply margin-top to content when no title', () => {
      render(<Alert>Content without margin</Alert>);

      const content = screen.getByText('Content without margin');
      expect(content.className).not.toContain('mt-1');
    });
  });

  describe('Accessibility', () => {
    it('close button has aria-label', () => {
      render(<Alert onClose={() => {}}>Accessible</Alert>);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('can dismiss with keyboard', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(<Alert onClose={handleClose}>Keyboard dismissible</Alert>);

      await user.tab();
      await user.keyboard('{Enter}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<Alert className="custom-class">Custom</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('custom-class');
    });

    it('merges custom className with variant styles', () => {
      render(
        <Alert variant="error" className="custom-class">
          Merged
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
      expect(alert.className).toContain('custom-class');
    });
  });

  describe('Common Use Cases', () => {
    it('renders error alert', () => {
      render(
        <Alert variant="error" title="Error">
          Something went wrong
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders success alert', () => {
      render(
        <Alert variant="success" title="Success">
          Operation completed
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-green-50');
    });

    it('renders dismissible info alert', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Alert variant="info" title="Tip" onClose={handleClose}>
          Here is some helpful information
        </Alert>
      );

      expect(screen.getByText('Tip')).toBeInTheDocument();
      expect(screen.getByText('Here is some helpful information')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
