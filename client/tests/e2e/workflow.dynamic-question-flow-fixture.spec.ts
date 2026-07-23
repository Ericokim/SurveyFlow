import { test, expect } from './helpers/allure';
import {
  fixtureQuestionFlowScenarios,
  fixtureQuestionFlowSurvey,
} from './helpers/logicFixture';
import { openPublicPreview, setupApiMocks } from './helpers/setup';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('Workflow: Dynamic Question Flow Fixture', () => {
  const survey = fixtureQuestionFlowSurvey();
  const scenarios = fixtureQuestionFlowScenarios();

  for (const scenario of scenarios) {
    test(`scenario: ${scenario.id}`, async ({ page }) => {
      await setupApiMocks(page, { surveyOverride: survey });
      await openPublicPreview(page, survey.publicId);

      await page.getByRole('radio', { name: scenario.answer }).click();
      await page.getByRole('button', { name: /^Next$/i }).click();

      if (scenario.expected.action === 'fallback') {
        await expect(page.getByRole('heading', { name: /^Q8\*?$/i })).toBeVisible();
        return;
      }

      await expect(
        page.getByRole('heading', {
          name: new RegExp(`^${escapeRegExp(scenario.expected.targetQuestionTitle || '')}\\*?$`, 'i'),
        })
      ).toBeVisible();
    });
  }
});
