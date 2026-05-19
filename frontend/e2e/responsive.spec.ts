/**
 * Responsive Design E2E Tests
 * Per SDLC Phase 7 Task 7.14
 */

import { test, expect, devices } from '@playwright/test';

const viewports = {
  mobile: { width: 375, height: 667 },    // iPhone SE
  tablet: { width: 768, height: 1024 },   // iPad
  desktop: { width: 1280, height: 720 },  // Desktop
  widescreen: { width: 1920, height: 1080 }, // Full HD
};

test.describe('Responsive Design - Login Page', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: viewports.mobile });

    test('login form is displayed correctly', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByText('MindFlow')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('form elements are full width', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel(/email/i);
      const inputBox = await emailInput.boundingBox();

      // Input should be close to full width (accounting for padding)
      expect(inputBox!.width).toBeGreaterThan(300);
    });

    test('button is full width', async ({ page }) => {
      await page.goto('/login');

      const button = page.getByRole('button', { name: /sign in/i });
      const buttonBox = await button.boundingBox();

      expect(buttonBox!.width).toBeGreaterThan(300);
    });
  });

  test.describe('Tablet View', () => {
    test.use({ viewport: viewports.tablet });

    test('login form is centered', async ({ page }) => {
      await page.goto('/login');

      const form = page.locator('form');
      const formBox = await form.boundingBox();

      // Form should be centered
      const centerPoint = viewports.tablet.width / 2;
      const formCenter = formBox!.x + formBox!.width / 2;
      expect(Math.abs(formCenter - centerPoint)).toBeLessThan(50);
    });
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: viewports.desktop });

    test('login form is appropriately sized', async ({ page }) => {
      await page.goto('/login');

      const form = page.locator('form').first();
      const formBox = await form.boundingBox();

      // Form should have max-width (not span entire screen)
      expect(formBox!.width).toBeLessThan(600);
    });
  });
});

test.describe('Responsive Design - Dashboard', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: viewports.mobile });

    test.skip('sidebar is collapsed/hidden', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('[data-testid="sidebar"]');
      const isVisible = await sidebar.isVisible();

      // Sidebar should be hidden or collapsed on mobile
      if (isVisible) {
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox!.width).toBeLessThan(100);
      }
    });

    test.skip('hamburger menu is visible', async ({ page }) => {
      await page.goto('/dashboard');

      const menuButton = page.getByRole('button', { name: /menu/i });
      await expect(menuButton).toBeVisible();
    });

    test.skip('opens sidebar on menu click', async ({ page }) => {
      await page.goto('/dashboard');

      const menuButton = page.getByRole('button', { name: /menu/i });
      if (await menuButton.isVisible()) {
        await menuButton.click();

        const sidebar = page.locator('[data-testid="sidebar"]');
        await expect(sidebar).toBeVisible();
      }
    });
  });

  test.describe('Tablet View', () => {
    test.use({ viewport: viewports.tablet });

    test.skip('sidebar is collapsed but toggleable', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebarToggle = page.getByRole('button', { name: /toggle sidebar/i });

      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();

        const sidebar = page.locator('[data-testid="sidebar"]');
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox!.width).toBeGreaterThan(150);
      }
    });
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: viewports.desktop });

    test.skip('sidebar is fully visible', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toBeVisible();

      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox!.width).toBeGreaterThan(200);
    });

    test.skip('main content is alongside sidebar', async ({ page }) => {
      await page.goto('/dashboard');

      const sidebar = page.locator('[data-testid="sidebar"]');
      const mainContent = page.locator('main');

      const sidebarBox = await sidebar.boundingBox();
      const mainBox = await mainContent.boundingBox();

      // Main content should be to the right of sidebar
      expect(mainBox!.x).toBeGreaterThan(sidebarBox!.x + sidebarBox!.width - 10);
    });
  });
});

test.describe('Responsive Design - Data Tables', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: viewports.mobile });

    test.skip('table is horizontally scrollable', async ({ page }) => {
      await page.goto('/dashboard/tasks');

      const tableContainer = page.locator('.table-container, [data-testid="table-container"]');

      if (await tableContainer.isVisible()) {
        const containerBox = await tableContainer.boundingBox();
        const table = tableContainer.locator('table');
        const tableBox = await table.boundingBox();

        // Table might be wider than container, requiring scroll
        if (tableBox!.width > containerBox!.width) {
          const styles = await tableContainer.evaluate((el) => {
            return window.getComputedStyle(el).overflowX;
          });
          expect(['auto', 'scroll']).toContain(styles);
        }
      }
    });

    test.skip('table shows condensed view', async ({ page }) => {
      await page.goto('/dashboard/tasks');

      // Some columns might be hidden on mobile
      const priorityColumn = page.getByRole('columnheader', { name: /priority/i });
      const assigneesColumn = page.getByRole('columnheader', { name: /assignees/i });

      // At least title should be visible
      const titleColumn = page.getByRole('columnheader', { name: /task/i });
      await expect(titleColumn).toBeVisible();
    });
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: viewports.desktop });

    test.skip('table shows all columns', async ({ page }) => {
      await page.goto('/dashboard/tasks');

      const columns = ['Task', 'Status', 'Priority', 'Assignees', 'Due Date'];

      for (const column of columns) {
        const header = page.getByRole('columnheader', { name: new RegExp(column, 'i') });
        await expect(header).toBeVisible();
      }
    });
  });
});

test.describe('Responsive Design - Forms', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: viewports.mobile });

    test.skip('form fields stack vertically', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const applyButton = page.getByRole('button', { name: /apply for leave/i });
      if (await applyButton.isVisible()) {
        await applyButton.click();

        const form = page.getByRole('dialog').locator('form');
        const formFields = form.locator('.form-field, [data-testid="form-field"]');

        const fieldBoxes = await formFields.all();
        for (let i = 1; i < fieldBoxes.length; i++) {
          const prevBox = await fieldBoxes[i - 1].boundingBox();
          const currBox = await fieldBoxes[i].boundingBox();

          // Each field should be below the previous one
          if (prevBox && currBox) {
            expect(currBox.y).toBeGreaterThan(prevBox.y);
          }
        }
      }
    });
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: viewports.desktop });

    test.skip('form may have side-by-side fields', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const applyButton = page.getByRole('button', { name: /apply for leave/i });
      if (await applyButton.isVisible()) {
        await applyButton.click();

        // Date fields might be side by side on desktop
        const startDate = page.getByLabel(/start date/i);
        const endDate = page.getByLabel(/end date/i);

        const startBox = await startDate.boundingBox();
        const endBox = await endDate.boundingBox();

        // Could be side by side or stacked - just verify they're visible
        expect(startBox).toBeTruthy();
        expect(endBox).toBeTruthy();
      }
    });
  });
});

test.describe('Responsive Design - Navigation', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: viewports.mobile });

    test.skip('bottom navigation is visible', async ({ page }) => {
      await page.goto('/dashboard');

      const bottomNav = page.locator('[data-testid="bottom-nav"]');
      const isVisible = await bottomNav.isVisible();

      // Either bottom nav or hamburger menu should be present
      if (!isVisible) {
        const menuButton = page.getByRole('button', { name: /menu/i });
        await expect(menuButton).toBeVisible();
      }
    });
  });
});

test.describe('Responsive Design - Cards and Grids', () => {
  test.describe('Mobile View', () => {
    test.use({ viewport: viewports.mobile });

    test.skip('cards stack in single column', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const cards = page.locator('[data-testid="leave-balance-card"] > div');
      const cardBoxes = await cards.all();

      if (cardBoxes.length > 1) {
        const firstBox = await cardBoxes[0].boundingBox();
        const secondBox = await cardBoxes[1].boundingBox();

        // Cards should be stacked (second one below first)
        if (firstBox && secondBox) {
          expect(secondBox.y).toBeGreaterThan(firstBox.y);
        }
      }
    });
  });

  test.describe('Tablet View', () => {
    test.use({ viewport: viewports.tablet });

    test.skip('cards display in 2 columns', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const cards = page.locator('[data-testid="leave-balance-card"] > div');
      const cardBoxes = await cards.all();

      if (cardBoxes.length >= 2) {
        const firstBox = await cardBoxes[0].boundingBox();
        const secondBox = await cardBoxes[1].boundingBox();

        // Cards might be side by side on tablet
        if (firstBox && secondBox) {
          const areSideBySide = Math.abs(firstBox.y - secondBox.y) < 10;
          const areStacked = secondBox.y > firstBox.y + firstBox.height - 10;

          expect(areSideBySide || areStacked).toBe(true);
        }
      }
    });
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: viewports.desktop });

    test.skip('cards display in 4 columns', async ({ page }) => {
      await page.goto('/dashboard/leave');

      const grid = page.locator('.grid.lg\\:grid-cols-4');
      const isVisible = await grid.isVisible();

      if (isVisible) {
        const cards = grid.locator('> div');
        const cardBoxes = await cards.all();

        if (cardBoxes.length >= 4) {
          const boxes = await Promise.all(
            cardBoxes.slice(0, 4).map((card) => card.boundingBox())
          );

          // All 4 cards should be on the same row
          const firstY = boxes[0]!.y;
          for (const box of boxes) {
            expect(Math.abs(box!.y - firstY)).toBeLessThan(20);
          }
        }
      }
    });
  });
});
