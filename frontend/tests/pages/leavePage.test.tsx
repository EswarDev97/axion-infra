/**
 * Leave Page Tests
 * Per SDLC Phase 7 Task 7.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeavePageClient } from '@/app/(app)/dashboard/leave/LeavePageClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock child components
vi.mock('@/components/leave/LeaveBalanceCard', () => ({
  LeaveBalanceCard: () => <div data-testid="leave-balance-card">Leave Balance Card</div>,
}));

vi.mock('@/components/leave/LeaveRequestList', () => ({
  LeaveRequestList: ({ mode }: { mode: string }) => (
    <div data-testid="leave-request-list">Leave Request List - {mode}</div>
  ),
}));

vi.mock('@/components/leave/LeaveRequestForm', () => ({
  LeaveRequestForm: ({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    isOpen ? (
      <div data-testid="leave-request-form" role="dialog">
        Leave Request Form
        <button onClick={onClose}>Close</button>
        <button onClick={onSuccess}>Submit</button>
      </div>
    ) : null
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('LeavePageClient', () => {
  const mockPush = vi.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as vi.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as vi.Mock).mockReturnValue(mockSearchParams);
  });

  describe('Rendering', () => {
    it('renders page header', () => {
      renderWithProviders(<LeavePageClient view="my" />);

      expect(screen.getByText('Leave Management')).toBeInTheDocument();
      expect(screen.getByText('Apply for leave and track your balance')).toBeInTheDocument();
    });

    it('renders apply for leave button', () => {
      renderWithProviders(<LeavePageClient view="my" />);

      expect(screen.getByRole('button', { name: /apply for leave/i })).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      renderWithProviders(<LeavePageClient view="my" />);

      expect(screen.getByText('My Requests')).toBeInTheDocument();
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
      expect(screen.getByText('All Requests')).toBeInTheDocument();
    });
  });

  describe('Leave Balance Card', () => {
    it('shows leave balance card on my requests view', () => {
      renderWithProviders(<LeavePageClient view="my" />);

      expect(screen.getByTestId('leave-balance-card')).toBeInTheDocument();
    });

    it('hides leave balance card on pending view', () => {
      renderWithProviders(<LeavePageClient view="pending" />);

      expect(screen.queryByTestId('leave-balance-card')).not.toBeInTheDocument();
    });

    it('hides leave balance card on all view', () => {
      renderWithProviders(<LeavePageClient view="all" />);

      expect(screen.queryByTestId('leave-balance-card')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('highlights current tab', () => {
      renderWithProviders(<LeavePageClient view="pending" />);

      const pendingTab = screen.getByText('Pending Approvals');
      expect(pendingTab).toHaveClass('text-primary-600');
    });

    it('navigates when tab is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LeavePageClient view="my" />);

      await user.click(screen.getByText('Pending Approvals'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/leave?view=pending');
    });

    it('passes correct mode to LeaveRequestList', () => {
      renderWithProviders(<LeavePageClient view="pending" />);

      expect(screen.getByText('Leave Request List - pending')).toBeInTheDocument();
    });
  });

  describe('Leave Request Form Modal', () => {
    it('opens form when apply button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LeavePageClient view="my" />);

      expect(screen.queryByTestId('leave-request-form')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /apply for leave/i }));

      expect(screen.getByTestId('leave-request-form')).toBeInTheDocument();
    });

    it('closes form when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LeavePageClient view="my" />);

      await user.click(screen.getByRole('button', { name: /apply for leave/i }));
      expect(screen.getByTestId('leave-request-form')).toBeInTheDocument();

      await user.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('leave-request-form')).not.toBeInTheDocument();
      });
    });

    it('closes form on successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LeavePageClient view="my" />);

      await user.click(screen.getByRole('button', { name: /apply for leave/i }));
      expect(screen.getByTestId('leave-request-form')).toBeInTheDocument();

      await user.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.queryByTestId('leave-request-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('View Variations', () => {
    it('renders correctly for my view', () => {
      renderWithProviders(<LeavePageClient view="my" />);

      expect(screen.getByTestId('leave-balance-card')).toBeInTheDocument();
      expect(screen.getByText('Leave Request List - my')).toBeInTheDocument();
    });

    it('renders correctly for pending view', () => {
      renderWithProviders(<LeavePageClient view="pending" />);

      expect(screen.queryByTestId('leave-balance-card')).not.toBeInTheDocument();
      expect(screen.getByText('Leave Request List - pending')).toBeInTheDocument();
    });

    it('renders correctly for all view', () => {
      renderWithProviders(<LeavePageClient view="all" />);

      expect(screen.queryByTestId('leave-balance-card')).not.toBeInTheDocument();
      expect(screen.getByText('Leave Request List - all')).toBeInTheDocument();
    });
  });
});
