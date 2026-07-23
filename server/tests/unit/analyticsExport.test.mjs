import test from 'node:test';
import { deepEqual, ok } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getAnswerableQuestionIds,
  computeVisibleQuestionsInSection,
  getVisibleQuestionIds,
  getVisibleSectionIds,
} from '../../utils/logicEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.resolve(
  __dirname,
  '../../../client/tests/fixtures/survey-logic.json'
);

const loadFixture = () => JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const getEffectiveNavigationRules = (questions = [], surveyNavigationRules = []) => {
  const optionRules = [];
  for (const question of questions) {
    if (!Array.isArray(question.options)) continue;
    for (const option of question.options) {
      if (!option.logic?.action) continue;
      optionRules.push({
        id: `${question.id}_${option.text}`,
        fromSectionId: question.sectionId || null,
        when: { questionId: question.id, operator: 'equals', value: option.text },
        action: option.logic.action,
        priority: option.logic.priority || 0,
      });
    }
  }
  return [...(surveyNavigationRules || []), ...optionRules];
};

const computeEffectiveShownQuestionIds = (surveyVersion, answers = {}) => {
  const questions = surveyVersion?.questions || [];
  const sections = surveyVersion?.sections || [];
  const visibilityRules = surveyVersion?.visibilityRules || [];
  const navigationRules = surveyVersion?.navigationRules || [];

  const visibleQuestionIds = getVisibleQuestionIds(questions, visibilityRules, answers);
  const visibleSectionIds = getVisibleSectionIds(sections, visibilityRules, answers);
  const answerableQuestionIds = getAnswerableQuestionIds(
    questions,
    sections,
    visibleQuestionIds,
    visibleSectionIds
  );

  const effectiveNavRules = getEffectiveNavigationRules(questions, navigationRules);
  let effectiveIds = answerableQuestionIds;

  if (effectiveNavRules.length > 0) {
    const answerableQuestions = questions
      .filter((q) => answerableQuestionIds.has(q.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    let jumpVisibleQuestions;
    if (sections.length > 1) {
      jumpVisibleQuestions = [];
      for (const section of sections) {
        if (!visibleSectionIds.has(section.id)) continue;
        const sectionQuestions = answerableQuestions.filter(
          (q) => section.questionIds?.includes(q.id) || q.sectionId === section.id
        );
        jumpVisibleQuestions.push(
          ...computeVisibleQuestionsInSection(
            sectionQuestions,
            effectiveNavRules,
            answers,
            section.id,
            questions
          )
        );
      }
    } else {
      jumpVisibleQuestions = computeVisibleQuestionsInSection(
        answerableQuestions,
        effectiveNavRules,
        answers,
        sections[0]?.id || null,
        questions
      );
    }

    effectiveIds = new Set(jumpVisibleQuestions.map((q) => q.id));
  }

  const orderedIds = questions.map((q) => q.id);
  return orderedIds.filter((id) => effectiveIds.has(id));
};

test('analytics fixture - shown/skipped always forms a complete partition', () => {
  const fixture = loadFixture();
  const survey = fixture.survey;
  const allQuestionIds = (survey.questions || []).map((q) => q.id);

  for (const scenario of fixture.scenarios || []) {
    const answers = { q1: 'Jane', q3: scenario.answer };
    const shown = computeEffectiveShownQuestionIds(survey, answers);
    const shownSet = new Set(shown);
    const skipped = allQuestionIds.filter((id) => !shownSet.has(id));

    deepEqual(shown.length + skipped.length, allQuestionIds.length);
    ok(shown.every((id) => allQuestionIds.includes(id)));
    ok(skipped.every((id) => allQuestionIds.includes(id)));
  }
});

test('analytics fixture - jump_question scenarios include selected target and hide sibling branch targets', () => {
  const fixture = loadFixture();
  const survey = fixture.survey;
  const sectionByQuestionId = new Map(
    (survey.questions || []).map((question) => [question.id, question.sectionId || null])
  );
  const branchTargets = new Set(
    (survey.navigationRules || [])
      .filter((rule) => rule.when?.questionId === 'q3' && rule.action?.type === 'jump_to_question')
      .map((rule) => rule.action.targetQuestionId)
  );

  for (const scenario of fixture.scenarios || []) {
    if (scenario.expected?.action !== 'jump_question') continue;
    const answers = { q1: 'Jane', q3: scenario.answer };
    const shown = computeEffectiveShownQuestionIds(survey, answers);

    ok(shown.includes(scenario.expected.targetQuestionId));
    const selectedTargetSectionId = sectionByQuestionId.get(
      scenario.expected.targetQuestionId
    );

    for (const siblingTarget of branchTargets) {
      if (siblingTarget === scenario.expected.targetQuestionId) continue;
      if (sectionByQuestionId.get(siblingTarget) !== selectedTargetSectionId) continue;
      ok(!shown.includes(siblingTarget));
    }
  }
});

test('analytics fixture - question-based flow scenarios still compute shown/skipped partition', () => {
  const fixture = loadFixture();
  const survey = fixture.questionFlowSurvey;
  const scenarios = fixture.questionFlowScenarios || [];
  const allQuestionIds = (survey.questions || []).map((q) => q.id);

  for (const scenario of scenarios) {
    const answers = { qq1: scenario.answer };
    const shown = computeEffectiveShownQuestionIds(survey, answers);
    const shownSet = new Set(shown);
    const skipped = allQuestionIds.filter((id) => !shownSet.has(id));

    deepEqual(shown.length + skipped.length, allQuestionIds.length);
    ok(shown.every((id) => allQuestionIds.includes(id)));
    ok(skipped.every((id) => allQuestionIds.includes(id)));
  }
});
