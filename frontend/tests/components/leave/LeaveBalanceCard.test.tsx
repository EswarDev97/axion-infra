/**
 * LeaveBalanceCard Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';
import { leaveBalanceService } from '@/services/hr';

// Mock the leave balance service
vi.mock('@/services/hr', () => ({
  leaveBalanceService: {
    getByEmployee: vi.fn(),
    getCurrentUserBalances: vi.fn(),
  },
}));

const mockBalances = [
  {
    id: '1',
    leaveTypeName: 'Annual Leave',
    entitledDays: 20,
    usedDays: 5,
    availableDays: 15,
    pendingDays: 2,
    carryForwardDays: 3,
  },
  {
    id: '2',
    leaveTypeName: 'Sick Leave',
    entitledDays: 10,
    usedDays: 2,
    availableDays: 8,
    pendingDays: 0,
    carryForwardDays: 0,
  },
];

describe('LeaveBalanceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeleton initially', () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(<LeaveBalanceCard />);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows 4 skeleton cards while loading', () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(<LeaveBalanceCard />);

      const skeletonCards = container.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBe(4);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no balances', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue([]);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(screen.getByText(/no leave balances available/i)).toBeInTheDocument();
      });
    });

    it('shows current year in empty message', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue([]);

      render(<LeaveBalanceCard year={2024} />);

      await waitFor(() => {
        expect(screen.getByText(/2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Displaying Balances', () => {
    it('renders leave type names', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(screen.getByText('Annual Leave')).toBeInTheDocument();
        expect(screen.getByText('Sick Leave')).toBeInTheDocument();
      });
    });

    it('renders available days prominently', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('renders entitled days', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(screen.getByText(/\/ 20 days/)).toBeInTheDocument();
        expect(screen.getByText(/\/ 10 days/)).toBeInTheDocument();
      });
    });

    it('renders used, pending, and carry forward details', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        // Check used days
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Could be sick leave or pending

        // Check labels
        expect(screen.getAllByText('Used').length).toBe(2);
        expect(screen.getAllByText('Pending').length).toBe(2);
        expect(screen.getAllByText('Carry Over').length).toBe(2);
      });
    });

    it('renders progress bar', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      const { container } = render(<LeaveBalanceCard />);

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.bg-primary-500');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Calls', () => {
    it('calls getCurrentUserBalances when no employeeId provided', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(leaveBalanceService.getCurrentUserBalances).toHaveBeenCalled();
      });
    });

    it('calls getByEmployee when employeeId is provided', async () => {
      (leaveBalanceService.getByEmployee as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard employeeId="emp-123" />);

      await waitFor(() => {
        expect(leaveBalanceService.getByEmployee).toHaveBeenCalledWith('emp-123', expect.any(Number));
      });
    });

    it('passes year to API call', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard year={2024} />);

      await waitFor(() => {
        expect(leaveBalanceService.getCurrentUserBalances).toHaveBeenCalledWith(2024);
      });
    });

    it('uses current year when year not specified', async () => {
      const currentYear = new Date().getFullYear();
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(leaveBalanceService.getCurrentUserBalances).toHaveBeenCalledWith(currentYear);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockRejectedValue(
        new Error('API Error')
      );

      render(<LeaveBalanceCard />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch leave balances:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Layout', () => {
    it('uses grid layout for cards', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      const { container } = render(<LeaveBalanceCard />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toBeInTheDocument();
      });
    });

    it('has responsive grid columns', async () => {
      (leaveBalanceService.getCurrentUserBalances as vi.Mock).mockResolvedValue(mockBalances);

      const { container } = render(<LeaveBalanceCard />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass('md:grid-cols-2');
        expect(grid).toHaveClass('lg:grid-cols-4');
      });
    });
  });
});
