import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openDraftPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Question-based Single-page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: baseQuestionSurvey() });
  });

  test('creates question-based survey, adds questions, and completes single-page preview', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await openDraftPreview(page, survey);

    await expect(page.getByText('Original question title')).toBeVisible();
    await expect(page.getByText('Pick one')).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit Survey/i })).toBeVisible();
  });
});
