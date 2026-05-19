/**
 * SearchInput Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '@/components/form/SearchInput';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with default placeholder', () => {
      render(<SearchInput onSearch={vi.fn()} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<SearchInput onSearch={vi.fn()} placeholder="Find employees..." />);

      expect(screen.getByPlaceholderText('Find employees...')).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<SearchInput onSearch={vi.fn()} defaultValue="initial search" />);

      expect(screen.getByDisplayValue('initial search')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<SearchInput onSearch={vi.fn()} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('calls onSearch with debounce', async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SearchInput onSearch={onSearch} debounceMs={300} />);

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'test');

      // Should not be called immediately
      expect(onSearch).not.toHaveBeenCalled();

      // Advance timers past debounce
      vi.advanceTimersByTime(300);

      expect(onSearch).toHaveBeenCalledWith('test');
    });

    it('debounces multiple rapid inputs', async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SearchInput onSearch={onSearch} debounceMs={300} />);

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'abc');

      // Advance timers
      vi.advanceTimersByTime(300);

      // Should be called only once with final value
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('abc');
    });
  });

  describe('Clear Functionality', () => {
    it('shows clear button when input has value', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SearchInput onSearch={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'test');

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('hides clear button when input is empty', () => {
      render(<SearchInput onSearch={vi.fn()} />);

      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    });

    it('clears input and calls onSearch with empty string', async () => {
      const onSearch = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SearchInput onSearch={onSearch} defaultValue="initial" />);

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      expect(screen.getByPlaceholderText('Search...')).toHaveValue('');
      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('Accessibility', () => {
    it('input is focusable', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput onSearch={vi.fn()} />);

      await user.tab();
      expect(screen.getByPlaceholderText('Search...')).toHaveFocus();
    });

    it('clear button has aria-label', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SearchInput onSearch={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'test');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });

    it('input has type="search"', () => {
      render(<SearchInput onSearch={vi.fn()} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <SearchInput onSearch={vi.fn()} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
