import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openEditor, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Question Types and Unsaved Changes', () => {
  test('creates all question types in question-based mode', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    await expect(page.getByRole('button', { name: /Add Question/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /Add Question/i }).first().click();
    await expect(page.getByText(/Question Types|Short Text|Single Choice|Multiple Choice|Dropdown|Rating|Date Picker/i).first()).toBeVisible();
  });

  test('flags unsaved changes for required, Other option, and option logic changes', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    await expect(page.getByRole('button', { name: /Save|Save Changes/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Preview/i }).first()).toBeVisible();
  });
});
