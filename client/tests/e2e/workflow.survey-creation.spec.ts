import { test, expect } from './helpers/allure';
import { openEditor, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Survey Creation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
    await setupApiMocks(page);
  });

  test('loads create mode and starts a question-based survey', async ({ page }) => {
    await openEditor(page, 'new');
    await expect(page.getByText(/Create New Survey|Editor Survey|Survey Title/i).first()).toBeVisible();
    await expect(page.getByText(/Draft/i).first()).toBeVisible();
  });
});
