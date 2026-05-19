/**
 * Switch Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '@/components/ui/Switch';

describe('Switch', () => {
  describe('Rendering', () => {
    it('renders without label', () => {
      render(<Switch />);

      const switchInput = screen.getByRole('switch');
      expect(switchInput).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Switch label="Enable notifications" />);

      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });

    it('renders unchecked by default', () => {
      render(<Switch />);

      const switchInput = screen.getByRole('switch');
      expect(switchInput).not.toBeChecked();
    });

    it('renders checked when defaultChecked', () => {
      render(<Switch defaultChecked />);

      const switchInput = screen.getByRole('switch');
      expect(switchInput).toBeChecked();
    });

    it('has role="switch"', () => {
      render(<Switch />);

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders sm size correctly', () => {
      const { container } = render(<Switch size="sm" />);

      const track = container.querySelector('.w-8');
      expect(track).toBeInTheDocument();
    });

    it('renders md size correctly (default)', () => {
      const { container } = render(<Switch />);

      const track = container.querySelector('.w-11');
      expect(track).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('toggles state when clicked', async () => {
      const user = userEvent.setup();

      render(<Switch label="Toggle me" />);

      const switchInput = screen.getByRole('switch');
      expect(switchInput).not.toBeChecked();

      await user.click(switchInput);
      expect(switchInput).toBeChecked();

      await user.click(switchInput);
      expect(switchInput).not.toBeChecked();
    });

    it('calls onChange when toggled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onChange={handleChange} />);

      await user.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('can be toggled by clicking label', async () => {
      const user = userEvent.setup();

      render(<Switch label="Click me" />);

      const switchInput = screen.getByRole('switch');
      const label = screen.getByText('Click me');

      await user.click(label);
      expect(switchInput).toBeChecked();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Switch disabled />);

      const switchInput = screen.getByRole('switch');
      expect(switchInput).toBeDisabled();
    });

    it('does not toggle when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch disabled onChange={handleChange} />);

      await user.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('has correct styling when disabled', () => {
      const { container } = render(<Switch disabled />);

      const track = container.querySelector('.peer-disabled\\:opacity-50');
      expect(track).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('is focusable', async () => {
      const user = userEvent.setup();
      render(<Switch />);

      await user.tab();
      expect(screen.getByRole('switch')).toHaveFocus();
    });

    it('can be toggled with space key', async () => {
      const user = userEvent.setup();

      render(<Switch />);

      const switchInput = screen.getByRole('switch');
      await user.tab();
      await user.keyboard(' ');

      expect(switchInput).toBeChecked();
    });

    it('has associated label', () => {
      render(<Switch label="Test label" id="test-switch" />);

      const switchInput = screen.getByRole('switch');
      const label = screen.getByText('Test label');

      expect(switchInput.id).toBe('test-switch');
      expect(label.closest('label')).toHaveAttribute('for', 'test-switch');
    });

    it('has focus ring styling', () => {
      const { container } = render(<Switch />);

      const track = container.querySelector('.peer-focus\\:ring-2');
      expect(track).toBeInTheDocument();
    });
  });

  describe('Controlled Mode', () => {
    it('works as controlled component', async () => {
      const ControlledSwitch = () => {
        const [checked, setChecked] = vi.hoisted(() => {
          const { useState } = require('react');
          return useState(false);
        });

        return (
          <Switch
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            label="Controlled"
          />
        );
      };

      const user = userEvent.setup();
      render(<ControlledSwitch />);

      const switchInput = screen.getByRole('switch');
      expect(switchInput).not.toBeChecked();

      await user.click(switchInput);
      expect(switchInput).toBeChecked();
    });
  });

  describe('Common Use Cases', () => {
    it('renders notification toggle', () => {
      render(<Switch label="Email notifications" />);

      expect(screen.getByText('Email notifications')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('renders dark mode toggle', () => {
      render(<Switch label="Dark mode" defaultChecked />);

      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('renders settings toggle', () => {
      render(<Switch label="Auto-save" size="sm" />);

      expect(screen.getByText('Auto-save')).toBeInTheDocument();
    });
  });
});
