import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';

const fixturePath = path.resolve(
  process.cwd(),
  'server/data/ieq.combined.master.json'
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const payload = fixture?.runtimeOutputs?.createPayload || fixture;
const seed = fixture?.runtimeOutputs?.finalSeed || fixture;

test('IEQ create payload has required create-survey fields', () => {
  assert.equal(typeof payload.title, 'string');
  assert.ok(payload.title.length > 0);
  assert.ok(Array.isArray(payload.sections));
  assert.ok(Array.isArray(payload.questions));
  assert.ok(Array.isArray(payload.flowRules));
  assert.equal(typeof payload.themeColor, 'string');
  assert.equal(typeof payload.thankYouMessage, 'string');
  assert.equal(typeof payload.settings, 'object');
});

test('IEQ create payload logic references are structurally valid', () => {
  const sectionIds = new Set(payload.sections.map((section) => section.id));
  const questionIds = new Set(payload.questions.map((question) => question.id));

  assert.equal(sectionIds.size, payload.sections.length);
  assert.equal(questionIds.size, payload.questions.length);

  for (const question of payload.questions) {
    assert.ok(
      sectionIds.has(question.sectionId),
      `Question ${question.id} has invalid sectionId ${question.sectionId}`
    );
  }

  for (const flowRule of payload.flowRules) {
    assert.ok(
      questionIds.has(flowRule.questionId),
      `Flow source question does not exist: ${flowRule.questionId}`
    );

    for (const rule of flowRule.rules || []) {
      if (
        (rule.action === 'go_to_section' || rule.action === 'show_section') &&
        rule.target
      ) {
        assert.ok(
          sectionIds.has(rule.target),
          `Flow target section does not exist: ${rule.target}`
        );
      }

      if (
        (rule.action === 'show_question' ||
          rule.action === 'go_to_question' ||
          rule.action === 'jump_to_question') &&
        rule.target
      ) {
        assert.ok(
          questionIds.has(rule.target),
          `Flow target question does not exist: ${rule.target}`
        );
      }
    }
  }
});

test('IEQ create payload stays aligned with backend IEQ seed identity set', () => {
  const payloadSectionIds = payload.sections.map((section) => section.id).sort();
  const seedSectionIds = seed.sections.map((section) => section.id).sort();
  assert.deepEqual(payloadSectionIds, seedSectionIds);

  const payloadQuestionIds = payload.questions.map((question) => question.id).sort();
  const seedQuestionIds = seed.questions.map((question) => question.id).sort();
  assert.deepEqual(payloadQuestionIds, seedQuestionIds);
});
