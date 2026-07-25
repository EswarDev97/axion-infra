/**
 * Payments Page Tests
 * Task T12 — list, search, pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentsPageClient } from '@/app/(app)/dashboard/payments/PaymentsPageClient';
import { paymentService, type Payment } from '@/services/complaint/paymentService';
import { clientService } from '@/services/complaint/clientService';
import { employeeService } from '@/services/hr/hrService';
import { useAuthStore } from '@/stores/authStore';

// Default: full payments:create + hr:read:all access, no EMPLOYEE role
// (matches HR_ADMIN/MANAGER, the roles these pre-existing tests assume).
// Tests specific to the EMPLOYEE experience override this per-test.
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(
    (
      selector: (state: {
        hasPermission: (p: string) => boolean;
        hasAnyPermission: (p: string[]) => boolean;
        hasAnyRole: (r: string[]) => boolean;
      }) => unknown
    ) =>
      selector({
        hasPermission: () => true,
        hasAnyPermission: () => true,
        hasAnyRole: () => false,
      })
  ),
}));

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

vi.mock('@/services/complaint/clientService', async () => {
  const actual = await vi.importActual<typeof import('@/services/complaint/clientService')>(
    '@/services/complaint/clientService'
  );
  return {
    ...actual,
    clientService: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('@/services/hr/hrService', async () => {
  const actual = await vi.importActual<typeof import('@/services/hr/hrService')>(
    '@/services/hr/hrService'
  );
  return {
    ...actual,
    employeeService: {
      ...actual.employeeService,
      list: vi.fn(),
      getMe: vi.fn(),
      fieldExecutives: vi.fn(),
    },
  };
});

type WorkSheet = Record<string, unknown>;
type WorkBook = { SheetNames: string[]; Sheets: Record<string, WorkSheet> };

const mockedJsonToSheet = vi.fn((_rows: Record<string, unknown>[]): WorkSheet => ({}));
const mockedBookNew = vi.fn((): WorkBook => ({ SheetNames: [], Sheets: {} }));
const mockedBookAppendSheet = vi.fn((_wb: WorkBook, _ws: WorkSheet, _name?: string) => undefined);
const mockedWriteFile = vi.fn((_wb: WorkBook, _filename: string) => undefined);

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (rows: Record<string, unknown>[]) => mockedJsonToSheet(rows),
    book_new: () => mockedBookNew(),
    book_append_sheet: (wb: WorkBook, ws: WorkSheet, name?: string) =>
      mockedBookAppendSheet(wb, ws, name),
  },
  writeFile: (wb: WorkBook, filename: string) => mockedWriteFile(wb, filename),
}));

const mockedList = paymentService.list as unknown as ReturnType<typeof vi.fn>;
const mockedClientList = clientService.list as unknown as ReturnType<typeof vi.fn>;
const mockedEmployeeList = employeeService.list as unknown as ReturnType<typeof vi.fn>;
const mockedGetMe = employeeService.getMe as unknown as ReturnType<typeof vi.fn>;
const mockedFieldExecutives = employeeService.fieldExecutives as unknown as ReturnType<typeof vi.fn>;

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
    // vi.clearAllMocks() clears call history but not a custom
    // mockImplementation set by an individual test — restore the default
    // full-access behavior here so later tests aren't affected by an
    // earlier test's override (see 'read-only access' describe block).
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (
        selector: (state: {
          hasPermission: (p: string) => boolean;
          hasAnyPermission: (p: string[]) => boolean;
          hasAnyRole: (r: string[]) => boolean;
        }) => unknown
      ) =>
        selector({
          hasPermission: () => true,
          hasAnyPermission: () => true,
          hasAnyRole: () => false,
        })
    );
    mockedList.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
      pages: 0,
    });
    mockedClientList.mockImplementation((params?: { type?: string }) => {
      if (params?.type === 'FINANCER') {
        return Promise.resolve({
          items: [
            { id: 'financer-1', name: 'Acme Finance Co', code: 'FIN', type: 'FINANCER', isActive: true, createdAt: '', updatedAt: '' },
          ],
          total: 1,
          page: 1,
          limit: 200,
          pages: 1,
        });
      }
      return Promise.resolve({
        items: [
          { id: 'client-1', name: 'Acme Insurance', code: 'ACME', type: 'CLIENT', isActive: true, createdAt: '', updatedAt: '' },
        ],
        total: 1,
        page: 1,
        limit: 200,
        pages: 1,
      });
    });
    const janeDoe = {
      id: 'emp-1',
      tenantId: 't-1',
      employeeCode: 'E001',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      positionId: 'pos-1',
      positionTitle: 'Field Executive',
      dateOfJoining: '2026-01-01',
      status: 'ACTIVE',
      employmentType: 'FULL_TIME',
      createdAt: '',
      updatedAt: '',
    };
    mockedEmployeeList.mockResolvedValue({
      items: [janeDoe],
      pagination: { page: 1, pageSize: 200, totalItems: 1, totalPages: 1, hasNext: false, hasPrev: false },
    });
    mockedGetMe.mockResolvedValue(janeDoe);
    mockedFieldExecutives.mockResolvedValue([janeDoe]);
  });

  describe('list rendering', () => {
    it('renders table rows for returned payments, resolving client/executive ids to names', async () => {
      const payment = makePayment({ clientId: 'client-1', executiveEmployeeId: 'emp-1' });
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

      const row = screen.getByText('CASE-1001').closest('tr') as HTMLElement;
      expect(within(row).getByText('1')).toBeInTheDocument();
      expect(within(row).getByText('Acme Insurance')).toBeInTheDocument();
      expect(within(row).getByText('KA01AB1234')).toBeInTheDocument();
      expect(within(row).getByText('Jane Doe')).toBeInTheDocument();
      expect(within(row).getByText('ASSIGNED')).toBeInTheDocument();
      expect(within(row).getByText('COMPANY_BILLING')).toBeInTheDocument();
      expect(within(row).getByText('5000')).toBeInTheDocument();
    });

    it('falls back to the raw id when a client/executive lookup is unavailable', async () => {
      const payment = makePayment({ clientId: 'client-abc-123', executiveEmployeeId: 'emp-xyz-789' });
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
      expect(screen.getByText('emp-xyz-789')).toBeInTheDocument();
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

  describe('filter bar (Client / Finance / Field Executive / date range)', () => {
    it('renders Client, Finance Company, Field Executive, From Date, and To Date controls for all roles', async () => {
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalled();
      });

      expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/finance company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/field executive/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();
    });

    it('re-fetches with clientId when the Client filter changes', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      const clientFilter = screen.getByLabelText(/^client$/i);
      await user.selectOptions(clientFilter, 'client-1');

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({ clientId: 'client-1' })
        );
      });
    });

    it('re-fetches with financeId when the Finance Company filter changes', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      const financeFilter = screen.getByLabelText(/finance company/i);
      await user.selectOptions(financeFilter, 'financer-1');

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({ financeId: 'financer-1' })
        );
      });
    });

    it('re-fetches with executiveEmployeeId when the Field Executive filter changes', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      const executiveFilter = screen.getByLabelText(/field executive/i);
      await user.selectOptions(executiveFilter, 'emp-1');

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({ executiveEmployeeId: 'emp-1' })
        );
      });
    });

    it('re-fetches with dateFrom/dateTo when the date range changes', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      const fromDate = screen.getByLabelText(/from date/i);
      const toDate = screen.getByLabelText(/to date/i);
      await user.type(fromDate, '2026-04-01');
      await user.type(toDate, '2026-04-30');

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({ dateFrom: '2026-04-01', dateTo: '2026-04-30' })
        );
      });
    });

    it('combines all filters (client + finance + executive + date range) into a single request', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      await user.selectOptions(screen.getByLabelText(/^client$/i), 'client-1');
      await user.selectOptions(screen.getByLabelText(/finance company/i), 'financer-1');
      await user.selectOptions(screen.getByLabelText(/field executive/i), 'emp-1');
      await user.type(screen.getByLabelText(/from date/i), '2026-04-01');
      await user.type(screen.getByLabelText(/to date/i), '2026-04-30');

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({
            clientId: 'client-1',
            financeId: 'financer-1',
            executiveEmployeeId: 'emp-1',
            dateFrom: '2026-04-01',
            dateTo: '2026-04-30',
          })
        );
      });
    });

    it('shows a Clear Filters button once a filter is active, and clears all filters on click', async () => {
      const user = userEvent.setup();
      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(1);
      });

      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^client$/i), 'client-1');

      const clearButton = await screen.findByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockedList).toHaveBeenLastCalledWith(
          expect.objectContaining({
            clientId: undefined,
            financeId: undefined,
            executiveEmployeeId: undefined,
            dateFrom: undefined,
            dateTo: undefined,
          })
        );
      });
      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });

  describe('permission-gated UI (write access, export, name resolution)', () => {
    it('hides Add Payment and the Actions column when the user lacks payments:create', async () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (
          selector: (state: {
            hasPermission: (p: string) => boolean;
            hasAnyPermission: (p: string[]) => boolean;
            hasAnyRole: (r: string[]) => boolean;
          }) => unknown
        ) =>
          selector({
            hasPermission: (p: string) => p !== 'payments:create',
            hasAnyPermission: () => true,
            hasAnyRole: () => false,
          })
      );

      const payment = makePayment({ clientId: 'client-1', executiveEmployeeId: 'emp-1' });
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

      expect(screen.queryByRole('button', { name: /add payment/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });

    it('hides Export to Excel specifically for the EMPLOYEE role, even though EMPLOYEE has full payments:create/read/update/delete', async () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (
          selector: (state: {
            hasPermission: (p: string) => boolean;
            hasAnyPermission: (p: string[]) => boolean;
            hasAnyRole: (r: string[]) => boolean;
          }) => unknown
        ) =>
          selector({
            hasPermission: () => true,
            hasAnyPermission: () => true,
            hasAnyRole: (roles: string[]) => roles.includes('EMPLOYEE'),
          })
      );

      const payment = makePayment({ clientId: 'client-1', executiveEmployeeId: 'emp-1' });
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

      expect(screen.queryByRole('button', { name: /export to excel/i })).not.toBeInTheDocument();
      // Full write access is unaffected by the export restriction.
      expect(screen.getByRole('button', { name: /add payment/i })).toBeInTheDocument();
    });

    it('shows Export to Excel for non-EMPLOYEE roles (SUPER_ADMIN/HR_ADMIN/MANAGER)', async () => {
      const payment = makePayment({ clientId: 'client-1', executiveEmployeeId: 'emp-1' });
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

      expect(screen.getByRole('button', { name: /export to excel/i })).toBeInTheDocument();
    });

    it('resolves the Executive name via employeeService.fieldExecutives() (not .list()) when the user lacks hr:read:all/hr:read:subordinates', async () => {
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (
          selector: (state: {
            hasPermission: (p: string) => boolean;
            hasAnyPermission: (p: string[]) => boolean;
            hasAnyRole: (r: string[]) => boolean;
          }) => unknown
        ) =>
          selector({
            hasPermission: () => true,
            hasAnyPermission: () => false,
            hasAnyRole: () => false,
          })
      );

      const payment = makePayment({ clientId: 'client-1', executiveEmployeeId: 'emp-1' });
      mockedList.mockResolvedValue({
        items: [payment],
        total: 1,
        page: 1,
        limit: 200,
        pages: 1,
      });

      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(mockedFieldExecutives).toHaveBeenCalledTimes(1);
      });
      expect(mockedEmployeeList).not.toHaveBeenCalled();

      await waitFor(() => {
        const row = screen.getByText('CASE-1001').closest('tr') as HTMLElement;
        expect(within(row).getByText('Jane Doe')).toBeInTheDocument();
      });
    });
  });

  describe('delete', () => {
    it('deletes a payment after confirming, then refreshes the list', async () => {
      const user = userEvent.setup();
      const payment = makePayment();
      mockedList.mockResolvedValue({
        items: [payment],
        total: 1,
        page: 1,
        limit: 200,
        pages: 1,
      });
      const mockedDelete = paymentService.delete as unknown as ReturnType<typeof vi.fn>;
      mockedDelete.mockResolvedValue(undefined);

      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('CASE-1001')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      // Confirm dialog renders a "Delete Payment" heading and a "Delete"
      // confirm button. The row's icon-only delete button also exposes an
      // accessible name of "Delete" via its `title` attribute, so scope the
      // query to buttons inside the dialog (identified via the Cancel button,
      // which is unambiguous) rather than matching by name alone.
      await screen.findByText('Delete Payment');
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const dialogButtons = within(cancelButton.parentElement as HTMLElement).getAllByRole('button');
      const confirmButton = dialogButtons.find((btn) => btn.textContent === 'Delete');
      expect(confirmButton).toBeDefined();
      await user.click(confirmButton as HTMLElement);

      await waitFor(() => {
        expect(mockedDelete).toHaveBeenCalledWith('pay-1');
      });
      await waitFor(() => {
        expect(mockedList).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('conditional form fields', () => {
    const openAddModal = async (user: ReturnType<typeof userEvent.setup>) => {
      render(<PaymentsPageClient />);
      await waitFor(() => {
        expect(mockedList).toHaveBeenCalled();
      });
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      await waitFor(() => {
        expect(mockedClientList).toHaveBeenCalled();
        expect(mockedEmployeeList).toHaveBeenCalled();
      });
      // Wait for the dropdown options to actually be populated in the DOM
      // before proceeding, so subsequent state updates don't leak past act().
      // Scoped to the modal dialog since the page's filter bar also renders
      // Client/Field Executive dropdowns with the same option text.
      const dialog = screen.getByRole('dialog');
      await waitFor(() => {
        expect(within(dialog).getAllByRole('option', { name: 'Acme Insurance' }).length).toBeGreaterThan(0);
        expect(within(dialog).getByRole('option', { name: 'Jane Doe' })).toBeInTheDocument();
      });
    };

    const setBillingStatus = async (
      user: ReturnType<typeof userEvent.setup>,
      value: 'COMPANY_BILLING' | 'CUSTOMER_BILLING'
    ) => {
      const billingStatusSelect = screen.getByLabelText(/billing status/i);
      await user.selectOptions(billingStatusSelect, value);
    };

    it('hides Payment Mode/UTR/Transaction Date but shows an optional Amount field when Billing Status = Company Billing', async () => {
      const user = userEvent.setup();
      await openAddModal(user);

      await setBillingStatus(user, 'COMPANY_BILLING');

      expect(screen.queryByText(/payment mode/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/utr number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/transaction date/i)).not.toBeInTheDocument();

      const amountField = screen.getByLabelText(/^amount/i);
      expect(amountField).toBeInTheDocument();
      expect(amountField).not.toBeRequired();
    });

    it('reveals the Payment Mode radio when Billing Status = Customer Billing', async () => {
      const user = userEvent.setup();
      await openAddModal(user);

      await setBillingStatus(user, 'CUSTOMER_BILLING');

      expect(screen.getByText(/payment mode/i)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /cash/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /transfer/i })).toBeInTheDocument();
      // Neither mode selected yet -> no amount/UTR/date fields shown
      expect(screen.queryByLabelText(/utr number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/transaction date/i)).not.toBeInTheDocument();
    });

    it('reveals only Amount (not UTR/Transaction Date) when Payment Mode = Cash', async () => {
      const user = userEvent.setup();
      await openAddModal(user);

      await setBillingStatus(user, 'CUSTOMER_BILLING');
      await user.click(screen.getByRole('radio', { name: /cash/i }));

      expect(screen.getByLabelText(/^amount/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/utr number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/transaction date/i)).not.toBeInTheDocument();
    });

    it('reveals UTR Number, Transaction Date&Time, AND Amount when Payment Mode = Transfer', async () => {
      const user = userEvent.setup();
      await openAddModal(user);

      await setBillingStatus(user, 'CUSTOMER_BILLING');
      await user.click(screen.getByRole('radio', { name: /transfer/i }));

      expect(screen.getByLabelText(/utr number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/transaction date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^amount/i)).toBeInTheDocument();
    });

    it('calls clientService.list only with type=CLIENT for the Client dropdown and type=FINANCER for the Finance dropdown', async () => {
      const user = userEvent.setup();
      await openAddModal(user);

      await waitFor(() => {
        expect(mockedClientList).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'CLIENT' })
        );
        expect(mockedClientList).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'FINANCER' })
        );
      });

      const calledWithClient = mockedClientList.mock.calls.some(
        (call: unknown[]) => (call[0] as { type?: string })?.type === 'CLIENT'
      );
      const calledWithFinancer = mockedClientList.mock.calls.some(
        (call: unknown[]) => (call[0] as { type?: string })?.type === 'FINANCER'
      );
      expect(calledWithClient).toBe(true);
      expect(calledWithFinancer).toBe(true);

      // No call should be made without a type filter (e.g. fetching all clients unfiltered)
      const calledWithoutType = mockedClientList.mock.calls.some(
        (call: unknown[]) => !(call[0] as { type?: string })?.type
      );
      expect(calledWithoutType).toBe(false);
    });

    it('only lists Field Executive employees in the Executive dropdown, excluding other positions', async () => {
      mockedEmployeeList.mockResolvedValue({
        items: [
          {
            id: 'emp-1',
            tenantId: 't-1',
            employeeCode: 'E001',
            firstName: 'Jane',
            lastName: 'Doe',
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            positionId: 'pos-1',
            positionTitle: 'Field Executive',
            dateOfJoining: '2026-01-01',
            status: 'ACTIVE',
            employmentType: 'FULL_TIME',
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'emp-2',
            tenantId: 't-1',
            employeeCode: 'E002',
            firstName: 'Sam',
            lastName: 'Smith',
            fullName: 'Sam Smith',
            email: 'sam@example.com',
            positionId: 'pos-2',
            positionTitle: 'HR Executive',
            dateOfJoining: '2026-01-01',
            status: 'ACTIVE',
            employmentType: 'FULL_TIME',
            createdAt: '',
            updatedAt: '',
          },
        ],
        pagination: { page: 1, pageSize: 200, totalItems: 2, totalPages: 1, hasNext: false, hasPrev: false },
      });

      const user = userEvent.setup();
      await openAddModal(user);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('option', { name: 'Jane Doe' })).toBeInTheDocument();
      expect(within(dialog).queryByRole('option', { name: 'Sam Smith' })).not.toBeInTheDocument();
    });
  });

  describe('export', () => {
    it('exports the currently-loaded payments to an Excel workbook with expected columns', async () => {
      const user = userEvent.setup();
      const payments = [
        makePayment({
          id: 'pay-1',
          caseReference: 'CASE-1001',
          clientId: 'client-1',
          financeId: 'client-1',
          vehicleRegistrationNumber: 'KA01AB1234',
          executiveEmployeeId: 'emp-1',
          caseStatus: 'ASSIGNED',
          billingStatus: 'COMPANY_BILLING',
          amount: 5000,
          createdAt: '2026-07-01T00:00:00Z',
        }),
        makePayment({
          id: 'pay-2',
          caseReference: 'CASE-1002',
          clientId: 'client-def-456',
          vehicleRegistrationNumber: 'KA02CD5678',
          executiveEmployeeId: 'emp-uvw-321',
          caseStatus: 'PAYMENT_RECEIVED',
          billingStatus: 'CUSTOMER_BILLING',
          paymentMode: 'TRANSFER',
          utrNumber: 'UTR123456',
          transactionDatetime: '2026-07-10T10:00:00Z',
          amount: 12000,
          createdAt: '2026-07-05T00:00:00Z',
        }),
      ];
      mockedList.mockResolvedValue({
        items: payments,
        total: 2,
        page: 1,
        limit: 200,
        pages: 1,
      });

      render(<PaymentsPageClient />);

      await waitFor(() => {
        expect(screen.getByText('CASE-1001')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export to excel/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockedJsonToSheet).toHaveBeenCalledTimes(1);
      });

      const rows = mockedJsonToSheet.mock.calls[0][0] as Record<string, unknown>[];
      expect(rows).toHaveLength(2);

      const expectedHeaders = [
        'S.No',
        'Case Reference',
        'Client',
        'Finance',
        'Vehicle Reg No',
        'Executive',
        'Case Status',
        'Billing Status',
        'Payment Mode',
        'UTR Number',
        'Transaction Date',
        'Amount',
        'Lead Created Date',
      ];
      expect(Object.keys(rows[0])).toEqual(expectedHeaders);

      expect(rows[0]).toMatchObject({
        'S.No': 1,
        'Case Reference': 'CASE-1001',
        Client: 'Acme Insurance',
        Finance: 'Acme Insurance',
        'Vehicle Reg No': 'KA01AB1234',
        Executive: 'Jane Doe',
        'Case Status': 'ASSIGNED',
        'Billing Status': 'COMPANY_BILLING',
        Amount: 5000,
        'Lead Created Date': '2026-07-01T00:00:00Z',
      });
      expect(rows[1]).toMatchObject({
        'S.No': 2,
        'Case Reference': 'CASE-1002',
        Finance: '',
        'Billing Status': 'CUSTOMER_BILLING',
        'Payment Mode': 'TRANSFER',
        'UTR Number': 'UTR123456',
        Amount: 12000,
        'Lead Created Date': '2026-07-05T00:00:00Z',
      });

      expect(mockedBookNew).toHaveBeenCalledTimes(1);
      expect(mockedBookAppendSheet).toHaveBeenCalledTimes(1);
      expect(mockedWriteFile).toHaveBeenCalledTimes(1);
      // Filename includes a date/time stamp, e.g. payments_2026-07-25_1430.xlsx
      expect(mockedWriteFile).toHaveBeenCalledWith(
        mockedBookNew.mock.results[0]?.value,
        expect.stringMatching(/^payments_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/)
      );
    });
  });
});
