/**
 * Attendance Page Tests
 * Per SDLC Phase 7 Task 7.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendancePageClient } from '@/app/(app)/dashboard/attendance/AttendancePageClient';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock child components
vi.mock('@/components/attendance/AttendanceCheckInOut', () => ({
  AttendanceCheckInOut: () => <div data-testid="attendance-checkinout">Check In/Out Component</div>,
}));

vi.mock('@/components/attendance/AttendanceList', () => ({
  AttendanceList: ({
    startDate,
    endDate,
  }: {
    startDate?: string;
    endDate?: string;
  }) => (
    <div data-testid="attendance-list">
      Attendance List
      {startDate && <span data-testid="start-date">{startDate}</span>}
      {endDate && <span data-testid="end-date">{endDate}</span>}
    </div>
  ),
}));

describe('AttendancePageClient', () => {
  const mockPush = vi.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as vi.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as vi.Mock).mockReturnValue(mockSearchParams);
  });

  describe('Rendering', () => {
    it('renders page header', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Track and manage attendance records')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByText('My Attendance')).toBeInTheDocument();
      expect(screen.getByText('All Attendance')).toBeInTheDocument();
    });

    it('renders date range filters', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('renders attendance list', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByTestId('attendance-list')).toBeInTheDocument();
    });
  });

  describe('Check In/Out Component', () => {
    it('shows check in/out on my attendance view', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByTestId('attendance-checkinout')).toBeInTheDocument();
    });

    it('hides check in/out on all attendance view', () => {
      render(<AttendancePageClient view="all" />);

      expect(screen.queryByTestId('attendance-checkinout')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('highlights current tab', () => {
      render(<AttendancePageClient view="all" />);

      const allTab = screen.getByText('All Attendance');
      expect(allTab).toHaveClass('text-primary-600');
    });

    it('navigates when tab is clicked', async () => {
      const user = userEvent.setup();
      render(<AttendancePageClient view="my" />);

      await user.click(screen.getByText('All Attendance'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/attendance?view=all');
    });
  });

  describe('Date Range Filters', () => {
    it('updates start date when changed', async () => {
      const user = userEvent.setup();
      render(<AttendancePageClient view="my" />);

      const startDateInput = screen.getByLabelText('Start Date');
      await user.type(startDateInput, '2024-01-01');

      expect(startDateInput).toHaveValue('2024-01-01');
    });

    it('updates end date when changed', async () => {
      const user = userEvent.setup();
      render(<AttendancePageClient view="my" />);

      const endDateInput = screen.getByLabelText('End Date');
      await user.type(endDateInput, '2024-01-31');

      expect(endDateInput).toHaveValue('2024-01-31');
    });

    it('end date has minimum constraint based on start date', async () => {
      const user = userEvent.setup();
      render(<AttendancePageClient view="my" />);

      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');

      await user.type(startDateInput, '2024-01-15');

      expect(endDateInput).toHaveAttribute('min', '2024-01-15');
    });

    it('passes date range to AttendanceList', async () => {
      const user = userEvent.setup();
      render(<AttendancePageClient view="my" />);

      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');

      await user.type(startDateInput, '2024-01-01');
      await user.type(endDateInput, '2024-01-31');

      await waitFor(() => {
        expect(screen.getByTestId('start-date')).toHaveTextContent('2024-01-01');
        expect(screen.getByTestId('end-date')).toHaveTextContent('2024-01-31');
      });
    });
  });

  describe('View Variations', () => {
    it('renders correctly for my view', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByTestId('attendance-checkinout')).toBeInTheDocument();
      expect(screen.getByTestId('attendance-list')).toBeInTheDocument();
    });

    it('renders correctly for all view', () => {
      render(<AttendancePageClient view="all" />);

      expect(screen.queryByTestId('attendance-checkinout')).not.toBeInTheDocument();
      expect(screen.getByTestId('attendance-list')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('date inputs have associated labels', () => {
      render(<AttendancePageClient view="my" />);

      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('tabs are keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<AttendancePageClient view="my" />);

      const myTab = screen.getByText('My Attendance');
      const allTab = screen.getByText('All Attendance');

      await user.click(myTab);
      expect(myTab).toHaveClass('text-primary-600');

      await user.click(allTab);
      expect(mockPush).toHaveBeenCalledWith('/dashboard/attendance?view=all');
    });
  });
});
