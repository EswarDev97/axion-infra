/**
 * AttendanceCheckInOut Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttendanceCheckInOut } from '@/components/attendance/AttendanceCheckInOut';
import { attendanceService } from '@/services/hr';

// Mock the attendance service
vi.mock('@/services/hr', () => ({
  attendanceService: {
    getTodayStatus: vi.fn(),
    checkIn: vi.fn(),
    checkOut: vi.fn(),
  },
}));

const mockAttendanceRecord = {
  id: '1',
  checkIn: '2024-01-15T09:00:00Z',
  checkOut: null,
  workHours: null,
};

const mockCompleteRecord = {
  id: '1',
  checkIn: '2024-01-15T09:00:00Z',
  checkOut: '2024-01-15T17:00:00Z',
  workHours: 8.0,
};

describe('AttendanceCheckInOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('shows loading skeleton initially', () => {
      (attendanceService.getTodayStatus as vi.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(<AttendanceCheckInOut />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Check In State', () => {
    it('shows check in button when not checked in', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
      });
    });

    it('calls checkIn when button is clicked', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);
      (attendanceService.checkIn as vi.Mock).mockResolvedValue(mockAttendanceRecord);

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check in/i }));

      expect(attendanceService.checkIn).toHaveBeenCalled();
    });
  });

  describe('Check Out State', () => {
    it('shows check out button when checked in but not out', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockAttendanceRecord);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
      });
    });

    it('shows check in time when checked in', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockAttendanceRecord);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByText(/checked in at/i)).toBeInTheDocument();
      });
    });

    it('calls checkOut when button is clicked', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockAttendanceRecord);
      (attendanceService.checkOut as vi.Mock).mockResolvedValue(mockCompleteRecord);

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check out/i }));

      expect(attendanceService.checkOut).toHaveBeenCalled();
    });
  });

  describe('Complete State', () => {
    it('shows day complete message when both checked in and out', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockCompleteRecord);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByText(/day complete/i)).toBeInTheDocument();
      });
    });

    it('shows check out time when complete', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockCompleteRecord);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByText(/checked out at/i)).toBeInTheDocument();
      });
    });

    it('shows total work hours when complete', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockCompleteRecord);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByText(/total hours/i)).toBeInTheDocument();
        expect(screen.getByText(/8.0 hrs/i)).toBeInTheDocument();
      });
    });

    it('does not show check in or check out buttons when complete', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockCompleteRecord);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /check out/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Time Display', () => {
    it('shows Time Tracking heading', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByText('Time Tracking')).toBeInTheDocument();
      });
    });

    it('displays current date', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        // The date should be displayed
        const dateRegex = /\w+, \w+ \d+, \d+/;
        expect(screen.getByText(dateRegex)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error alert on check in failure', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);
      (attendanceService.checkIn as vi.Mock).mockRejectedValue(new Error('Check in failed'));

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/check in failed/i)).toBeInTheDocument();
      });
    });

    it('shows error alert on check out failure', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockAttendanceRecord);
      (attendanceService.checkOut as vi.Mock).mockRejectedValue(new Error('Check out failed'));

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check out/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/check out failed/i)).toBeInTheDocument();
      });
    });

    it('allows dismissing error alert', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);
      (attendanceService.checkIn as vi.Mock).mockRejectedValue(new Error('Check in failed'));

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Dismiss the alert
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States During Actions', () => {
    it('shows loading state during check in', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(null);
      (attendanceService.checkIn as vi.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check in/i }));

      // Button should be in loading state
      const button = screen.getByRole('button', { name: /check in/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('shows loading state during check out', async () => {
      (attendanceService.getTodayStatus as vi.Mock).mockResolvedValue(mockAttendanceRecord);
      (attendanceService.checkOut as vi.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<AttendanceCheckInOut />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /check out/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /check out/i }));

      // Button should be in loading state
      const button = screen.getByRole('button', { name: /check out/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});
