/**
 * Spinner Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  describe('Rendering', () => {
    it('renders spinner', () => {
      render(<Spinner />);

      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('renders as svg element', () => {
      const { container } = render(<Spinner />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has animation class', () => {
      const { container } = render(<Spinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('Sizes', () => {
    it('renders sm size correctly', () => {
      const { container } = render(<Spinner size="sm" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4');
      expect(svg).toHaveClass('w-4');
    });

    it('renders md size correctly (default)', () => {
      const { container } = render(<Spinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6');
      expect(svg).toHaveClass('w-6');
    });

    it('renders lg size correctly', () => {
      const { container } = render(<Spinner size="lg" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8');
      expect(svg).toHaveClass('w-8');
    });
  });

  describe('Styling', () => {
    it('uses currentColor for text', () => {
      const { container } = render(<Spinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-current');
    });

    it('applies custom className', () => {
      const { container } = render(<Spinner className="text-primary-500" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-primary-500');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<Spinner className="custom-class" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
      expect(svg).toHaveClass('custom-class');
    });
  });

  describe('SVG Structure', () => {
    it('has proper viewBox', () => {
      const { container } = render(<Spinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('has circle element', () => {
      const { container } = render(<Spinner />);

      const circle = container.querySelector('circle');
      expect(circle).toBeInTheDocument();
    });

    it('has path element', () => {
      const { container } = render(<Spinner />);

      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
    });

    it('circle has opacity styling', () => {
      const { container } = render(<Spinner />);

      const circle = container.querySelector('circle');
      expect(circle).toHaveClass('opacity-25');
    });

    it('path has opacity styling', () => {
      const { container } = render(<Spinner />);

      const path = container.querySelector('path');
      expect(path).toHaveClass('opacity-75');
    });
  });

  describe('Accessibility', () => {
    it('has aria-label', () => {
      render(<Spinner />);

      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    it('is not focusable', () => {
      const { container } = render(<Spinner />);

      const svg = container.querySelector('svg');
      expect(svg).not.toHaveAttribute('tabindex');
    });
  });

  describe('Common Use Cases', () => {
    it('renders loading indicator for button', () => {
      const { container } = render(<Spinner size="sm" className="text-white" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4');
      expect(svg).toHaveClass('text-white');
    });

    it('renders page loading spinner', () => {
      const { container } = render(<Spinner size="lg" className="text-primary-600" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8');
      expect(svg).toHaveClass('text-primary-600');
    });

    it('renders inline spinner', () => {
      const { container } = render(
        <span className="inline-flex items-center">
          <Spinner size="sm" />
          <span className="ml-2">Loading...</span>
        </span>
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
