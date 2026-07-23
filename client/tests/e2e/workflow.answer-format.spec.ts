import { test, expect } from './helpers/allure';
import { setupApiMocks, openPublicPreview, openLiveSurvey } from './helpers/setup';
import { baseQuestionSurvey } from './helpers/fixtures';

const buildAnswerFormatSurvey = () => {
  const survey = baseQuestionSurvey();
  survey.status = 'published';
  survey.oneResponsePerRecipient = false;
  survey.questions = [
    {
      id: 'q_email',
      type: 'short_text',
      title: 'Email',
      required: true,
      order: 1,
      validation: { predefinedPattern: 'email' },
    },
    {
      id: 'q_phone',
      type: 'short_text',
      title: 'Phone',
      required: true,
      order: 2,
      validation: { predefinedPattern: 'phone' },
    },
    {
      id: 'q_numeric',
      type: 'short_text',
      title: 'Decimal Number',
      required: true,
      order: 3,
      validation: { predefinedPattern: 'numeric' },
    },
    {
      id: 'q_regex',
      type: 'short_text',
      title: 'Uppercase Code',
      required: true,
      order: 4,
      validation: { pattern: '^[A-Z]{3}$' },
    },
  ] as any;

  return survey;
};

async function validateAndSubmit(page: any) {
  await page.locator('#q_email').fill('not-an-email');
  await page.locator('#q_phone').fill('0001');
  await page.locator('#q_numeric').fill('1e2');
  await page.locator('#q_regex').fill('ab1');
  await page.getByRole('button', { name: /Submit Survey/i }).click();

  await expect(page.getByText(/Please enter a valid email value/i)).toBeVisible();
  await expect(page.getByText(/Please enter a valid phone value/i)).toBeVisible();
  await expect(page.getByText(/Please enter a valid numeric value/i)).toBeVisible();
  await expect(page.getByText(/Please enter a valid required format value/i)).toBeVisible();

  await page.locator('#q_email').fill('qa@example.com');
  await page.locator('#q_phone').fill('+254712345678');
  await page.locator('#q_numeric').fill('10.75');
  await page.locator('#q_regex').fill('ABC');
  await page.getByRole('button', { name: /Submit Survey/i }).click();

  await expect(page.getByText(/Thank you|validated successfully|submitted/i).first()).toBeVisible();
}

test.describe('Workflow: Answer Format', () => {
  test('validates and submits in preview mode', async ({ page }) => {
    const survey = buildAnswerFormatSurvey();
    await setupApiMocks(page, { surveyOverride: survey });
    await openPublicPreview(page, survey.publicId);
    await validateAndSubmit(page);
  });

  test('validates and submits in published live mode', async ({ page }) => {
    const survey = buildAnswerFormatSurvey();
    await setupApiMocks(page, { surveyOverride: survey });
    await openLiveSurvey(page, survey.publicId);
    await validateAndSubmit(page);
  });
});
