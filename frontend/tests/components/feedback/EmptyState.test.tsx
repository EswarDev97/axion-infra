/**
 * EmptyState Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/feedback/EmptyState';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders with title', () => {
      render(<EmptyState title="No items found" />);

      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <EmptyState
          title="No items found"
          description="Try adjusting your search criteria"
        />
      );

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
    });

    it('renders without description', () => {
      render(<EmptyState title="Empty" />);

      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('renders icon', () => {
      const { container } = render(<EmptyState title="No items" />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders default icon', () => {
      const { container } = render(<EmptyState title="No items" icon="default" />);

      const iconContainer = container.querySelector('.bg-gray-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<EmptyState title="No results" icon="search" />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders custom icon', () => {
      render(
        <EmptyState
          title="Custom"
          customIcon={<span data-testid="custom-icon">🎉</span>}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it.each(['file', 'folder', 'users', 'tasks'] as const)(
      'renders %s icon',
      (icon) => {
        const { container } = render(<EmptyState title="Test" icon={icon} />);

        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      }
    );
  });

  describe('Action Button', () => {
    it('renders action button with onClick', () => {
      const handleClick = vi.fn();

      render(
        <EmptyState
          title="No items"
          action={{ label: 'Add Item', onClick: handleClick }}
        />
      );

      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    });

    it('calls onClick when action button is clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <EmptyState
          title="No items"
          action={{ label: 'Add Item', onClick: handleClick }}
        />
      );

      await user.click(screen.getByRole('button', { name: /add item/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders action as link when href is provided', () => {
      render(
        <EmptyState
          title="No items"
          action={{ label: 'Go to Dashboard', href: '/dashboard' }}
        />
      );

      const link = screen.getByRole('link', { name: /go to dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('does not render action button when no action provided', () => {
      render(<EmptyState title="No items" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <EmptyState title="No items" className="custom-class" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('has centered layout', () => {
      const { container } = render(<EmptyState title="No items" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('has proper padding', () => {
      const { container } = render(<EmptyState title="No items" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('py-12');
      expect(wrapper).toHaveClass('px-4');
    });
  });

  describe('Text Styling', () => {
    it('title has proper styling', () => {
      render(<EmptyState title="No items" />);

      const title = screen.getByText('No items');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-medium');
    });

    it('description has proper styling', () => {
      render(
        <EmptyState title="No items" description="Some description" />
      );

      const description = screen.getByText('Some description');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-gray-500');
      expect(description).toHaveClass('text-center');
    });
  });

  describe('Common Use Cases', () => {
    it('renders no search results state', () => {
      render(
        <EmptyState
          icon="search"
          title="No results found"
          description="Try adjusting your search or filters"
          action={{ label: 'Clear Filters', onClick: vi.fn() }}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('renders no tasks state', () => {
      render(
        <EmptyState
          icon="tasks"
          title="No tasks yet"
          description="Create your first task to get started"
          action={{ label: 'Create Task', href: '/tasks/new' }}
        />
      );

      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create task/i })).toHaveAttribute('href', '/tasks/new');
    });

    it('renders no users state', () => {
      render(
        <EmptyState
          icon="users"
          title="No team members"
          description="Invite your team to collaborate"
          action={{ label: 'Invite Team', onClick: vi.fn() }}
        />
      );

      expect(screen.getByText('No team members')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /invite team/i })).toBeInTheDocument();
    });
  });
});
