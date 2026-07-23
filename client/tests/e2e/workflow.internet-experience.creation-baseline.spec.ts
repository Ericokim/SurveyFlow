import { test, expect } from './helpers/allure';
import { openPublicPreview, setupApiMocks } from './helpers/setup';

const ieqCreationBaselineSurvey = {
  _id: 'ieq-creation-baseline',
  publicId: 'ieq-creation-baseline-public',
  title: 'Internet Experience Questionnaire',
  description: 'Creation baseline logic survey',
  status: 'draft',
  sections: [
    { id: 'profile', title: 'Profile', order: 1, questionIds: ['q6', 'q2'] },
    { id: 'mdus', title: 'MDU', order: 2, questionIds: ['q18'] },
    { id: 'sdus', title: 'SDU', order: 3, questionIds: ['q24'] },
    { id: 'enterprise', title: 'Enterprise', order: 4, questionIds: ['q29'] },
    { id: 'performance', title: 'Performance', order: 5, questionIds: ['q11', 'q12'] },
  ],
  questions: [
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
      id: 'q6',
      type: 'single_choice',
      title: 'Which types of devices are regularly connected?',
      sectionId: 'profile',
      required: true,
      order: 1,
      options: [
        'No IoT devices',
        'Smart home / IoT devices (CCTV, sensors, etc)',
      ],
    },
    {
      id: 'q18',
      type: 'single_choice',
      title: 'What is the size of your organization?',
      sectionId: 'mdus',
      required: true,
      order: 1,
      options: ['Small (10-49 employees)', 'Large (More than 100 employees)'],
    },
    {
      id: 'q24',
      type: 'single_choice',
      title: 'How reliable is your current internet connection at home?',
      sectionId: 'sdus',
      required: true,
      order: 1,
      options: ['Reliable', 'Very reliable'],
    },
    {
      id: 'q29',
      type: 'single_choice',
      title: 'How critical is internet to business operations?',
      sectionId: 'enterprise',
      required: true,
      order: 1,
      options: ['Important', 'Very critical'],
    },
    {
      id: 'q11',
      type: 'single_choice',
      title: 'How often do internet disruptions affect your activities?',
      sectionId: 'performance',
      required: true,
      order: 1,
      options: ['Rarely', 'Frequently'],
    },
    {
      id: 'q12',
      type: 'multiple_choice',
      title: 'Which issue makes internet performance unacceptable?',
      sectionId: 'performance',
      required: false,
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
        operator: 'equals',
        value: 'Smart home / IoT devices (CCTV, sensors, etc)',
      },
      priority: 0,
    },
  ],
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
      priority: 0,
    },
    {
      id: 'ieq_nav_q2_sdu',
      fromSectionId: 'profile',
      when: {
        questionId: 'q2',
        operator: 'equals',
        value: 'Single-Dwelling Unit (Standalone house)',
      },
      action: { type: 'jump', targetSectionId: 'sdus' },
      priority: 0,
    },
    {
      id: 'ieq_nav_q2_ent',
      fromSectionId: 'profile',
      when: {
        questionId: 'q2',
        operator: 'equals',
        value: 'Enterprise (Office/Commercial facility)',
      },
      action: { type: 'jump', targetSectionId: 'enterprise' },
      priority: 0,
    },
    {
      id: 'ieq_nav_q18_perf',
      fromSectionId: 'mdus',
      when: { questionId: 'q18', operator: 'exists' },
      action: { type: 'jump', targetSectionId: 'performance' },
      priority: 0,
    },
    {
      id: 'ieq_nav_q24_perf',
      fromSectionId: 'sdus',
      when: { questionId: 'q24', operator: 'exists' },
      action: { type: 'jump', targetSectionId: 'performance' },
      priority: 0,
    },
    {
      id: 'ieq_nav_q29_perf',
      fromSectionId: 'enterprise',
      when: { questionId: 'q29', operator: 'exists' },
      action: { type: 'jump', targetSectionId: 'performance' },
      priority: 0,
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

test.describe('Workflow: IEQ Creation Baseline', () => {
  test('draft preview handles section branching created from survey logic', async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: ieqCreationBaselineSurvey });
    await openPublicPreview(page, ieqCreationBaselineSurvey.publicId);

    await page.getByRole('radio', { name: 'No IoT devices' }).click();
    await page
      .getByRole('radio', {
        name: 'Single-Dwelling Unit (Standalone house)',
      })
      .click();
    await page.getByRole('button', { name: /^Next$/i }).click();

    await expect(
      page.getByRole('heading', {
        name: 'How reliable is your current internet connection at home?',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'What is the size of your organization?',
      })
    ).toHaveCount(0);
  });

  test('conditional hidden answers are pruned before submit', async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: ieqCreationBaselineSurvey });

    await openPublicPreview(page, ieqCreationBaselineSurvey.publicId);

    await page.getByRole('radio', {
      name: 'Smart home / IoT devices (CCTV, sensors, etc)',
    }).click();
    await page.getByRole('radio', { name: 'Multi-Dwelling Unit (Apartment/Estate)' }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();

    await page.getByRole('radio', { name: 'Small (10-49 employees)' }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();

    await page.getByRole('radio', { name: 'Rarely' }).click();
    await page.getByRole('checkbox', { name: 'Low speeds' }).click();

    await page.getByRole('button', { name: /Previous/i }).click();
    await page.getByRole('button', { name: /Previous/i }).click();

    await page.getByRole('radio', { name: 'No IoT devices' }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Which issue makes internet performance unacceptable?' })
    ).toHaveCount(0);
    await page.getByRole('radio', { name: 'Frequently' }).click();

    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(/preview was validated successfully|Thank you/i).first()).toBeVisible();
  });
});
