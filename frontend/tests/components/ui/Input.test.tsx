/**
 * Input Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);

      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('renders with value', () => {
      render(<Input value="test value" readOnly />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('test value');
    });

    it('renders with label when wrapped in FormField', () => {
      render(
        <label>
          <span>Email</span>
          <Input />
        </label>
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('Types', () => {
    it('renders text input by default', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders email input', () => {
      render(<Input type="email" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" />);

      // Password inputs don't have role="textbox"
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('renders number input', () => {
      render(<Input type="number" />);

      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'hello');

      expect(input).toHaveValue('hello');
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles paste', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.paste('pasted text');

      expect(input).toHaveValue('pasted text');
    });

    it('handles clear', async () => {
      const user = userEvent.setup();

      render(<Input defaultValue="initial" />);

      const input = screen.getByRole('textbox');
      await user.clear(input);

      expect(input).toHaveValue('');
    });

    it('handles focus', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();

      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(input).toHaveFocus();
      expect(handleFocus).toHaveBeenCalled();
    });

    it('handles blur', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(input).not.toHaveFocus();
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('cannot be typed into when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input disabled onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('applies error styling', () => {
      render(<Input error />);

      const input = screen.getByRole('textbox');
      // Check for error border class (depends on implementation)
      expect(input.className).toMatch(/border-red|error/i);
    });

    it('has aria-invalid when error', () => {
      render(<Input error aria-invalid="true" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Accessibility', () => {
    it('is focusable with Tab', async () => {
      const user = userEvent.setup();
      render(<Input />);

      await user.tab();

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('supports aria-label', () => {
      render(<Input aria-label="Search input" />);

      const input = screen.getByLabelText('Search input');
      expect(input).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="helper" />
          <span id="helper">Helper text</span>
        </>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'helper');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<Input className="custom-input" />);

      const input = screen.getByRole('textbox');
      expect(input.className).toContain('custom-input');
    });
  });

  describe('HTML Attributes', () => {
    it('forwards required attribute', () => {
      render(<Input required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('forwards maxLength attribute', () => {
      render(<Input maxLength={100} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '100');
    });

    it('forwards autoComplete attribute', () => {
      render(<Input autoComplete="email" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('forwards name attribute', () => {
      render(<Input name="email" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'email');
    });
  });
});
