import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openDraftPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Preview', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('empty survey preview does not auto-complete and shows empty-state UX', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.questions = [];
    await openDraftPreview(page, survey);

    await expect(page.getByText(/This survey has no questions to preview yet/i)).toBeVisible();
    await expect(page.getByText(/Preview Mode:/i)).toBeVisible();
  });

  test('choice preview shows fallback options plus Other', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.questions = [{ id: 'q1', type: 'single_choice', title: 'Choose', options: [], allowOther: true, order: 1 }];
    await openDraftPreview(page, survey);

    await expect(page.getByText(/Option 1/i)).toBeVisible();
    await expect(page.getByText(/Other/i)).toBeVisible();
  });
});
