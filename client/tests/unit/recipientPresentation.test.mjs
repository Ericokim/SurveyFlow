import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPhoneForDisplay,
  formatRecipientForList,
} from '../../src/lib/utils/recipientPresentation.js';

test('formatPhoneForDisplay removes a leading plus for UI display', () => {
  assert.equal(formatPhoneForDisplay('+254712345678'), '254712345678');
  assert.equal(formatPhoneForDisplay('254712345678'), '254712345678');
  assert.equal(formatPhoneForDisplay(''), '');
  assert.equal(formatPhoneForDisplay(null), null);
});

test('formatRecipientForList keeps recipient shape while formatting phone for display', () => {
  assert.deepEqual(
    formatRecipientForList({
      _id: 'recipient-1',
      name: 'John Doe',
      phone: '+254712345678',
      email: 'john@example.com',
    }),
    {
      _id: 'recipient-1',
      name: 'John Doe',
      phone: '254712345678',
      email: 'john@example.com',
    }
  );
});
