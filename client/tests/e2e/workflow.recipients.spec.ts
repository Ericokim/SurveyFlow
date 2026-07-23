import { test, expect } from './helpers/allure';
import { baseQuestionSurvey } from './helpers/fixtures';
import { openEditor, setupApiMocks, setupAuthenticatedPage } from './helpers/setup';

test.describe('Workflow: Recipients', () => {
  test('renders recipient metrics/list controls and supports add dialog flow', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, {
      surveyOverride: survey,
      recipients: [
        {
          _id: 'r1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          status: 'in_progress',
          createdAt: '2026-03-17T08:00:00.000Z',
          journey: {
            label: '42% complete',
            answeredLabel: '5/12 answered',
            lastSavedAt: '2026-03-17T09:00:00.000Z',
          },
        },
      ],
      recipientStats: { total: 1, pending: 0, invited: 0, in_progress: 1, completed: 0 },
    });

    await openEditor(page, survey._id);
    await expect(page.getByText(/^Recipients$/i).first()).toBeVisible();
    await expect(page.getByText(/Editor|Settings|Recipients/i).first()).toBeVisible();
    await page.getByRole('tab', { name: /^Recipients$/i }).click();
    await expect(page.getByText(/IN PROGRESS/i).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: /Jane Doe/i })).toBeVisible();
  });

  test('recipients tab avoids response analytics requests until the Responses tab is opened', async ({ page }) => {
    const survey = {
      ...baseQuestionSurvey(),
      status: 'published',
    } as any;
    survey.publishedVersion = 1;
    survey.currentVersion = 1;
    const requestCounts = {
      recipientStats: 0,
      recipients: 0,
      analytics: 0,
      questionAnalytics: 0,
      responses: 0,
    };

    page.on('request', (request) => {
      if (!['xhr', 'fetch'].includes(request.resourceType())) return;
      const url = new URL(request.url());
      const path = url.pathname;

      if (/\/api\/surveys\/[^/]+\/recipients\/stats$/.test(path)) {
        requestCounts.recipientStats += 1;
      } else if (/\/api\/surveys\/[^/]+\/recipients$/.test(path)) {
        requestCounts.recipients += 1;
      } else if (/\/api\/surveys\/[^/]+\/analytics\/questions$/.test(path)) {
        requestCounts.questionAnalytics += 1;
      } else if (/\/api\/surveys\/[^/]+\/analytics$/.test(path)) {
        requestCounts.analytics += 1;
      } else if (/\/api\/admin\/surveys\/[^/]+\/responses$/.test(path)) {
        requestCounts.responses += 1;
      }
    });

    await setupAuthenticatedPage(page);
    await setupApiMocks(page, {
      surveyOverride: survey,
      recipients: [
        {
          _id: 'r1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          status: 'in_progress',
          createdAt: '2026-03-17T08:00:00.000Z',
        },
      ],
      recipientStats: { totalRecipients: 1, pending: 0, invited: 0, in_progress: 1, completed: 0 },
    });

    await openEditor(page, survey._id);
    await page.getByRole('tab', { name: /^Recipients$/i }).click();
    await page.waitForLoadState('networkidle');

    expect(requestCounts.recipientStats).toBe(1);
    expect(requestCounts.recipients).toBe(1);
    expect(requestCounts.analytics).toBe(0);
    expect(requestCounts.questionAnalytics).toBe(0);
    expect(requestCounts.responses).toBe(0);

    await page.getByRole('tab', { name: /^Responses$/i }).click();
    await page.waitForLoadState('networkidle');

    expect(requestCounts.analytics).toBeGreaterThan(0);
    expect(requestCounts.questionAnalytics).toBeGreaterThan(0);
    expect(requestCounts.responses).toBeGreaterThan(0);
  });

  test('upload modal links validation errors to the affected preview rows', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, {
      surveyOverride: survey,
      recipients: [],
      recipientStats: { total: 0, pending: 0, invited: 0, in_progress: 0, completed: 0 },
    });

    await openEditor(page, survey._id);
    await page.getByRole('tab', { name: /^Recipients$/i }).click();
    await page.getByRole('button', { name: /Upload CSV/i }).click();

    const csv = [
      'name,phone,email',
      'zaq,254712345677,',
      'qaz,254712345677,',
      'Cyrus,254712345679,',
      'missing,,',
    ].join('\n');

    await page
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'recipient-template.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv),
      });

    await expect(
      page.getByRole('button', {
        name: /Row 2/i,
      })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Row 3/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /^Issue$/i })).toBeVisible();
    await expect(page.getByText(/Duplicate phone/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Hide details/i }).click();
    await expect(page.getByRole('button', { name: /Show details/i })).toBeVisible();
    await page.getByRole('button', { name: /Show details/i }).click();

    const targetError = page.getByRole('button', {
      name: /Row 5/i,
    });
    await targetError.click();

    const emailInput = page.getByLabel('Email for row 5');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('fixed@example.com');
    await expect(emailInput).toHaveValue('fixed@example.com');
    await expect(page.getByText('Missing contact info')).toHaveCount(0);
    await page.getByRole('button', { name: 'Apply row 5 changes' }).click();
    await expect(page.getByLabel('Email for row 5')).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: 'fixed@example.com' }).first()).toBeVisible();

    await page.locator('tbody tr').filter({ hasText: 'zaq' }).first().click();
    await expect(page.getByLabel('Phone for row 2')).toBeVisible();
    await page.getByText('Preview (all rows)').click();
    await expect(page.getByLabel('Phone for row 2')).toHaveCount(0);

    await page.locator('tbody tr').filter({ hasText: 'zaq' }).first().click();
    await expect(page.getByRole('button', { name: 'Remove row 2' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove row 2' }).click();
    await expect(page.getByText('Duplicate phone')).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: 'zaq' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Upload 3 Recipients/i })
    ).toBeVisible();
  });

  test('add recipient dialog defaults the phone input to Kenya with international country selection', async ({ page }) => {
    const survey = baseQuestionSurvey();
    await setupAuthenticatedPage(page);
    await setupApiMocks(page, {
      surveyOverride: survey,
      recipients: [],
      recipientStats: { total: 0, pending: 0, invited: 0, in_progress: 0, completed: 0 },
    });

    await openEditor(page, survey._id);
    await page.getByRole('tab', { name: /^Recipients$/i }).click();
    await page.getByRole('button', { name: /Add Recipient/i }).click();

    const dialog = page.getByRole('dialog', { name: /Add Recipient/i });
    const phoneInput = dialog.getByLabel('Phone Number');

    await expect(phoneInput).toHaveValue('+254');
    await expect(phoneInput).toHaveAttribute('placeholder', '254712345678');

    await dialog.getByRole('combobox').click();
    await expect(page.getByRole('option', { name: /Afghanistan/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Kenya/i })).toBeVisible();
  });
});
