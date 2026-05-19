/**
 * TaskList Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskList } from '@/components/tasks/TaskList';
import { useTaskStore } from '@/stores/taskStore';
import { useRouter } from 'next/navigation';

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the task store
vi.mock('@/stores/taskStore', () => ({
  useTaskStore: vi.fn(),
}));

const mockTasks = [
  {
    id: '1',
    title: 'Complete project documentation',
    description: 'Write comprehensive docs for the API',
    statusName: 'In Progress',
    statusColor: '#3B82F6',
    priority: 'HIGH',
    assignees: [
      { id: 'a1', userName: 'John Doe', userAvatar: null },
      { id: 'a2', userName: 'Jane Smith', userAvatar: null },
    ],
    dueDate: '2024-01-20',
    createdByName: 'Admin User',
  },
  {
    id: '2',
    title: 'Review pull requests',
    description: null,
    statusName: 'Todo',
    statusColor: '#9CA3AF',
    priority: 'MEDIUM',
    assignees: [
      { id: 'a1', userName: 'John Doe', userAvatar: null },
    ],
    dueDate: null,
    createdByName: 'Manager',
  },
];

const mockStoreState = {
  tasks: mockTasks,
  isLoading: false,
  currentPage: 1,
  totalPages: 1,
  totalItems: 2,
  pageSize: 10,
  fetchTasks: vi.fn(),
  setFilters: vi.fn(),
};

describe('TaskList', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as vi.Mock).mockReturnValue({ push: mockPush });
    (useTaskStore as vi.Mock).mockReturnValue(mockStoreState);
  });

  describe('Rendering', () => {
    it('renders task list with tasks', () => {
      render(<TaskList />);

      expect(screen.getByText('Complete project documentation')).toBeInTheDocument();
      expect(screen.getByText('Review pull requests')).toBeInTheDocument();
    });

    it('renders task descriptions', () => {
      render(<TaskList />);

      expect(screen.getByText('Write comprehensive docs for the API')).toBeInTheDocument();
    });

    it('renders task status badges', () => {
      render(<TaskList />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Todo')).toBeInTheDocument();
    });

    it('renders priority badges', () => {
      render(<TaskList />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders due dates', () => {
      render(<TaskList />);

      // Check for formatted date
      const dateCell = screen.getByText(/1\/20\/2024|20\/01\/2024|Jan 20, 2024/i);
      expect(dateCell).toBeInTheDocument();
    });

    it('renders dash for missing due date', () => {
      render(<TaskList />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders created by names', () => {
      render(<TaskList />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('renders assignee avatars', () => {
      const { container } = render(<TaskList />);

      // Should have avatars
      const avatars = container.querySelectorAll('[class*="rounded-full"]');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      (useTaskStore as vi.Mock).mockReturnValue({
        ...mockStoreState,
        isLoading: true,
        tasks: [],
      });

      const { container } = render(<TaskList />);

      // DataTable shows loading indicator
      const loadingIndicator = container.querySelector('[aria-busy="true"]') ||
        screen.queryByText(/loading/i);
      expect(loadingIndicator || container.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no tasks', () => {
      (useTaskStore as vi.Mock).mockReturnValue({
        ...mockStoreState,
        tasks: [],
      });

      render(<TaskList />);

      expect(screen.getByText('No tasks found')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('calls setFilters when filters prop changes', () => {
      const filters = { status: 'IN_PROGRESS' };

      render(<TaskList filters={filters} />);

      expect(mockStoreState.setFilters).toHaveBeenCalledWith(filters);
    });

    it('calls fetchTasks with filters on mount', () => {
      const filters = { priority: 'HIGH' };

      render(<TaskList filters={filters} />);

      expect(mockStoreState.fetchTasks).toHaveBeenCalledWith({ ...filters, page: 1 });
    });
  });

  describe('Navigation', () => {
    it('navigates to task detail when row is clicked', async () => {
      const user = userEvent.setup();

      render(<TaskList />);

      // Click on the first task row
      const taskTitle = screen.getByText('Complete project documentation');
      await user.click(taskTitle.closest('tr') || taskTitle);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks/1');
    });

    it('calls onTaskClick callback when provided', async () => {
      const onTaskClick = vi.fn();
      const user = userEvent.setup();

      render(<TaskList onTaskClick={onTaskClick} />);

      const taskTitle = screen.getByText('Complete project documentation');
      await user.click(taskTitle.closest('tr') || taskTitle);

      expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('calls fetchTasks on page change', async () => {
      (useTaskStore as vi.Mock).mockReturnValue({
        ...mockStoreState,
        totalPages: 3,
        totalItems: 30,
      });

      const user = userEvent.setup();

      render(<TaskList />);

      // Find and click the next page button
      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      expect(mockStoreState.fetchTasks).toHaveBeenCalledWith({ page: 2 });
    });
  });

  describe('Column Headers', () => {
    it('renders all column headers', () => {
      render(<TaskList />);

      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Assignees')).toBeInTheDocument();
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByText('Created By')).toBeInTheDocument();
    });
  });

  describe('Assignees Display', () => {
    it('shows overflow count for many assignees', () => {
      const taskWithManyAssignees = {
        ...mockTasks[0],
        assignees: [
          { id: 'a1', userName: 'User 1', userAvatar: null },
          { id: 'a2', userName: 'User 2', userAvatar: null },
          { id: 'a3', userName: 'User 3', userAvatar: null },
          { id: 'a4', userName: 'User 4', userAvatar: null },
          { id: 'a5', userName: 'User 5', userAvatar: null },
        ],
      };

      (useTaskStore as vi.Mock).mockReturnValue({
        ...mockStoreState,
        tasks: [taskWithManyAssignees],
      });

      render(<TaskList />);

      // Should show +2 for 5 assignees (3 shown, 2 hidden)
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Overdue Tasks', () => {
    it('highlights overdue tasks', () => {
      const overdueTask = {
        ...mockTasks[0],
        dueDate: '2020-01-01', // Past date
      };

      (useTaskStore as vi.Mock).mockReturnValue({
        ...mockStoreState,
        tasks: [overdueTask],
      });

      render(<TaskList />);

      // The due date should have red styling for overdue
      const dateElement = screen.getByText(/1\/1\/2020|01\/01\/2020|Jan 1, 2020/i);
      expect(dateElement).toHaveClass('text-red-600');
    });
  });
});
