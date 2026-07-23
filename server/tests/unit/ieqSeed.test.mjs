import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';

const fixturePath = path.resolve(
  process.cwd(),
  'server/data/ieq.combined.master.json'
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const ieq = fixture?.runtimeOutputs?.finalSeed || fixture;

test('IEQ fixture exists with expected metadata', () => {
  assert.equal(ieq.surveyTitle, 'Internet Experience Questionnaire');
  assert.equal(ieq.themeColor, '#1d4ed8');
  assert.equal(ieq.metadata.captureMetadata, true);
});

test('IEQ fixture has complete branch-safe structure', () => {
  assert.equal(ieq.sections.length, 9);
  assert.equal(ieq.questions.length, 39);

  const sectionIds = new Set(ieq.sections.map((section) => section.id));
  const questionIds = new Set(ieq.questions.map((question) => question.id));

  assert.equal(sectionIds.size, 9);
  assert.equal(questionIds.size, 39);

  for (const question of ieq.questions) {
    assert.ok(
      sectionIds.has(question.sectionId),
      `Question ${question.id} references unknown section ${question.sectionId}`
    );
  }

  const q2Rule = ieq.flowRules.find((rule) => rule.questionId === 'q2');
  assert.ok(q2Rule);
  assert.ok(
    q2Rule.rules.every((rule) => rule.action === 'show_section'),
    'q2 branch rules must use section visibility toggles'
  );
  const branchTargets = q2Rule.rules.map((rule) => rule.target).sort();
  assert.deepEqual(branchTargets, ['enterprise', 'mdus', 'sdus']);

  const scenarioIds = ieq.scenarios.map((scenario) => scenario.id).sort();
  assert.deepEqual(scenarioIds, [
    'scenario_enterprise',
    'scenario_mdu',
    'scenario_sdu',
  ]);
});
