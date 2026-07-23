import { test, expect } from './helpers/allure';
import { baseQuestionSurvey, baseSectionSurvey } from './helpers/fixtures';
import { openDraftPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Required Validation', () => {
  test('blocks single-page submit until required answer is provided', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.questions[0].required = true;
    await setupApiMocks(page, { surveyOverride: survey });
    await openDraftPreview(page, survey);

    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(survey.questions[0].title)).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit Survey/i })).toBeVisible();
  });

  test('blocks section navigation until current required question is answered', async ({ page }) => {
    const survey = baseSectionSurvey();
    survey.questions[0].required = true;
    await setupApiMocks(page, { surveyOverride: survey });
    await openDraftPreview(page, survey);

    await page.getByRole('button', { name: /^Next$/i }).click();
    await expect(page.getByText(survey.questions[0].title)).toBeVisible();
  });
});
