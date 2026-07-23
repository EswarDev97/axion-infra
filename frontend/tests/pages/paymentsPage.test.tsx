/**
 * Payments Page Tests
 * Task T12 — list, search, pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentsPageClient } from '@/app/(app)/dashboard/payments/PaymentsPageClient';
import { paymentService, type Payment } from '@/services/complaint/paymentService';

vi.mock('@/services/complaint/paymentService', async () => {
  const actual = await vi.importActual<typeof import('@/services/complaint/paymentService')>(
    '@/services/complaint/paymentService'
  );
  return {
    ...actual,
    paymentService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedList = paymentService.list as unknown as ReturnType<typeof vi.fn>;

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay-1',
  caseReference: 'CASE-1001',
  clientId: 'client-abc-123',
  financeId: null,
  vehicleRegistrationNumber: 'KA01AB1234',
  executiveEmployeeId: 'emp-xyz-789',
  caseStatus: 'ASSIGNED',
  billingStatus: 'COMPANY_BILLING',
  paymentMode: null,
  utrNumber: null,
  transactionDatetime: null,
  amount: 5000,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

describe('PaymentsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
      pages: 0,
    });
  });

  describe('list rendering', () => {
    it('renders table rows for returned payments', async () => {
      const payment = makePayment();
      mockedList.mockResolvedValue({
        items: [payment],
        total: 1,
        page: 1,
        limit: 200,
        pages: 1,
      });

      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('CASE-1001')).toBeInTheDocument();
      });

      expect(screen.getByText('client-abc-123')).toBeInTheDocument();
      expect(screen.getByText('KA01AB1234')).toBeInTheDocument();
      expect(screen.getByText('emp-xyz-789')).toBeInTheDocument();
      expect(screen.getByText('ASSIGNED')).toBeInTheDocument();
      expect(screen.getByText('COMPANY_BILLING')).toBeInTheDocument();
      expect(screen.getByText('5000')).toBeInTheDocument();
    });

    it('re-calls paymentService.list with the search term on Enter', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText(/search payments/i);
      await user.type(searchInput, 'CASE-1001{Enter}');

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'CASE-1001' })
        );
      });
    });
  });
});
