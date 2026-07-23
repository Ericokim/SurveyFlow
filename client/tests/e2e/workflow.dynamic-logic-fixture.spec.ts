import { test, expect } from './helpers/allure';
import { fixtureScenarios, fixtureSurvey } from './helpers/logicFixture';
import { openPublicPreview, setupApiMocks } from './helpers/setup';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const expectQuestionInViewport = async (page: any, questionId: string) => {
  const locator = page.locator(`[data-question-id="${questionId}"]`);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).toBeTruthy();
  expect(viewport).toBeTruthy();
  if (!box || !viewport) return;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(viewport.height * 0.8);
};

test.describe('Workflow: Dynamic Logic Fixture', () => {
  const survey = fixtureSurvey();
  const scenarios = fixtureScenarios();

  for (const scenario of scenarios) {
    test(`scenario: ${scenario.id}`, async ({ page }) => {
      await setupApiMocks(page, { surveyOverride: survey });
      await openPublicPreview(page, survey.publicId);

      await page.getByRole('textbox', { name: 'Name?' }).fill('Jane');
      await page.getByRole('radio', { name: scenario.answer }).click();

      if (
        scenario.expected.action === 'jump_question' &&
        scenario.expected.targetSectionId === 'bio' &&
        scenario.expected.targetQuestionTitle
      ) {
        await expect(
          page.getByRole('heading', {
            name: new RegExp(escapeRegExp(scenario.expected.targetQuestionTitle)),
          })
        ).toBeVisible();
        await page.getByRole('button', { name: /^Next$/i }).click();
        await expect(page.getByText(/Section:\s*Work/i)).toBeVisible();
        return;
      }

      if (scenario.expected.action === 'terminate') {
        const nextBtn = page.getByRole('button', { name: /^Next$/i });
        if ((await nextBtn.count()) > 0) {
          await nextBtn.click();
        }
        await expect(
          page.getByText(/Thank you|submitted|Submit Survey/i).first()
        ).toBeVisible();
        return;
      }

      await page.getByRole('button', { name: /^Next$/i }).click();

      if (scenario.expected.action === 'jump_section') {
        await expect(page.getByText(/Section:\s*Work/i)).toBeVisible();
        if (scenario.expected.targetQuestionId) {
          await expectQuestionInViewport(page, scenario.expected.targetQuestionId);
        }
        return;
      }

      if (scenario.expected.action === 'jump_question') {
        await expect(page.getByText(/Section:\s*Work/i)).toBeVisible();
        if (scenario.expected.targetQuestionId) {
          await expectQuestionInViewport(page, scenario.expected.targetQuestionId);
        }
        if (scenario.id === 'cross_section_question_jump') {
          await expect(
            page.getByRole('heading', { name: /Field of expertise\?/i })
          ).not.toBeVisible();
        }
        return;
      }

      // fallback
      await expect(page.getByText(/Section:\s*Work/i)).toBeVisible();
    });
  }
});
