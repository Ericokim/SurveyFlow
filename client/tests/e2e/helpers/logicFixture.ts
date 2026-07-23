import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SurveyShape } from './fixtures';

type FixtureScenario = {
  id: string;
  answer: string;
  expected: {
    action: 'jump_question' | 'jump_section' | 'terminate' | 'fallback';
    targetSectionId?: string;
    targetQuestionId?: string;
    targetQuestionTitle?: string;
  };
};

type LogicFixture = {
  survey: SurveyShape;
  scenarios: FixtureScenario[];
  questionFlowSurvey?: SurveyShape;
  questionFlowScenarios?: FixtureScenario[];
  forwardOnlyInvalidRules?: any[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '../../..');
const fixturePath = path.join(frontendRoot, 'tests/fixtures/survey-logic.json');

export function loadLogicFixture(): LogicFixture {
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw) as LogicFixture;
}

export function fixtureSurvey(): SurveyShape {
  return loadLogicFixture().survey;
}

export function fixtureScenarios(): FixtureScenario[] {
  return loadLogicFixture().scenarios || [];
}

export function fixtureQuestionFlowSurvey(): SurveyShape {
  return loadLogicFixture().questionFlowSurvey as SurveyShape;
}

export function fixtureQuestionFlowScenarios(): FixtureScenario[] {
  return loadLogicFixture().questionFlowScenarios || [];
}
