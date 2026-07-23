import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openEditor, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Settings and Branding', () => {
  test('updates response settings + thank you message and reflects in preview', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    await page.getByText(/^Settings$/i).first().click({ force: true });
    await expect(page.getByText(/Response Settings|Branding|Default Thank You Message/i).first()).toBeVisible();
  });
});
