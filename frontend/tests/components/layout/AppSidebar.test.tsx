/**
 * AppSidebar Component Unit Tests
 * Covers Task T11: submenu support (Payroll -> Payment Management)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useAuthStore } from '@/stores/authStore';
import { usePathname } from 'next/navigation';

// Mock next/navigation (overrides the global setup mock for this file)
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

function mockAuthStore(
  hasPermission: (permission: string) => boolean,
  hasAnyRole: (roles: string[]) => boolean = () => false
) {
  const hasAnyPermission = (permissions: string[]) => permissions.some(hasPermission);
  (useAuthStore as unknown as vi.Mock).mockImplementation(
    (
      selector: (state: {
        hasPermission: (permission: string) => boolean;
        hasAnyPermission: (permissions: string[]) => boolean;
        hasAnyRole: (roles: string[]) => boolean;
      }) => unknown
    ) => selector({ hasPermission, hasAnyPermission, hasAnyRole })
  );
}

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePathname as vi.Mock).mockReturnValue('/dashboard');
    mockAuthStore(() => true);
  });

  describe('flat menu items (unchanged behavior)', () => {
    it('renders pre-existing flat items as direct links to their href', () => {
      render(<AppSidebar />);

      const employeesLink = screen.getByRole('link', { name: /employees/i });
      expect(employeesLink).toHaveAttribute('href', '/dashboard/employees');

      const departmentsLink = screen.getByRole('link', { name: /departments/i });
      expect(departmentsLink).toHaveAttribute('href', '/dashboard/departments');

      const clientsLink = screen.getByRole('link', { name: /clients/i });
      expect(clientsLink).toHaveAttribute('href', '/dashboard/clients');
    });

    it('does not render a "Payment Management" link before Payroll is expanded', () => {
      render(<AppSidebar />);

      expect(screen.queryByRole('link', { name: /payment management/i })).not.toBeInTheDocument();
    });
  });

  describe('Payroll submenu', () => {
    it('renders Payroll as a non-link expandable row (button), not an anchor with href', () => {
      render(<AppSidebar />);

      // Payroll must NOT be a link
      expect(screen.queryByRole('link', { name: /^payroll$/i })).not.toBeInTheDocument();

      // Payroll must be a clickable button
      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      expect(payrollButton).toBeInTheDocument();
      expect(payrollButton).not.toHaveAttribute('href');
    });

    it('reveals "Payment Management" as a child link to /dashboard/payments when Payroll is clicked', async () => {
      const user = userEvent.setup();
      render(<AppSidebar />);

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);

      const paymentManagementLink = screen.getByRole('link', { name: /payment management/i });
      expect(paymentManagementLink).toHaveAttribute('href', '/dashboard/payments');
    });

    it('collapses the submenu again when Payroll is clicked a second time', async () => {
      const user = userEvent.setup();
      render(<AppSidebar />);

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);
      expect(screen.getByRole('link', { name: /payment management/i })).toBeInTheDocument();

      await user.click(payrollButton);
      expect(screen.queryByRole('link', { name: /payment management/i })).not.toBeInTheDocument();
    });

    it('auto-expands Payroll when the current pathname matches a child href', () => {
      (usePathname as vi.Mock).mockReturnValue('/dashboard/payments');

      render(<AppSidebar />);

      const paymentManagementLink = screen.getByRole('link', { name: /payment management/i });
      expect(paymentManagementLink).toHaveAttribute('href', '/dashboard/payments');
    });

    it('hides the Payment Management child when the user lacks payments:read permission', async () => {
      mockAuthStore((permission) => permission !== 'payments:read' && permission !== 'payments:read:own');
      const user = userEvent.setup();

      render(<AppSidebar />);

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);

      expect(screen.queryByRole('link', { name: /payment management/i })).not.toBeInTheDocument();
    });
  });

  describe('role-based hiding (hideForRoles)', () => {
    const HIDDEN_FOR_EMPLOYEE_AND_MANAGER = [
      'Approvals',
      'Notifications',
      'CRM',
      'Training',
      'Mind Maps',
      'Documents',
      'Leave',
      'Holidays',
    ];
    const HIDDEN_FOR_EMPLOYEE_ONLY = [
      'Employees',
      'Departments',
      'Quotes',
      'Invoices',
      'Complaints',
      'Clients',
    ];

    it.each(['EMPLOYEE', 'MANAGER'])(
      'hides Approvals/Notifications/CRM/Training/Mind Maps/Documents/Leave/Holidays for the %s role',
      (role) => {
        mockAuthStore(
          () => true,
          (roles) => roles.includes(role)
        );

        render(<AppSidebar />);

        for (const label of HIDDEN_FOR_EMPLOYEE_AND_MANAGER) {
          expect(screen.queryByRole('link', { name: new RegExp(`^${label}$`, 'i') })).not.toBeInTheDocument();
        }
      }
    );

    it('also hides Employees/Departments/Quotes/Invoices/Complaints/Clients for the EMPLOYEE role', () => {
      mockAuthStore(
        () => true,
        (roles) => roles.includes('EMPLOYEE')
      );

      render(<AppSidebar />);

      for (const label of HIDDEN_FOR_EMPLOYEE_ONLY) {
        expect(screen.queryByRole('link', { name: new RegExp(`^${label}$`, 'i') })).not.toBeInTheDocument();
      }
    });

    it('still shows Employees for the MANAGER role', () => {
      mockAuthStore(
        () => true,
        (roles) => roles.includes('MANAGER')
      );

      render(<AppSidebar />);

      expect(screen.getByRole('link', { name: /employees/i })).toHaveAttribute(
        'href',
        '/dashboard/employees'
      );
    });

    it('shows only Dashboard, Attendance, Tasks, Expenses, and Payroll for the EMPLOYEE role', async () => {
      mockAuthStore(
        (permission) => permission === 'payments:read:own',
        (roles) => roles.includes('EMPLOYEE')
      );
      const user = userEvent.setup();

      render(<AppSidebar />);

      for (const label of ['Dashboard', 'Attendance', 'Tasks', 'Expenses', 'Payroll']) {
        expect(screen.getByRole(label === 'Payroll' ? 'button' : 'link', {
          name: new RegExp(`^${label}$`, 'i'),
        })).toBeInTheDocument();
      }

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);
      expect(screen.getByRole('link', { name: /payment management/i })).toBeInTheDocument();
    });

    it('keeps the hidden items visible for roles other than EMPLOYEE/MANAGER', () => {
      // hasAnyRole never matches — simulates an HR_ADMIN/SUPER_ADMIN user
      mockAuthStore(() => true, () => false);

      render(<AppSidebar />);

      for (const label of [...HIDDEN_FOR_EMPLOYEE_AND_MANAGER, ...HIDDEN_FOR_EMPLOYEE_ONLY]) {
        expect(screen.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument();
      }
    });
  });

  describe('Payment Management visibility for payments:read:own', () => {
    it('shows Payment Management for a user with only payments:read:own (no payments:read)', async () => {
      mockAuthStore((permission) => permission === 'payments:read:own');
      const user = userEvent.setup();

      render(<AppSidebar />);

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);

      expect(screen.getByRole('link', { name: /payment management/i })).toBeInTheDocument();
    });

    it('hides Payment Management for a user with neither payments:read nor payments:read:own', async () => {
      mockAuthStore((permission) => permission !== 'payments:read' && permission !== 'payments:read:own');
      const user = userEvent.setup();

      render(<AppSidebar />);

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);

      expect(screen.queryByRole('link', { name: /payment management/i })).not.toBeInTheDocument();
    });
  });
});
