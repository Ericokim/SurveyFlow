import { test } from 'node:test';
import { deepEqual, ok } from 'node:assert';
import {
  getAnswerableQuestionIds,
  getOrphanedAnswerKeys,
  getRequiredValidationSet,
  getVisibleQuestionIds,
  getVisibleSectionIds,
} from '../../src/lib/utils/logicEngine.js';
import {
  loadInternetExperienceFixture,
  toRuntimeSurvey,
} from '../helpers/internetExperienceFixture.mjs';

const runtimeSurvey = toRuntimeSurvey(loadInternetExperienceFixture());

function isProvided(value) {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function validateResponse(answers, visitedSections = null) {
  const errors = [];
  const visibleQuestionIds = getVisibleQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.visibilityRules,
    answers
  );
  const visibleSectionIds = getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    answers
  );
  const answerableQuestionIds = getAnswerableQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.sections,
    visibleQuestionIds,
    visibleSectionIds
  );
  const scopedAnswerableQuestionIds =
    Array.isArray(visitedSections) && visitedSections.length > 0
      ? new Set(
          [...answerableQuestionIds].filter((questionId) => {
            const question = runtimeSurvey.questions.find((q) => q.id === questionId);
            return question && visitedSections.includes(question.sectionId);
          })
        )
      : answerableQuestionIds;

  const requiredQuestionIds = runtimeSurvey.questions
    .filter((question) => question.required)
    .map((question) => question.id);
  const answeredQuestionIds = Object.entries(answers)
    .filter(([, value]) => isProvided(value))
    .map(([questionId]) => questionId);

  const { missingRequiredQuestionIds } = getRequiredValidationSet({
    requiredQuestionIds,
    visibleQuestionIds: scopedAnswerableQuestionIds,
    answeredQuestionIds,
  });

  if (missingRequiredQuestionIds.size > 0) {
    errors.push('missing_required');
  }

  for (const question of runtimeSurvey.questions) {
    if (!scopedAnswerableQuestionIds.has(question.id)) continue;
    const answer = answers[question.id];
    if (!isProvided(answer)) continue;

    if (question.type === 'multiple_choice') {
      if (!Array.isArray(answer)) {
        errors.push(`${question.id}_not_array`);
        continue;
      }
      const minSelections = question.validation?.minSelections;
      const maxSelections = question.validation?.maxSelections;
      if (minSelections && answer.length < minSelections) {
        errors.push(`${question.id}_min`);
      }
      if (maxSelections && answer.length > maxSelections) {
        errors.push(`${question.id}_max`);
      }
    }

    if (question.type === 'rating') {
      const scale = Number(question.ratingScale || 5);
      const value = Number(answer);
      if (!Number.isInteger(value) || value < 1 || value > scale) {
        errors.push(`${question.id}_rating_bounds`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

test('required validation fails on empty response', () => {
  const result = validateResponse({});
  deepEqual(result.valid, false);
  ok(result.errors.includes('missing_required'));
});

test('rating outside bounds fails', () => {
  const result = validateResponse(
    {
    q1: 'Parklands',
    q2: 'Single-Dwelling Unit (Standalone house)',
    q3: 'End user only (No decision influence)',
    q4: 'Zuku',
    q5: '4-7 people',
    q6: ['Smart TVs / Streaming devices'],
    q24: 'Reliable',
    q25: 'Price',
    q26: 'Streaming (Netflix, YouTube, etc.)',
    q27: 9,
    },
    ['profile', 'usage', 'performance', 'value', 'sdus', 'future', 'insight']
  );

  deepEqual(result.valid, false);
  ok(result.errors.includes('q27_rating_bounds'));
});

test('multi-select max enforcement fails for q23', () => {
  const result = validateResponse({
    q1: 'Parklands',
    q2: 'Multi-Dwelling Unit (Apartment/Estate)',
    q3: 'Primary decision-maker (Final authority)',
    q4: 'Safaricom',
    q5: 'More than 10 people',
    q6: ['Smartphones'],
    q18: 'Large (More than 100 employees)',
    q19: 'One shared connection for the entire building',
    q20: 'Building Management',
    q21: 'Congestion',
    q22: 'Very willing',
    q23: [
      'Guaranteed minimum speeds',
      'Centralized customer support',
      'Lower per-unit cost',
    ],
  });

  deepEqual(result.valid, false);
  ok(result.errors.includes('q23_max'));
});

test('valid MDU scenario passes', () => {
  const result = validateResponse(
    {
      q1: 'Parklands',
      q2: 'Multi-Dwelling Unit (Apartment/Estate)',
      q3: 'Primary decision-maker (Final authority)',
      q4: 'Safaricom',
      q5: 'More than 10 people',
      q6: ['Smartphones', 'Laptops / Desktops'],
      q18: 'Large (More than 100 employees)',
      q19: 'One shared connection for the entire building',
      q20: 'Building Management',
      q21: 'Slow speeds',
      q22: 'Very willing',
      q23: ['Guaranteed minimum speeds', 'Lower per-unit cost'],
      q7: ['Fibre'],
      q8: '100-500 Mbps',
      q9: ['Evening (6pm-12am)'],
      q10: 'Significantly higher',
      q11: 'Occasionally (Weekly)',
      q12: ['Low speeds'],
      q13: 'None',
      q14: 'Fairly priced',
      q15: ['Guaranteed uptime'],
      q16: 'Consistent performance',
      q17: 'KES 4,000 - KES 6,000',
      q34: 'Increase significantly',
      q35: 4,
      q36: 'Yes',
      q37: 'Slow speeds during peak.',
      q38: 'Poor support.',
      q39: 3,
    },
    ['profile', 'usage', 'performance', 'value', 'mdus', 'future', 'insight']
  );

  deepEqual(result.valid, true);
});

test('required validation ignores hidden conditional questions (q12)', () => {
  const result = validateResponse(
    {
      q1: 'Parklands',
      q2: 'Single-Dwelling Unit (Standalone house)',
      q3: 'End user only (No decision influence)',
      q4: 'Zuku',
      q5: '4-7 people',
      q6: ['Smartphones'], // does NOT trigger q12 visibility rule
      q24: 'Reliable',
      q25: 'Price',
      q26: 'Streaming (Netflix, YouTube, etc.)',
      q27: 4,
      q28: 'No',
      q7: ['Fibre'],
      q8: '50-100 Mbps',
      q9: ['Morning (6am-12pm)'],
      q10: 'About the same',
      q11: 'Rarely (Monthly or less)',
      q13: 'Minor slowdowns',
      q14: 'Fairly priced',
      q15: ['Guaranteed uptime'],
      q16: 'Lower cost',
      q17: 'KES 1,000 - KES 2,500',
      q34: 'Remain the same',
      q35: 3,
      q36: 'No',
      q37: 'Cost and occasional drops.',
      q38: 'Support delays.',
      q39: 3,
    },
    ['profile', 'usage', 'performance', 'value', 'sdus', 'future', 'insight']
  );

  deepEqual(result.valid, true);
  ok(!result.errors.includes('missing_required'));
});

test('stale answers for visibility-hidden questions are detected as orphaned keys', () => {
  const previousAnswers = {
    q1: 'Parklands',
    q2: 'Single-Dwelling Unit (Standalone house)',
    q6: ['Smart home / IoT devices (CCTV, sensors, etc)'],
    q12: ['Low speeds'],
    q12_other_text: 'Stale conditional note',
  };

  const nextAnswers = {
    q1: 'Parklands',
    q2: 'Single-Dwelling Unit (Standalone house)',
    q6: ['Smartphones'],
    q12: ['Low speeds'], // stale answer for now-hidden q12
    q12_other_text: 'Stale conditional note',
  };

  const previousVisibleIds = getVisibleQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.visibilityRules,
    previousAnswers
  );
  const previousVisibleSectionIds = getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    previousAnswers
  );
  const previousAnswerableIds = getAnswerableQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.sections,
    previousVisibleIds,
    previousVisibleSectionIds
  );
  const previousVisibleQuestions = runtimeSurvey.questions.filter((question) =>
    previousAnswerableIds.has(question.id)
  );

  const currentVisibleIds = getVisibleQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.visibilityRules,
    nextAnswers
  );
  const currentVisibleSectionIds = getVisibleSectionIds(
    runtimeSurvey.sections,
    runtimeSurvey.visibilityRules,
    nextAnswers
  );
  const currentAnswerableIds = getAnswerableQuestionIds(
    runtimeSurvey.questions,
    runtimeSurvey.sections,
    currentVisibleIds,
    currentVisibleSectionIds
  );
  const currentVisibleQuestions = runtimeSurvey.questions.filter((question) =>
    currentAnswerableIds.has(question.id)
  );

  const orphanedKeys = getOrphanedAnswerKeys(
    previousVisibleQuestions,
    currentVisibleQuestions,
    nextAnswers
  );

  ok(orphanedKeys.includes('q12'));
  ok(orphanedKeys.includes('q12_other_text'));
});
