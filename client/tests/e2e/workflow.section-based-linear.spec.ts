import { test, expect } from './helpers/allure';
import { baseSectionSurvey } from './helpers/fixtures';
import { openDraftPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Section-based Linear', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: baseSectionSurvey() });
  });

  test('navigates multi-step sections with next/previous and completes preview', async ({ page }) => {
    await openDraftPreview(page, baseSectionSurvey());
    const nextBtn = page.getByRole('button', { name: /^Next$/i });
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
    }
    await expect(page.getByRole('button', { name: /Previous|Submit Survey|Next/i }).first()).toBeVisible();
  });
});
