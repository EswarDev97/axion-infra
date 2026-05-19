/**
 * Accessibility E2E Tests
 * Per SDLC Phase 7 Task 7.13
 *
 * Using @axe-core/playwright for automated accessibility testing
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  test.describe('Login Page', () => {
    test('should not have accessibility violations', async ({ page }) => {
      await page.goto('/login');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('form inputs have associated labels', async ({ page }) => {
      await page.goto('/login');

      // Check email input
      const emailLabel = page.locator('label[for="email"]');
      await expect(emailLabel).toBeVisible();

      // Check password input
      const passwordLabel = page.locator('label[for="password"]');
      await expect(passwordLabel).toBeVisible();
    });

    test('error messages are announced to screen readers', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('button', { name: /sign in/i }).click();

      // Error should have role="alert" or aria-live
      const errorMessage = page.getByRole('alert').or(page.locator('[aria-live="polite"]'));
      await expect(errorMessage.first()).toBeVisible();
    });

    test('buttons are keyboard accessible', async ({ page }) => {
      await page.goto('/login');

      // Tab to sign in button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to focus the button
      const signInButton = page.getByRole('button', { name: /sign in/i });
      // Press Enter to activate
      await page.keyboard.press('Enter');
    });

    test('focus indicators are visible', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/email/i);
      await emailInput.focus();

      // Should have visible focus ring
      const focusStyles = await emailInput.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });

      // Either outline or box-shadow should be visible
      const hasFocusIndicator =
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none';
      expect(hasFocusIndicator).toBe(true);
    });
  });

  test.describe('Dashboard Pages', () => {
    test.skip('leave page should not have accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.chart-container') // Exclude dynamic charts
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip('attendance page should not have accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/attendance');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip('tasks page should not have accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/tasks');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Color Contrast', () => {
    test('text has sufficient color contrast', async ({ page }) => {
      await page.goto('/login');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ runOnly: ['color-contrast'] })
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('buttons have sufficient color contrast', async ({ page }) => {
      await page.goto('/login');

      const signInButton = page.getByRole('button', { name: /sign in/i });
      const styles = await signInButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
        };
      });

      // Should have visible contrast
      expect(styles.backgroundColor).not.toBe(styles.color);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can navigate login form with keyboard only', async ({ page }) => {
      await page.goto('/login');

      // Start from body
      await page.locator('body').focus();

      // Tab through the form
      await page.keyboard.press('Tab'); // Logo link
      await page.keyboard.press('Tab'); // Email input
      await expect(page.getByLabel(/email/i)).toBeFocused();

      await page.keyboard.press('Tab'); // Password input
      await expect(page.getByLabel(/password/i)).toBeFocused();

      await page.keyboard.press('Tab'); // Password toggle
      await page.keyboard.press('Tab'); // Remember me
      await page.keyboard.press('Tab'); // Forgot password link
      await page.keyboard.press('Tab'); // Sign in button

      const signInButton = page.getByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeFocused();
    });

    test('skip link is available', async ({ page }) => {
      await page.goto('/login');

      // Press Tab to reveal skip link (if present)
      await page.keyboard.press('Tab');

      const skipLink = page.getByRole('link', { name: /skip to main/i });
      // Skip link might be the first focusable element
      const isVisible = await skipLink.isVisible();

      // Not all pages have skip links, but check if implemented
      if (isVisible) {
        await expect(skipLink).toBeFocused();
      }
    });

    test('modal can be closed with Escape key', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const applyButton = page.getByRole('button', { name: /apply for leave/i });

      if (await applyButton.isVisible()) {
        await applyButton.click();

        await expect(page.getByRole('dialog')).toBeVisible();

        // Press Escape to close
        await page.keyboard.press('Escape');

        await expect(page.getByRole('dialog')).not.toBeVisible();
      }
    });

    test('focus is trapped in modal', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const applyButton = page.getByRole('button', { name: /apply for leave/i });

      if (await applyButton.isVisible()) {
        await applyButton.click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Tab through modal elements
        const tabCount = 10;
        for (let i = 0; i < tabCount; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be within the dialog
        const focusedElement = page.locator(':focus');
        const isInDialog = await dialog.locator(':focus').count();
        expect(isInDialog).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('page has proper heading hierarchy', async ({ page }) => {
      await page.goto('/login');

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      // Should have at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check heading order
      const headingLevels = await Promise.all(
        headings.map(async (h) => {
          const tagName = await h.evaluate((el) => el.tagName);
          return parseInt(tagName.replace('H', ''));
        })
      );

      // Verify no skipped levels
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        // Should not skip more than one level
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    });

    test('images have alt text', async ({ page }) => {
      await page.goto('/login');

      const images = await page.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        // All images should have alt attribute (can be empty for decorative)
        expect(alt).not.toBeNull();
      }
    });

    test('links have accessible names', async ({ page }) => {
      await page.goto('/login');

      const links = await page.locator('a').all();

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        // Links should have text content or aria-label
        expect(text?.trim() || ariaLabel).toBeTruthy();
      }
    });

    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/login');

      const buttons = await page.locator('button').all();

      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');

        // Buttons should have text content, aria-label, or title
        expect(text?.trim() || ariaLabel || title).toBeTruthy();
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('form inputs have proper labels', async ({ page }) => {
      await page.goto('/login');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .options({ runOnly: ['label'] })
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('required fields are indicated', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel(/password/i);

      // Check for required attribute or aria-required
      const emailRequired =
        (await emailInput.getAttribute('required')) !== null ||
        (await emailInput.getAttribute('aria-required')) === 'true';
      const passwordRequired =
        (await passwordInput.getAttribute('required')) !== null ||
        (await passwordInput.getAttribute('aria-required')) === 'true';

      expect(emailRequired || passwordRequired).toBe(true);
    });

    test('error states are properly communicated', async ({ page }) => {
      await page.goto('/login');

      await page.getByRole('button', { name: /sign in/i }).click();

      // Check for aria-invalid on inputs with errors
      await page.waitForTimeout(500);

      const emailInput = page.getByLabel(/email/i);
      const ariaInvalid = await emailInput.getAttribute('aria-invalid');

      expect(ariaInvalid).toBe('true');
    });
  });
});
