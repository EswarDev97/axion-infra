/**
 * Checkbox Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '@/components/ui/Checkbox';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('renders without label', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Checkbox label="Accept terms" />);

      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    it('renders unchecked by default', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('renders checked when defaultChecked', () => {
      render(<Checkbox defaultChecked />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  describe('Sizes', () => {
    it('renders sm size correctly', () => {
      const { container } = render(<Checkbox size="sm" />);

      const visualBox = container.querySelector('.h-4.w-4');
      expect(visualBox).toBeInTheDocument();
    });

    it('renders md size correctly (default)', () => {
      const { container } = render(<Checkbox />);

      const visualBox = container.querySelector('.h-5.w-5');
      expect(visualBox).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('toggles checked state when clicked', async () => {
      const user = userEvent.setup();

      render(<Checkbox label="Toggle me" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('calls onChange when toggled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onChange={handleChange} />);

      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('can be toggled by clicking label', async () => {
      const user = userEvent.setup();

      render(<Checkbox label="Click me" />);

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Click me');

      await user.click(label);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Checkbox disabled />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('does not toggle when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox disabled onChange={handleChange} />);

      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('is focusable', async () => {
      const user = userEvent.setup();
      render(<Checkbox />);

      await user.tab();
      expect(screen.getByRole('checkbox')).toHaveFocus();
    });

    it('can be toggled with space key', async () => {
      const user = userEvent.setup();

      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      await user.tab();
      await user.keyboard(' ');

      expect(checkbox).toBeChecked();
    });

    it('has associated label', () => {
      render(<Checkbox label="Test label" id="test-checkbox" />);

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Test label');

      expect(checkbox.id).toBe('test-checkbox');
      expect(label.closest('label')).toHaveAttribute('for', 'test-checkbox');
    });
  });

  describe('Controlled Mode', () => {
    it('works as controlled component', async () => {
      const ControlledCheckbox = () => {
        const [checked, setChecked] = vi.hoisted(() => {
          const { useState } = require('react');
          return useState(false);
        });

        return (
          <Checkbox
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            label="Controlled"
          />
        );
      };

      const user = userEvent.setup();
      render(<ControlledCheckbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });
});
