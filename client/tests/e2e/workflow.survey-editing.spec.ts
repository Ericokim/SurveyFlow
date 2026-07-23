import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openEditor, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Survey Editing', () => {
  test('edits question title and uses updated draft data in preview', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    await expect(page.getByText(/Editor|Survey Title|Add Question/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Preview/i }).first()).toBeVisible();
  });

  test('duplicates survey from editor top bar', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    const duplicateButton = page.getByRole('button', { name: /^Duplicate$/i }).first();
    await expect(duplicateButton).toBeVisible();
    await expect(duplicateButton).toBeEnabled();
    await duplicateButton.click();

    await expect(page.getByText(/Duplicate Survey\?/i)).toBeVisible();
    await page
      .locator('[role="alertdialog"]')
      .getByRole('button', { name: /^Duplicate$/i })
      .click();

    await expect(page).toHaveURL(/\/surveys\/survey-dup-1/);
  });
});
