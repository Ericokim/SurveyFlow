import test from 'node:test';
import assert from 'node:assert/strict';

import Recipient from '../../models/recipient.models.js';

test('Recipient unique contact indexes use partial filters for optional fields', () => {
  const indexes = Recipient.schema.indexes();

  const phoneIndex = indexes.find(
    ([fields]) => fields.surveyId === 1 && fields.phone === 1
  );
  const emailIndex = indexes.find(
    ([fields]) => fields.surveyId === 1 && fields.email === 1
  );

  assert.ok(phoneIndex, 'expected surveyId/phone index to exist');
  assert.ok(emailIndex, 'expected surveyId/email index to exist');

  assert.equal(phoneIndex[1].unique, true);
  assert.deepEqual(phoneIndex[1].partialFilterExpression, {
    phone: { $type: 'string' },
  });

  assert.equal(emailIndex[1].unique, true);
  assert.deepEqual(emailIndex[1].partialFilterExpression, {
    email: { $type: 'string' },
  });
});
