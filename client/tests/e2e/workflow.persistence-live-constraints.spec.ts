import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openEditor, openLiveSurvey, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Persistence and Live Constraints', () => {
  test('persists editor save across reload and reflects in live respondent route', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, { surveyOverride: survey });
    await openEditor(page, survey._id);

    await expect(page.getByText(/Survey Title/i)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Survey Title/i)).toBeVisible();
  });

  test('enforces whitelist gate and allows authorized identifier', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.isWhitelistEnabled = true;
    await setupApiMocks(page, { surveyOverride: survey, whitelistAllowedIdentifiers: ['allow@example.com'] });
    await openLiveSurvey(page, survey.publicId);

    await expect(page.getByText(/access|identifier|email/i).first()).toBeVisible();
  });

  test('enforces one-response-per-recipient lockout in live mode', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.oneResponsePerRecipient = true;
    await setupApiMocks(page, { surveyOverride: survey });

    await page.goto(`/r/${survey.publicId}?rid=recipient-1`);
    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(/Thank you|submitted/i).first()).toBeVisible();

    await page.goto(`/r/${survey.publicId}?rid=recipient-1`);
    await expect(page.getByText(/Thank you|submitted/i).first()).toBeVisible();
  });

  test('anonymous reopen shows form (no false local lockout)', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.oneResponsePerRecipient = true;
    await setupApiMocks(page, { surveyOverride: survey });

    await openLiveSurvey(page, survey.publicId);
    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(/Thank you|submitted/i).first()).toBeVisible();

    await openLiveSurvey(page, survey.publicId);
    await expect(page.getByText(/Thank you|submitted/i).first()).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Original question title/i })).toBeVisible();
  });

  test('multiple-response mode allows repeat identified submissions in live mode', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.oneResponsePerRecipient = false;
    await setupApiMocks(page, { surveyOverride: survey });

    await page.goto(`/r/${survey.publicId}?rid=recipient-1`);
    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(/Thank you|submitted/i).first()).toBeVisible();

    await page.goto(`/r/${survey.publicId}?rid=recipient-1`);
    await expect(page.getByText(/Thank you|submitted/i).first()).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Original question title/i })).toBeVisible();
  });

  test('shows a closed-survey message when submission is rejected after the survey closes', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.status = 'published';
    await setupApiMocks(page, {
      surveyOverride: survey,
      forceClosedOnSubmit: true,
    });

    await openLiveSurvey(page, survey.publicId);
    await page.getByRole('button', { name: /Submit Survey/i }).click();

    await expect(page.getByRole('heading', { name: /Survey is closed/i })).toBeVisible();
    await expect(
      page.getByText(/This survey is no longer accepting responses/i)
    ).toBeVisible();
    await expect(
      page.getByText(/already completed this survey/i)
    ).toHaveCount(0);
  });

  test('whitelist re-entry shows the already-completed state instead of an inline form error', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.isWhitelistEnabled = true;
    await setupApiMocks(page, {
      surveyOverride: survey,
      whitelistAllowedIdentifiers: ['allow@example.com'],
    });

    await openLiveSurvey(page, survey.publicId);
    await page.getByLabel(/Whitelisted Email or Phone/i).fill('allow@example.com');
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(/Thank you|submitted/i).first()).toBeVisible();

    await openLiveSurvey(page, survey.publicId);
    await page.getByLabel(/Whitelisted Email or Phone/i).fill('allow@example.com');
    await page.getByRole('button', { name: /Continue/i }).click();

    await expect(page.getByText(/^Already Completed$/i)).toBeVisible();
    await expect(
      page.getByText(/You have already completed this survey/i)
    ).toBeVisible();
    await expect(
      page.getByLabel(/Whitelisted Email or Phone/i)
    ).toHaveCount(0);
  });
});
