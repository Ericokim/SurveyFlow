import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeQuestionValidation } from '../../utils/questionValidation.js';

test('normalizeQuestionValidation maps legacy predefinedPattern aliases', () => {
  const normalized = normalizeQuestionValidation({ predefinedPattern: 'integer' });
  assert.equal(normalized.predefinedPattern, 'numeric');
});

test('normalizeQuestionValidation migrates known pattern alias to predefinedPattern', () => {
  const normalized = normalizeQuestionValidation({ pattern: 'number' });
  assert.equal(normalized.predefinedPattern, 'numeric');
  assert.equal(normalized.pattern, undefined);
});

test('normalizeQuestionValidation preserves custom regex pattern', () => {
  const normalized = normalizeQuestionValidation({ pattern: '^[A-Z]{3}$' });
  assert.equal(normalized.pattern, '^[A-Z]{3}$');
  assert.equal(normalized.predefinedPattern, undefined);
});
