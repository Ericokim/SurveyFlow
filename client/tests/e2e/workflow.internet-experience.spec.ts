import { test, expect } from './helpers/allure';
import { openLiveSurvey, openPublicPreview, setupApiMocks } from './helpers/setup';

const ieqBranchSurvey = {
  _id: 'ieq-e2e-branch',
  publicId: 'ieq-e2e-branch-public',
  title: 'Internet Experience Questionnaire',
  description: 'IEQ branch checks',
  status: 'published',
  sections: [
    { id: 'profile', title: 'Profile', order: 1, questionIds: ['q1', 'q2'] },
    { id: 'mdus', title: 'MDU', order: 2, questionIds: ['q18'] },
    { id: 'sdus', title: 'SDU', order: 3, questionIds: [] },
    { id: 'enterprise', title: 'Enterprise', order: 4, questionIds: [] },
  ],
  questions: [
    {
      id: 'q1',
      type: 'single_choice',
      title: 'What is your location within Westlands?',
      sectionId: 'profile',
      required: true,
      order: 1,
      options: ['Parklands', 'Loresho'],
    },
    {
      id: 'q2',
      type: 'single_choice',
      title: 'What type is your premises?',
      sectionId: 'profile',
      required: true,
      order: 2,
      options: [
        'Multi-Dwelling Unit (Apartment/Estate)',
        'Single-Dwelling Unit (Standalone house)',
        'Enterprise (Office/Commercial facility)',
      ],
    },
    {
      id: 'q18',
      type: 'single_choice',
      title: 'What is the size of your organization?',
      sectionId: 'mdus',
      required: true,
      order: 1,
      options: ['Large (More than 100 employees)', 'Medium (50-100 employees)'],
    },
  ],
  visibilityRules: [],
  navigationRules: [
    {
      id: 'ieq_nav_q2_mdu',
      fromSectionId: 'profile',
      when: {
        questionId: 'q2',
        operator: 'equals',
        value: 'Multi-Dwelling Unit (Apartment/Estate)',
      },
      action: { type: 'jump', targetSectionId: 'mdus' },
      priority: 10,
    },
  ],
  settings: {
    presentationMode: 'multi_step' as const,
    isSectional: true,
    autoAdvanceThreshold: null,
  },
  themeColor: '#1d4ed8',
  thankYouMessage: 'Thank you for sharing your internet experience!',
  showProgress: true,
  oneResponsePerRecipient: false,
  isWhitelistEnabled: false,
};

const ieqIotSurvey = {
  _id: 'ieq-e2e-iot',
  publicId: 'ieq-e2e-iot-public',
  title: 'Internet Experience Questionnaire',
  description: 'IEQ IoT visibility checks',
  status: 'published',
  sections: [],
  questions: [
    {
      id: 'q6',
      type: 'multiple_choice',
      title: 'Which types of devices are regularly connected? (Select all that apply)',
      sectionId: 'profile',
      required: true,
      order: 1,
      options: [
        'Smartphones',
        'Laptops / Desktops',
        'Smart home / IoT devices (CCTV, sensors, etc)',
      ],
    },
    {
      id: 'q12',
      type: 'multiple_choice',
      title: 'Which issue makes internet performance unacceptable for you? (Select all that apply)',
      sectionId: 'performance',
      required: true,
      order: 2,
      options: ['Low speeds', 'High latency'],
    },
  ],
  visibilityRules: [
    {
      id: 'ieq_vis_q12',
      targetType: 'question',
      targetId: 'q12',
      effect: 'show',
      when: {
        questionId: 'q6',
        operator: 'in',
        value: ['Smart home / IoT devices (CCTV, sensors, etc)'],
      },
      priority: 0,
    },
  ],
  navigationRules: [],
  settings: {
    presentationMode: 'single_page' as const,
    isSectional: false,
    autoAdvanceThreshold: null,
  },
  themeColor: '#1d4ed8',
  thankYouMessage: 'Thank you for sharing your internet experience!',
  showProgress: true,
  oneResponsePerRecipient: false,
  isWhitelistEnabled: false,
};

test.describe('Workflow: Internet Experience Questionnaire', () => {
  test('q2 branch routes to MDU section', async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: ieqBranchSurvey });
    await openPublicPreview(page, ieqBranchSurvey.publicId);

    await page.getByRole('radio', { name: 'Parklands' }).click();
    await page
      .getByRole('radio', {
        name: 'Multi-Dwelling Unit (Apartment/Estate)',
      })
      .click();

    await page.getByRole('button', { name: /^Next$/i }).click();

    await expect(
      page.getByRole('heading', {
        name: 'What is the size of your organization?',
      })
    ).toBeVisible();
  });

  test('q6 IoT selection shows q12', async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: ieqIotSurvey });
    await openPublicPreview(page, ieqIotSurvey.publicId);

    await expect(
      page.getByRole('heading', {
        name: 'Which issue makes internet performance unacceptable for you? (Select all that apply)',
      })
    ).toHaveCount(0);

    await page
      .getByRole('checkbox', {
        name: 'Smart home / IoT devices (CCTV, sensors, etc)',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Which issue makes internet performance unacceptable for you? (Select all that apply)',
      })
    ).toBeVisible();
  });

  test('live survey shows one required error per question (no duplicate alert)', async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: ieqBranchSurvey });
    await openLiveSurvey(page, ieqBranchSurvey.publicId);

    await page.getByRole('button', { name: /^Next$/i }).click();

    await expect(page.getByText('This question is required.')).toHaveCount(2);
  });

  test('live survey applies theme color, renders logo when provided, and falls back when theme absent', async ({
    page,
  }) => {
    const themedSurvey = {
      ...ieqBranchSurvey,
      themeColor: '#1d4ed8',
      logo: '/vite.svg',
    };
    await setupApiMocks(page, { surveyOverride: themedSurvey });
    await openLiveSurvey(page, themedSurvey.publicId);

    const header = page
      .getByRole('heading', { name: 'Internet Experience Questionnaire' })
      .locator('xpath=ancestor::div[contains(@class,"text-white")]')
      .first();
    await expect(header).toHaveCSS('background-color', 'rgb(29, 78, 216)');
    await expect(page.getByAltText('Logo')).toBeVisible();

    const noThemeSurvey = { ...ieqBranchSurvey, publicId: 'ieq-e2e-no-theme', themeColor: '' };
    await setupApiMocks(page, { surveyOverride: noThemeSurvey });
    await openLiveSurvey(page, noThemeSurvey.publicId);

    const fallbackHeader = page
      .getByRole('heading', { name: 'Internet Experience Questionnaire' })
      .locator('xpath=ancestor::div[contains(@class,"text-white")]')
      .first();
    await expect(fallbackHeader).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
});
