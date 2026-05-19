/**
 * Pagination Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination, PaginationMeta } from '@/components/data/Pagination';

const createMeta = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
  page: 1,
  pageSize: 10,
  totalItems: 100,
  totalPages: 10,
  hasNext: true,
  hasPrevious: false,
  ...overrides,
});

describe('Pagination', () => {
  describe('Rendering', () => {
    it('renders pagination info', () => {
      render(<Pagination meta={createMeta()} onPageChange={vi.fn()} />);

      expect(screen.getByText(/showing/i)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('renders navigation buttons', () => {
      render(<Pagination meta={createMeta()} onPageChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: /first page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /last page/i })).toBeInTheDocument();
    });

    it('renders page numbers when showPageNumbers is true', () => {
      render(
        <Pagination
          meta={createMeta({ page: 5 })}
          onPageChange={vi.fn()}
          showPageNumbers={true}
        />
      );

      // Should show page numbers around current page
      expect(screen.getByRole('button', { name: /go to page 5/i })).toBeInTheDocument();
    });

    it('hides page numbers when showPageNumbers is false', () => {
      render(
        <Pagination
          meta={createMeta()}
          onPageChange={vi.fn()}
          showPageNumbers={false}
        />
      );

      expect(screen.queryByRole('button', { name: /go to page 1/i })).not.toBeInTheDocument();
    });
  });

  describe('Pagination Info', () => {
    it('shows correct range for first page', () => {
      render(<Pagination meta={createMeta()} onPageChange={vi.fn()} />);

      expect(screen.getByText(/showing/i)).toHaveTextContent(/1.*to.*10.*of.*100/i);
    });

    it('shows correct range for middle page', () => {
      render(
        <Pagination
          meta={createMeta({ page: 5 })}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText(/showing/i)).toHaveTextContent(/41.*to.*50.*of.*100/i);
    });

    it('shows correct range for last page with partial results', () => {
      render(
        <Pagination
          meta={createMeta({ page: 10, totalItems: 95 })}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText(/showing/i)).toHaveTextContent(/91.*to.*95.*of.*95/i);
    });
  });

  describe('Button States', () => {
    it('disables previous buttons on first page', () => {
      render(
        <Pagination
          meta={createMeta({ page: 1, hasPrevious: false })}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /first page/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    });

    it('disables next buttons on last page', () => {
      render(
        <Pagination
          meta={createMeta({ page: 10, hasNext: false })}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /last page/i })).toBeDisabled();
    });

    it('enables all buttons on middle page', () => {
      render(
        <Pagination
          meta={createMeta({ page: 5, hasPrevious: true, hasNext: true })}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /first page/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /last page/i })).not.toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('calls onPageChange with 1 when first page button clicked', async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Pagination
          meta={createMeta({ page: 5, hasPrevious: true })}
          onPageChange={onPageChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /first page/i }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange with previous page when previous button clicked', async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Pagination
          meta={createMeta({ page: 5, hasPrevious: true })}
          onPageChange={onPageChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /previous page/i }));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('calls onPageChange with next page when next button clicked', async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Pagination
          meta={createMeta({ page: 5 })}
          onPageChange={onPageChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /next page/i }));
      expect(onPageChange).toHaveBeenCalledWith(6);
    });

    it('calls onPageChange with total pages when last page button clicked', async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Pagination
          meta={createMeta({ page: 5, totalPages: 10 })}
          onPageChange={onPageChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /last page/i }));
      expect(onPageChange).toHaveBeenCalledWith(10);
    });

    it('calls onPageChange when page number is clicked', async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Pagination
          meta={createMeta({ page: 5, totalPages: 10 })}
          onPageChange={onPageChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /go to page 6/i }));
      expect(onPageChange).toHaveBeenCalledWith(6);
    });
  });

  describe('Page Numbers Display', () => {
    it('shows ellipsis for large page ranges', () => {
      render(
        <Pagination
          meta={createMeta({ page: 5, totalPages: 20 })}
          onPageChange={vi.fn()}
        />
      );

      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('highlights current page', () => {
      render(
        <Pagination
          meta={createMeta({ page: 5 })}
          onPageChange={vi.fn()}
        />
      );

      const currentPageButton = screen.getByRole('button', { name: /go to page 5/i });
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Accessibility', () => {
    it('navigation buttons have proper aria-labels', () => {
      render(<Pagination meta={createMeta()} onPageChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: /go to first page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to last page/i })).toBeInTheDocument();
    });

    it('page number buttons have proper aria-labels', () => {
      render(
        <Pagination
          meta={createMeta({ page: 5 })}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /go to page 1/i })).toBeInTheDocument();
    });

    it('can navigate with keyboard', async () => {
      const onPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Pagination
          meta={createMeta({ page: 5, hasPrevious: true })}
          onPageChange={onPageChange}
        />
      );

      await user.tab();
      await user.keyboard('{Enter}');

      expect(onPageChange).toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Pagination
          meta={createMeta()}
          onPageChange={vi.fn()}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
