/**
 * Badge Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Badge>Active</Badge>);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders as a span element', () => {
      render(<Badge>Status</Badge>);

      const badge = screen.getByText('Status');
      expect(badge.tagName).toBe('SPAN');
    });
  });

  describe('Variants', () => {
    it.each([
      ['success', 'bg-green-100', 'text-green-800'],
      ['warning', 'bg-yellow-100', 'text-yellow-800'],
      ['error', 'bg-red-100', 'text-red-800'],
      ['info', 'bg-blue-100', 'text-blue-800'],
      ['neutral', 'bg-gray-100', 'text-gray-800'],
    ] as const)(
      'renders %s variant correctly',
      (variant, bgClass, textClass) => {
        render(<Badge variant={variant}>Badge</Badge>);

        const badge = screen.getByText('Badge');
        expect(badge.className).toContain(bgClass);
        expect(badge.className).toContain(textClass);
      }
    );

    it('uses neutral as default variant', () => {
      render(<Badge>Default</Badge>);

      const badge = screen.getByText('Default');
      expect(badge.className).toContain('bg-gray-100');
      expect(badge.className).toContain('text-gray-800');
    });
  });

  describe('Sizes', () => {
    it('renders sm size correctly', () => {
      render(<Badge size="sm">Small</Badge>);

      const badge = screen.getByText('Small');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('px-2');
    });

    it('renders md size correctly', () => {
      render(<Badge size="md">Medium</Badge>);

      const badge = screen.getByText('Medium');
      expect(badge.className).toContain('text-sm');
      expect(badge.className).toContain('px-2.5');
    });

    it('uses md as default size', () => {
      render(<Badge>Default Size</Badge>);

      const badge = screen.getByText('Default Size');
      expect(badge.className).toContain('text-sm');
    });
  });

  describe('Styling', () => {
    it('has rounded-full class', () => {
      render(<Badge>Rounded</Badge>);

      const badge = screen.getByText('Rounded');
      expect(badge.className).toContain('rounded-full');
    });

    it('has font-medium class', () => {
      render(<Badge>Bold</Badge>);

      const badge = screen.getByText('Bold');
      expect(badge.className).toContain('font-medium');
    });

    it('has inline-flex and items-center classes', () => {
      render(<Badge>Flex</Badge>);

      const badge = screen.getByText('Flex');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);

      const badge = screen.getByText('Custom');
      expect(badge.className).toContain('custom-class');
    });

    it('merges custom className with variant styles', () => {
      render(
        <Badge variant="success" className="custom-class">
          Merged
        </Badge>
      );

      const badge = screen.getByText('Merged');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('custom-class');
    });
  });

  describe('HTML Attributes', () => {
    it('forwards data attributes', () => {
      render(<Badge data-testid="test-badge">Test</Badge>);

      expect(screen.getByTestId('test-badge')).toBeInTheDocument();
    });

    it('forwards id attribute', () => {
      render(<Badge id="badge-id">Test</Badge>);

      const badge = screen.getByText('Test');
      expect(badge).toHaveAttribute('id', 'badge-id');
    });
  });

  describe('Common Use Cases', () => {
    it('renders status badge', () => {
      render(<Badge variant="success">Active</Badge>);

      const badge = screen.getByText('Active');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-green-100');
    });

    it('renders priority badge', () => {
      render(<Badge variant="error">High Priority</Badge>);

      const badge = screen.getByText('High Priority');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-red-100');
    });

    it('renders count badge', () => {
      render(<Badge size="sm">5</Badge>);

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
    });
  });
});
