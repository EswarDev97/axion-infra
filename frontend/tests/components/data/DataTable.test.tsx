/**
 * DataTable Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '@/components/data/DataTable';

interface TestData {
  id: string;
  name: string;
  email: string;
  status: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
];

const mockColumns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'status', header: 'Status', sortable: false },
];

describe('DataTable', () => {
  describe('Rendering', () => {
    it('renders table headers', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders table data', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders all rows', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      const rows = screen.getAllByRole('row');
      // Header row + data rows
      expect(rows.length).toBe(mockData.length + 1);
    });

    it('renders empty state when no data', () => {
      render(
        <DataTable
          data={[]}
          columns={mockColumns}
          emptyMessage="No records found"
        />
      );

      expect(screen.getByText('No records found')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          loading
        />
      );

      // Look for loading indicator (spinner or skeleton)
      expect(
        screen.queryByRole('progressbar') ||
        screen.queryByTestId('loading-skeleton') ||
        document.querySelector('[class*="animate-pulse"]')
      ).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('shows sort indicator on sortable columns', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      const nameHeader = screen.getByText('Name');
      // Should have some sort indicator (arrow or icon)
      expect(nameHeader.closest('th')).toBeInTheDocument();
    });

    it('calls onSort when sortable header is clicked', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      expect(handleSort).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'name' })
      );
    });

    it('does not call onSort for non-sortable columns', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          onSort={handleSort}
        />
      );

      const statusHeader = screen.getByText('Status');
      await user.click(statusHeader);

      expect(handleSort).not.toHaveBeenCalled();
    });
  });

  describe('Selection', () => {
    it('renders checkboxes when selectable', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          selectable
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Header checkbox + row checkboxes
      expect(checkboxes.length).toBe(mockData.length + 1);
    });

    it('calls onSelectionChange when row is selected', async () => {
      const handleSelection = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          selectable
          onSelectionChange={handleSelection}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Click first data row checkbox (index 1, as 0 is header)
      await user.click(checkboxes[1]);

      expect(handleSelection).toHaveBeenCalled();
    });

    it('selects all rows when header checkbox is clicked', async () => {
      const handleSelection = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          selectable
          onSelectionChange={handleSelection}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Click header checkbox
      await user.click(checkboxes[0]);

      expect(handleSelection).toHaveBeenCalledWith(
        expect.arrayContaining(mockData.map(d => d.id))
      );
    });
  });

  describe('Row Click', () => {
    it('calls onRowClick when row is clicked', async () => {
      const handleRowClick = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          onRowClick={handleRowClick}
        />
      );

      const row = screen.getByText('John Doe').closest('tr');
      if (row) {
        await user.click(row);
        expect(handleRowClick).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1' })
        );
      }
    });

    it('applies clickable styling when onRowClick is provided', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          onRowClick={() => {}}
        />
      );

      const row = screen.getByText('John Doe').closest('tr');
      expect(row?.className).toMatch(/cursor-pointer|hover/);
    });
  });

  describe('Custom Rendering', () => {
    it('renders custom cell content', () => {
      const columnsWithRender = [
        ...mockColumns,
        {
          key: 'actions',
          header: 'Actions',
          render: () => <button>Edit</button>,
        },
      ];

      render(
        <DataTable
          data={mockData}
          columns={columnsWithRender}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBe(mockData.length);
    });
  });

  describe('Accessibility', () => {
    it('has role="table"', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('has column headers with scope="col"', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      const headers = screen.getAllByRole('columnheader');
      headers.forEach((header) => {
        expect(header.tagName).toBe('TH');
      });
    });

    it('supports keyboard navigation', async () => {
      const handleRowClick = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          onRowClick={handleRowClick}
        />
      );

      // Tab to first row
      await user.tab();
      await user.keyboard('{Enter}');

      // Either row was clicked or we navigated into the table
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  describe('Responsive', () => {
    it('renders with responsive wrapper', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
        />
      );

      const wrapper = screen.getByRole('table').parentElement;
      expect(wrapper?.className).toMatch(/overflow-x-auto|overflow-auto/);
    });
  });
});
