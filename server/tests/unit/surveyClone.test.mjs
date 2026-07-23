import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDuplicateTitle,
  remapVersionPayload,
  cloneRecipientsPayload,
} from '../../utils/surveyClone.js';

test('buildDuplicateTitle prefixes and truncates safely', () => {
  assert.equal(buildDuplicateTitle('Beta 5'), 'Copy of Beta 5');
  const long = 'x'.repeat(300);
  const value = buildDuplicateTitle(long, 200);
  assert.equal(value.startsWith('Copy of '), true);
  assert.equal(value.length, 200);
});

test('remapVersionPayload regenerates ids and rewires rule references', () => {
  const source = {
    settings: { presentationMode: 'multi_step', isSectional: true },
    sections: [
      { id: 's1', title: 'Bio', questionIds: ['q1', 'q2'] },
      { id: 's2', title: 'Work', questionIds: ['q3'] },
    ],
    questions: [
      {
        id: 'q1',
        title: 'Nationality?',
        sectionId: 's1',
        options: [
          {
            text: 'Kenyan',
            logic: {
              action: {
                type: 'jump_to_question',
                targetQuestionId: 'q3',
              },
            },
          },
        ],
      },
      { id: 'q2', title: 'Specify nationality', sectionId: 's1' },
      { id: 'q3', title: 'Years of experience', sectionId: 's2' },
    ],
    visibilityRules: [
      {
        id: 'vr1',
        targetType: 'question',
        targetId: 'q2',
        when: { questionId: 'q1', operator: 'equals', value: 'Other' },
      },
    ],
    navigationRules: [
      {
        id: 'nr1',
        fromSectionId: 's1',
        when: { questionId: 'q1', operator: 'equals', value: 'Kenyan' },
        action: { type: 'jump_to_question', targetQuestionId: 'q3' },
      },
      {
        id: 'nr2',
        fromSectionId: 's1',
        when: { questionId: 'q1', operator: 'equals', value: 'TopWork' },
        action: { type: 'jump', targetSectionId: 's2' },
      },
    ],
  };

  const cloned = remapVersionPayload(source);

  const questionIds = new Set(cloned.questions.map((q) => q.id));
  const sectionIds = new Set(cloned.sections.map((s) => s.id));

  assert.equal(questionIds.has('q1'), false);
  assert.equal(sectionIds.has('s1'), false);

  const nationality = cloned.questions.find((q) => q.title === 'Nationality?');
  assert.ok(nationality);

  const optionTarget = nationality.options[0]?.logic?.action?.targetQuestionId;
  assert.ok(optionTarget);
  assert.equal(questionIds.has(optionTarget), true);

  const navQuestionTarget = cloned.navigationRules.find(
    (r) => r.action?.type === 'jump_to_question'
  )?.action?.targetQuestionId;
  assert.equal(questionIds.has(navQuestionTarget), true);

  const navSectionTarget = cloned.navigationRules.find(
    (r) => r.action?.type === 'jump'
  )?.action?.targetSectionId;
  assert.equal(sectionIds.has(navSectionTarget), true);

  const visibilityTarget = cloned.visibilityRules[0]?.targetId;
  assert.equal(questionIds.has(visibilityTarget), true);
});

test('cloneRecipientsPayload copies contacts but resets progress fields', () => {
  const recipients = [
    {
      name: 'Jane',
      phone: '+254700000001',
      email: 'jane@example.com',
      status: 'completed',
      invitedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      isBlacklisted: true,
    },
  ];

  const cloned = cloneRecipientsPayload(recipients, {
    surveyId: 'new-survey-id',
    companyId: 'company-id',
    createdBy: 'user-id',
  });

  assert.equal(cloned.length, 1);
  assert.equal(cloned[0].surveyId, 'new-survey-id');
  assert.equal(cloned[0].status, 'pending');
  assert.equal(cloned[0].isBlacklisted, true);
  assert.equal(cloned[0].invitedAt, undefined);
  assert.equal(cloned[0].completedAt, undefined);
});

test('remapVersionPayload preserves boolean and grouped navigation conditions', () => {
  const source = {
    sections: [{ id: 's1', title: 'Main', questionIds: ['q1', 'q2'] }],
    questions: [
      { id: 'q1', title: 'Question 1', sectionId: 's1' },
      { id: 'q2', title: 'Question 2', sectionId: 's1' },
    ],
    navigationRules: [
      {
        id: 'nr_bool',
        fromSectionId: 's1',
        when: true,
        action: { type: 'terminate' },
      },
      {
        id: 'nr_group',
        fromSectionId: 's1',
        when: {
          any: [
            { questionId: 'q1', operator: 'equals', value: 'yes' },
            { questionId: 'q2', operator: 'equals', value: 'no' },
          ],
        },
        action: { type: 'jump', targetSectionId: 's1' },
      },
    ],
  };

  const cloned = remapVersionPayload(source);

  const booleanRule = cloned.navigationRules.find((r) => r.id && r.action?.type === 'terminate');
  assert.equal(typeof booleanRule.when, 'boolean');
  assert.equal(booleanRule.when, true);

  const groupedRule = cloned.navigationRules.find((r) => r.action?.type === 'jump');
  assert.equal(Array.isArray(groupedRule.when?.any), true);
  assert.equal(groupedRule.when.any.length, 2);
  assert.notEqual(groupedRule.when.any[0].questionId, 'q1');
  assert.notEqual(groupedRule.when.any[1].questionId, 'q2');
});

test('remapVersionPayload normalizes legacy predefinedPattern aliases', () => {
  const source = {
    sections: [{ id: 's1', title: 'Main', questionIds: ['q1', 'q2'] }],
    questions: [
      {
        id: 'q1',
        title: 'How old are you?',
        sectionId: 's1',
        validation: { predefinedPattern: 'integer' },
      },
      {
        id: 'q2',
        title: 'Your score',
        sectionId: 's1',
        validation: { predefinedPattern: 'number' },
      },
    ],
  };

  const cloned = remapVersionPayload(source);

  const q1 = cloned.questions.find((q) => q.title === 'How old are you?');
  const q2 = cloned.questions.find((q) => q.title === 'Your score');

  assert.equal(q1.validation.predefinedPattern, 'numeric');
  assert.equal(q2.validation.predefinedPattern, 'numeric');
});
