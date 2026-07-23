import { test, expect } from './helpers/allure';
import { baseSectionSurvey } from './helpers/fixtures';
import { openDraftPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Section-based Creation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: baseSectionSurvey() });
  });

  test('creates section-based survey, adds section questions, and previews multi-step', async ({ page }) => {
    await openDraftPreview(page, baseSectionSurvey());
    await expect(page.getByText(/Section:\s*Section 1/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next$/i })).toBeVisible();
  });
});
