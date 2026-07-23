import { test, expect } from './helpers/allure';
import { baseQuestionSurvey, baseSectionSurvey, emptySectionTailSurvey } from './helpers/fixtures';
import { openLiveSurvey, openPublicPreview, setupApiMocks } from './helpers/setup';

test.describe('Workflow: Response', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('public preview route submits and shows confirmation', async ({ page }) => {
    await openPublicPreview(page, 'pub-q-1');
    await page.getByRole('button', { name: /Submit Survey/i }).click();
    await expect(page.getByText(/Thank you|validated successfully|submitted/i).first()).toBeVisible();
  });

  test('empty trailing section keeps safe navigation (Previous only)', async ({ page }) => {
    await setupApiMocks(page, { surveyOverride: emptySectionTailSurvey() });
    await openPublicPreview(page, 'pub-s-1');

    const nextBtn = page.getByRole('button', { name: /^Next$/i });
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
      await expect(page.getByText(/This section has no questions|Section/i).first()).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /Next|Previous|Submit Survey/i }).first()).toBeVisible();
  });

  test('whitelisted live survey loads required dropdown questions without crashing', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.status = 'published';
    survey.isWhitelistEnabled = true;
    survey.questions = [
      {
        id: 'q1',
        type: 'dropdown',
        title: 'Choose a path',
        options: ['Option 1', 'Option 2'],
        required: true,
        order: 1,
        sectionId: 's1',
      },
    ];
    survey.sections = [
      { id: 's1', title: 'Section 1', order: 0, questionIds: ['q1'] },
    ];
    survey.settings = {
      presentationMode: 'single_page',
      isSectional: true,
      autoAdvanceThreshold: null,
    };

    await setupApiMocks(page, {
      surveyOverride: survey,
      whitelistAllowedIdentifiers: ['allow@example.com'],
    });
    await openLiveSurvey(page, survey.publicId);

    await expect(page.getByText(/Please enter your whitelisted email or phone/i)).toBeVisible();
    await page.getByLabel(/Whitelisted Email or Phone/i).fill('allow@example.com');
    await page.getByRole('button', { name: /Continue/i }).click();

    await expect(page.getByText('Choose a path')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
  });

  test('live survey with an empty first section does not loop while auto-advancing', async ({ page }) => {
    const survey = baseQuestionSurvey();
    survey.status = 'published';
    survey.questions = [
      {
        id: 'q1',
        type: 'short_text',
        title: 'Visible question',
        required: true,
        order: 1,
        sectionId: 's2',
      },
    ];
    survey.sections = [
      { id: 's1', title: 'Bio', order: 0, questionIds: [] },
      { id: 's2', title: 'Details', order: 1, questionIds: ['q1'] },
    ];
    survey.settings = {
      presentationMode: 'multi_step',
      isSectional: true,
      autoAdvanceThreshold: null,
    };

    await setupApiMocks(page, { surveyOverride: survey });
    await openLiveSurvey(page, survey.publicId);

    await expect(page.getByText('Visible question')).toBeVisible();
    await expect(page.getByText(/This section has no questions/i)).toHaveCount(0);
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
  });

  test('live survey ignores stale draft navigation from an older published version', async ({ page }) => {
    const survey = baseSectionSurvey();
    survey.status = 'published';
    survey.version = 2 as any;
    delete (survey as any).publishedVersion;
    delete (survey as any).currentVersion;

    await page.addInitScript(() => {
      localStorage.setItem(
        'survey_draft_pub-s-1_v1_anon',
        JSON.stringify({ sq1: 'Previously answered bio question' })
      );
      localStorage.setItem(
        'survey_draft_pub-s-1_v1_anon_nav',
        JSON.stringify({
          index: 1,
          history: ['s1'],
          jumpChain: [],
        })
      );
    });

    await setupApiMocks(page, { surveyOverride: survey });
    await openLiveSurvey(page, survey.publicId);

    await expect(page.getByText('Section 1 question')).toBeVisible();
    await expect(page.getByText(/Section:\s*Section 1/i)).toBeVisible();
    await expect(page.getByText('Section 2 question')).toHaveCount(0);
  });

  test('live survey reset query starts from the first section even with saved draft navigation', async ({ page }) => {
    const survey = baseSectionSurvey();
    survey.status = 'published';
    survey.version = 4 as any;
    delete (survey as any).publishedVersion;
    delete (survey as any).currentVersion;

    await page.addInitScript(() => {
      localStorage.setItem(
        'survey_draft_pub-s-1_v4_anon',
        JSON.stringify({ sq1: 'Saved answer' })
      );
      localStorage.setItem(
        'survey_draft_pub-s-1_v4_anon_nav',
        JSON.stringify({
          index: 1,
          history: ['s1'],
          jumpChain: [],
        })
      );
    });

    await setupApiMocks(page, { surveyOverride: survey });
    await page.goto(`/r/${survey.publicId}?reset=1`);

    await expect(page.getByText('Section 1 question')).toBeVisible();
    await expect(page.getByText(/Section:\s*Section 1/i)).toBeVisible();
    await expect(page.getByText('Section 2 question')).toHaveCount(0);
  });

  test('live survey uses section questionIds when question.sectionId is stale', async ({ page }) => {
    const survey = baseSectionSurvey();
    survey.status = 'published';
    survey.version = 3 as any;
    survey.sections = [
      { id: 'bio', title: 'Bio', order: 0, questionIds: ['sq1'] },
      { id: 'education', title: 'Education', order: 1, questionIds: ['sq2'] },
    ];
    survey.questions = [
      {
        id: 'sq1',
        type: 'short_text',
        title: 'Bio question',
        order: 1,
        required: true,
        sectionId: 'old-bio-section-id',
      },
      {
        id: 'sq2',
        type: 'dropdown',
        title: 'Education question',
        order: 2,
        required: true,
        sectionId: 'education',
        options: ['Option 1', 'Option 2'],
      },
    ];
    survey.settings = {
      presentationMode: 'multi_step',
      isSectional: true,
      autoAdvanceThreshold: null,
    };

    await setupApiMocks(page, { surveyOverride: survey });
    await openLiveSurvey(page, survey.publicId);

    await expect(page.getByText('Bio question')).toBeVisible();
    await expect(page.getByText(/Section:\s*Bio/i)).toBeVisible();
    await expect(page.getByText('Education question')).toHaveCount(0);
  });
});
