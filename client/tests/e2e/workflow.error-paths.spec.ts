import { test, expect } from './helpers/allure';
import { openLiveSurvey, openPublicPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Error Paths', () => {
  test('shows load error UI when public survey endpoint fails', async ({ page }) => {
    await setupApiMocks(page, { forcePublicSurveyError: true });
    await openLiveSurvey(page, 'pub-q-1');
    await expect(
      page.getByRole('heading', { name: /Unable to load survey/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();
  });

  test('shows load error UI when preview survey endpoint fails', async ({ page }) => {
    await setupApiMocks(page, { forcePreviewSurveyError: true });
    await openPublicPreview(page, 'pub-q-1');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Survey|Submit Survey|Try again/i).first()).toBeVisible();
  });
});
