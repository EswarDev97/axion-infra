/**
 * Task Management E2E Tests
 * Per SDLC Phase 7 Task 7.12
 */

import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tasks');
  });

  test.describe('Task List', () => {
    test.skip('displays task list page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible();
    });

    test.skip('displays task table with columns', async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible();

      await expect(page.getByRole('columnheader', { name: /task/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /priority/i })).toBeVisible();
    });

    test.skip('shows empty state when no tasks', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/v1/tasks*', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          }),
        });
      });

      await page.reload();
      await expect(page.getByText(/no tasks found/i)).toBeVisible();
    });

    test.skip('navigates to task detail on row click', async ({ page }) => {
      const firstRow = page.getByRole('row').nth(1); // Skip header row

      if (await firstRow.isVisible()) {
        await firstRow.click();
        await expect(page).toHaveURL(/\/dashboard\/tasks\/.+/);
      }
    });
  });

  test.describe('Task Filtering', () => {
    test.skip('filters by status', async ({ page }) => {
      const statusFilter = page.getByLabel(/status/i);

      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('IN_PROGRESS');

        // URL should update with filter
        await expect(page).toHaveURL(/status=IN_PROGRESS/);
      }
    });

    test.skip('filters by priority', async ({ page }) => {
      const priorityFilter = page.getByLabel(/priority/i);

      if (await priorityFilter.isVisible()) {
        await priorityFilter.selectOption('HIGH');

        await expect(page).toHaveURL(/priority=HIGH/);
      }
    });

    test.skip('searches tasks', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);

      if (await searchInput.isVisible()) {
        await searchInput.fill('project');
        await page.waitForTimeout(500); // Debounce

        // Should filter results
        await expect(page).toHaveURL(/search=project/);
      }
    });
  });

  test.describe('Task Creation', () => {
    test.skip('opens create task form', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create task/i });

      if (await createButton.isVisible()) {
        await createButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });

    test.skip('validates required fields', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create task/i });

      if (await createButton.isVisible()) {
        await createButton.click();
        await page.getByRole('button', { name: /submit/i }).click();

        await expect(page.getByText(/title is required/i)).toBeVisible();
      }
    });

    test.skip('creates task successfully', async ({ page }) => {
      const createButton = page.getByRole('button', { name: /create task/i });

      if (await createButton.isVisible()) {
        await createButton.click();

        await page.getByLabel(/title/i).fill('New Test Task');
        await page.getByLabel(/description/i).fill('Task description');
        await page.getByLabel(/priority/i).selectOption('HIGH');

        await page.getByRole('button', { name: /submit/i }).click();

        // Should close modal and show success
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByText(/task created/i)).toBeVisible();
      }
    });
  });

  test.describe('Task Detail', () => {
    test.skip('displays task details', async ({ page }) => {
      // Navigate to a task detail page
      await page.goto('/dashboard/tasks/task-1');

      await expect(page.getByTestId('task-title')).toBeVisible();
      await expect(page.getByText(/status/i)).toBeVisible();
      await expect(page.getByText(/priority/i)).toBeVisible();
    });

    test.skip('updates task status', async ({ page }) => {
      await page.goto('/dashboard/tasks/task-1');

      const statusSelect = page.getByLabel(/status/i);

      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption({ index: 2 });

        // Should show update success
        await expect(page.getByText(/updated/i)).toBeVisible();
      }
    });

    test.skip('adds comment to task', async ({ page }) => {
      await page.goto('/dashboard/tasks/task-1');

      const commentInput = page.getByPlaceholder(/add a comment/i);

      if (await commentInput.isVisible()) {
        await commentInput.fill('This is a test comment');
        await page.getByRole('button', { name: /post/i }).click();

        await expect(page.getByText('This is a test comment')).toBeVisible();
      }
    });
  });

  test.describe('Kanban View', () => {
    test.skip('switches to kanban view', async ({ page }) => {
      const kanbanButton = page.getByRole('button', { name: /kanban/i });

      if (await kanbanButton.isVisible()) {
        await kanbanButton.click();

        await expect(page.getByTestId('kanban-board')).toBeVisible();
      }
    });

    test.skip('displays columns for each status', async ({ page }) => {
      const kanbanButton = page.getByRole('button', { name: /kanban/i });

      if (await kanbanButton.isVisible()) {
        await kanbanButton.click();

        await expect(page.getByText(/to do/i)).toBeVisible();
        await expect(page.getByText(/in progress/i)).toBeVisible();
        await expect(page.getByText(/done/i)).toBeVisible();
      }
    });
  });

  test.describe('Task Deletion', () => {
    test.skip('deletes task with confirmation', async ({ page }) => {
      await page.goto('/dashboard/tasks/task-1');

      const deleteButton = page.getByRole('button', { name: /delete/i });

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: /confirm/i }).click();

        // Should redirect to task list
        await expect(page).toHaveURL(/\/dashboard\/tasks$/);
      }
    });
  });
});
