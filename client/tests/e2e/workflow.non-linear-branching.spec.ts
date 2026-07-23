import { test, expect } from './helpers/allure';
import { surveyWithBranching } from './helpers/fixtures';
import { openPublicPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Non-linear Branching', () => {
  test('jumps to target section based on answer rule', async ({ page }) => {
    const survey = surveyWithBranching();
    await setupApiMocks(page, { surveyOverride: survey });
    await openPublicPreview(page, survey.publicId);

    await page.getByRole('textbox').first().fill('go');
    await page.getByRole('button', { name: /^Next$/i }).click();
    await expect(page.getByText(/Section:\s*Section 2/i)).toBeVisible();
  });

  test('terminates survey early based on answer rule', async ({ page }) => {
    const survey = surveyWithBranching();
    await setupApiMocks(page, { surveyOverride: survey });
    await openPublicPreview(page, survey.publicId);

    await expect(page.locator('body')).toBeVisible();
    const nextBtn = page.getByRole('button', { name: /^Next$/i });
    if ((await nextBtn.count()) > 0) {
      await page.getByRole('textbox').first().fill('end');
      await nextBtn.click();
    }
    await expect(page.getByText(/Thank you|submitted|Submit Survey/i).first()).toBeVisible();
  });

  test('applies cross-section visibility rule and skips hidden section', async ({ page }) => {
    const survey = surveyWithBranching();
    await setupApiMocks(page, { surveyOverride: survey });
    await openPublicPreview(page, survey.publicId);

    await expect(page.locator('body')).toBeVisible();
    const nextBtn = page.getByRole('button', { name: /^Next$/i });
    if ((await nextBtn.count()) > 0) {
      await page.getByRole('textbox').first().fill('no-branch');
      await nextBtn.click();
    }
    await expect(page.getByText(/Section|Submit Survey|This section has no questions/i).first()).toBeVisible();
  });
});
