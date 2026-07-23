import fs from 'node:fs';
import path from 'node:path';

const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/survey-logic.json');

export function loadLogicFixture() {
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw);
}

export function getFixtureSurvey() {
  return loadLogicFixture().survey;
}

export function getFixtureScenarios() {
  return loadLogicFixture().scenarios || [];
}

export function getQuestionFlowFixtureSurvey() {
  return loadLogicFixture().questionFlowSurvey;
}

export function getQuestionFlowFixtureScenarios() {
  return loadLogicFixture().questionFlowScenarios || [];
}

export function getForwardOnlyInvalidRules() {
  return loadLogicFixture().forwardOnlyInvalidRules || [];
}
