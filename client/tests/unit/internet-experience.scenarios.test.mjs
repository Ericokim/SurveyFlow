import { test } from 'node:test';
import { deepEqual } from 'node:assert';
import {
  getVisibleSectionIds,
} from '../../src/lib/utils/logicEngine.js';
import {
  loadInternetExperienceFixture,
  toRuntimeSurvey,
} from '../helpers/internetExperienceFixture.mjs';

const ieq = loadInternetExperienceFixture();
const runtimeSurvey = toRuntimeSurvey(ieq);

const sectionOrder = [...runtimeSurvey.sections]
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  .map((section) => section.id);
const sectionIndex = new Map(sectionOrder.map((id, index) => [id, index]));

function toAnswers(steps = []) {
  const answers = {};
  for (const step of steps) {
    const [questionId, value] = Object.entries(step || {})[0] || [];
    if (questionId) answers[questionId] = value;
  }
  return answers;
}

function inferPath(answers) {
  const premises = answers.q2;
  const branchSection =
    premises === 'Multi-Dwelling Unit (Apartment/Estate)'
      ? 'mdus'
      : premises === 'Single-Dwelling Unit (Standalone house)'
        ? 'sdus'
        : 'enterprise';

  const linear = ['profile', 'usage', 'performance', 'value', 'future', 'insight'];
  const withBranch = ['profile', 'usage', 'performance', 'value', branchSection, 'future', 'insight'];

  return withBranch.filter((sectionId, index, arr) => {
    if (arr.indexOf(sectionId) !== index) return false;
    return sectionIndex.has(sectionId);
  });
}

test('scenario_mdu path and branch action align', () => {
  const scenario = ieq.scenarios.find((item) => item.id === 'scenario_mdu');
  const answers = toAnswers(scenario.steps);
  const visibleSectionIds = getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    answers
  );

  deepEqual(visibleSectionIds.has('mdus'), true);
  deepEqual(visibleSectionIds.has('sdus'), false);
  deepEqual(visibleSectionIds.has('enterprise'), false);
  deepEqual(inferPath(answers), scenario.expectedPath);
});

test('scenario_sdu path and branch action align', () => {
  const scenario = ieq.scenarios.find((item) => item.id === 'scenario_sdu');
  const answers = toAnswers(scenario.steps);
  const visibleSectionIds = getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    answers
  );

  deepEqual(visibleSectionIds.has('sdus'), true);
  deepEqual(visibleSectionIds.has('mdus'), false);
  deepEqual(visibleSectionIds.has('enterprise'), false);
  deepEqual(inferPath(answers), scenario.expectedPath);
});

test('scenario_enterprise path and branch action align', () => {
  const scenario = ieq.scenarios.find((item) => item.id === 'scenario_enterprise');
  const answers = toAnswers(scenario.steps);
  const visibleSectionIds = getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    answers
  );

  deepEqual(visibleSectionIds.has('enterprise'), true);
  deepEqual(visibleSectionIds.has('mdus'), false);
  deepEqual(visibleSectionIds.has('sdus'), false);
  deepEqual(inferPath(answers), scenario.expectedPath);
});
