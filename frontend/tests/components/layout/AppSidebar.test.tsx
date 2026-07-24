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

function mockAuthStore(hasPermission: (permission: string) => boolean) {
  (useAuthStore as unknown as vi.Mock).mockImplementation(
    (selector: (state: { hasPermission: (permission: string) => boolean }) => unknown) =>
      selector({ hasPermission })
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
      mockAuthStore((permission) => permission !== 'payments:read');
      const user = userEvent.setup();

      render(<AppSidebar />);

      const payrollButton = screen.getByRole('button', { name: /payroll/i });
      await user.click(payrollButton);

      expect(screen.queryByRole('link', { name: /payment management/i })).not.toBeInTheDocument();
    });
  });
});
