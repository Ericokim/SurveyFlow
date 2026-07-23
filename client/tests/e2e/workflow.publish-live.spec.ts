import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openEditor, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Publish and Live', () => {
  test('publishes a draft survey from editor', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    const publishBtn = page.getByRole('button', { name: /Publish/i }).first();
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();
    await expect(page.getByText(/Publish|published|changes/i).first()).toBeVisible();
  });
});
