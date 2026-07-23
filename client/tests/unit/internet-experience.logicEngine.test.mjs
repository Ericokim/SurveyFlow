import { test } from 'node:test';
import { ok } from 'node:assert';
import {
  getVisibleQuestionIds,
  getVisibleSectionIds,
} from '../../src/lib/utils/logicEngine.js';
import {
  loadInternetExperienceFixture,
  toRuntimeSurvey,
} from '../helpers/internetExperienceFixture.mjs';

const runtimeSurvey = toRuntimeSurvey(loadInternetExperienceFixture());

function evaluateBranchVisibility(answers) {
  return getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    answers
  );
}

test('q2 enables MDU branch section and hides sibling branches', () => {
  const visibleSections = evaluateBranchVisibility({
    q2: 'Multi-Dwelling Unit (Apartment/Estate)',
  });

  ok(visibleSections.has('mdus'));
  ok(!visibleSections.has('sdus'));
  ok(!visibleSections.has('enterprise'));
});

test('q2 enables Enterprise branch section and hides sibling branches', () => {
  const visibleSections = evaluateBranchVisibility({
    q2: 'Enterprise (Office/Commercial facility)',
  });

  ok(visibleSections.has('enterprise'));
  ok(!visibleSections.has('mdus'));
  ok(!visibleSections.has('sdus'));
});

test('q6 smart home devices triggers q12 visibility rule', () => {
  const visible = getVisibleQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.visibilityRules,
    { q6: ['Smart home / IoT devices (CCTV, sensors, etc)'] }
  );

  ok(visible.has('q12'));
});

test('q2 enables SDU branch section and hides sibling branches', () => {
  const visibleSections = evaluateBranchVisibility({
    q2: 'Single-Dwelling Unit (Standalone house)',
  });

  ok(visibleSections.has('sdus'));
  ok(!visibleSections.has('mdus'));
  ok(!visibleSections.has('enterprise'));
});
