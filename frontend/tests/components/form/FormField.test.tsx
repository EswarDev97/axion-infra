/**
 * FormField Component Unit Tests
 * Per SDLC Phase 7 Task 7.9
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';

describe('FormField', () => {
  describe('Rendering', () => {
    it('renders with label and children', () => {
      render(
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" />
        </FormField>
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders label with for attribute', () => {
      render(
        <FormField label="Username" htmlFor="username">
          <Input id="username" />
        </FormField>
      );

      const label = screen.getByText('Username');
      expect(label.closest('label')).toHaveAttribute('for', 'username');
    });
  });

  describe('Required Indicator', () => {
    it('shows required indicator when required is true', () => {
      render(
        <FormField label="Name" htmlFor="name" required>
          <Input id="name" />
        </FormField>
      );

      // The Label component should show asterisk for required
      const label = screen.getByText('Name');
      expect(label.parentElement?.textContent).toContain('*');
    });

    it('does not show required indicator when required is false', () => {
      render(
        <FormField label="Optional Field" htmlFor="optional">
          <Input id="optional" />
        </FormField>
      );

      const label = screen.getByText('Optional Field');
      expect(label.parentElement?.textContent).not.toContain('*');
    });
  });

  describe('Error State', () => {
    it('displays error message when error is provided', () => {
      render(
        <FormField label="Email" htmlFor="email" error="Invalid email format">
          <Input id="email" />
        </FormField>
      );

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('does not display error message when error is not provided', () => {
      render(
        <FormField label="Email" htmlFor="email">
          <Input id="email" />
        </FormField>
      );

      expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument();
    });

    it('error message has error styling', () => {
      render(
        <FormField label="Email" htmlFor="email" error="Error message">
          <Input id="email" />
        </FormField>
      );

      const error = screen.getByText('Error message');
      expect(error.className).toContain('text-red');
    });
  });

  describe('Hint Text', () => {
    it('displays hint when hint is provided', () => {
      render(
        <FormField label="Password" htmlFor="password" hint="Min 8 characters">
          <Input id="password" type="password" />
        </FormField>
      );

      expect(screen.getByText('Min 8 characters')).toBeInTheDocument();
    });

    it('does not display hint when error is present', () => {
      render(
        <FormField
          label="Password"
          htmlFor="password"
          hint="Min 8 characters"
          error="Password too short"
        >
          <Input id="password" type="password" />
        </FormField>
      );

      expect(screen.getByText('Password too short')).toBeInTheDocument();
      expect(screen.queryByText('Min 8 characters')).not.toBeInTheDocument();
    });

    it('shows hint when there is no error', () => {
      render(
        <FormField label="Username" htmlFor="username" hint="Choose a unique username">
          <Input id="username" />
        </FormField>
      );

      expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <FormField label="Field" htmlFor="field" className="custom-class">
          <Input id="field" />
        </FormField>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has proper spacing', () => {
      const { container } = render(
        <FormField label="Field" htmlFor="field">
          <Input id="field" />
        </FormField>
      );

      expect(container.firstChild).toHaveClass('space-y-1.5');
    });
  });

  describe('Accessibility', () => {
    it('label is associated with input', () => {
      render(
        <FormField label="Email Address" htmlFor="email-input">
          <Input id="email-input" type="email" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Email Address');

      expect(input.id).toBe('email-input');
      expect(label.closest('label')).toHaveAttribute('for', 'email-input');
    });
  });

  describe('Common Use Cases', () => {
    it('renders email field with error', () => {
      render(
        <FormField
          label="Email"
          htmlFor="email"
          required
          error="Please enter a valid email"
        >
          <Input id="email" type="email" />
        </FormField>
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders password field with hint', () => {
      render(
        <FormField
          label="Password"
          htmlFor="password"
          required
          hint="Must be at least 8 characters with one number"
        >
          <Input id="password" type="password" />
        </FormField>
      );

      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Must be at least 8 characters with one number')).toBeInTheDocument();
    });

    it('renders optional field', () => {
      render(
        <FormField
          label="Phone Number"
          htmlFor="phone"
          hint="Optional - for account recovery"
        >
          <Input id="phone" type="tel" />
        </FormField>
      );

      expect(screen.getByText('Phone Number')).toBeInTheDocument();
      expect(screen.getByText('Optional - for account recovery')).toBeInTheDocument();
    });
  });
});
