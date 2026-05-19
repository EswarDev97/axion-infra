/**
 * Select Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '@/components/ui/Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Select', () => {
  describe('Rendering', () => {
    it('renders with options', () => {
      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('renders all options', () => {
      render(<Select options={mockOptions} />);

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />);

      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('renders disabled options', () => {
      render(<Select options={mockOptions} />);

      const disabledOption = screen.getByText('Option 3');
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('Interactions', () => {
    it('calls onChange when value changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Select options={mockOptions} onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');

      expect(handleChange).toHaveBeenCalled();
    });

    it('updates selected value', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');

      expect(select).toHaveValue('option2');
    });

    it('cannot select disabled options', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} defaultValue="option1" />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option3');

      // Value should remain unchanged as option3 is disabled
      expect(select).toHaveValue('option1');
    });
  });

  describe('Error State', () => {
    it('applies error styling when error is true', () => {
      render(<Select options={mockOptions} error />);

      const select = screen.getByRole('combobox');
      expect(select.className).toContain('border-red-500');
    });

    it('has aria-invalid when error is true', () => {
      render(<Select options={mockOptions} error />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />);

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('has correct styling when disabled', () => {
      render(<Select options={mockOptions} disabled />);

      const select = screen.getByRole('combobox');
      expect(select.className).toContain('disabled:opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('is focusable', async () => {
      const user = userEvent.setup();
      render(<Select options={mockOptions} />);

      await user.tab();
      expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('can be operated with keyboard', async () => {
      const user = userEvent.setup();

      render(<Select options={mockOptions} />);

      await user.tab();
      await user.keyboard('{ArrowDown}');

      const select = screen.getByRole('combobox');
      expect(select).toHaveFocus();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<Select options={mockOptions} className="custom-class" />);

      const select = screen.getByRole('combobox');
      expect(select.className).toContain('custom-class');
    });
  });
});
