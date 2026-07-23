import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRecipient,
  uploadRecipients,
} from '../../controllers/recipients.controllers.js';
import Recipient from '../../models/recipient.models.js';
import Survey from '../../models/survey.models.js';

const buildRes = () => {
  return {
    code: null,
    body: null,
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

const original = {
  surveyFindOne: Survey.findOne,
  recipientFind: Recipient.find,
  recipientCreate: Recipient.create,
};

const buildReq = ({
  surveyId,
  companyId,
  userId,
  csv,
  body,
}) => ({
  params: { id: surveyId },
  user: {
    _id: userId,
    companyId,
  },
  ...(csv
    ? {
        file: {
          buffer: Buffer.from(csv, 'utf-8'),
        },
      }
    : {}),
  ...(body ? { body } : {}),
});

const mockSurvey = ({ surveyId, companyId }) => {
  Survey.findOne = async () => ({
    _id: surveyId,
    companyId,
  });
};

const resetMocks = () => {
  Survey.findOne = original.surveyFindOne;
  Recipient.find = original.recipientFind;
  Recipient.create = original.recipientCreate;
};

test.afterEach(() => {
  resetMocks();
});

test('uploadRecipients does not mark fresh rows with missing optional identifiers as duplicates', async () => {
  let insertedDocs = [];

  mockSurvey({
    surveyId: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439012',
  });

  Recipient.find = async () => [];
  Recipient.create = async (doc) => {
    insertedDocs.push(doc);
    return {
      ...doc,
      _id: `recipient-${insertedDocs.length}`,
    };
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439012',
    userId: '507f1f77bcf86cd799439013',
    csv: 'name,phone,email\nFes S.,0712064546,\nEric M.,,eric@example.com',
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.equal(insertedDocs.length, 2);
  assert.equal('email' in insertedDocs[0], false);
  assert.equal('phone' in insertedDocs[1], false);
  assert.deepEqual(res.body.data[0], {
    totalRows: 2,
    created: 2,
    duplicates: 0,
    errors: 0,
    errorDetails: [],
  });
});

test('uploadRecipients counts duplicates already present in the CSV before insert', async () => {
  let insertedDocs = [];

  mockSurvey({
    surveyId: '507f1f77bcf86cd799439021',
    companyId: '507f1f77bcf86cd799439022',
  });

  Recipient.find = async () => [];
  Recipient.create = async (doc) => {
    insertedDocs.push(doc);
    return {
      ...doc,
      _id: `recipient-${insertedDocs.length}`,
    };
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439021',
    companyId: '507f1f77bcf86cd799439022',
    userId: '507f1f77bcf86cd799439023',
    csv: 'name,phone,email\nFes S.,0712064546,\nEric M.,0712064546,',
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.equal(insertedDocs.length, 1);
  assert.deepEqual(res.body.data[0], {
    totalRows: 2,
    created: 1,
    duplicates: 1,
    errors: 0,
    errorDetails: [],
  });
});

test('uploadRecipients skips recipients that already exist in the database by email or phone', async () => {
  let insertedDocs = [];

  mockSurvey({
    surveyId: '507f1f77bcf86cd799439031',
    companyId: '507f1f77bcf86cd799439032',
  });

  Recipient.find = async () => [
    { phone: '+254712064546' },
    { email: 'taken@example.com' },
  ];
  Recipient.create = async (doc) => {
    insertedDocs.push(doc);
    return {
      ...doc,
      _id: `recipient-${insertedDocs.length}`,
    };
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439031',
    companyId: '507f1f77bcf86cd799439032',
    userId: '507f1f77bcf86cd799439033',
    csv: [
      'name,phone,email',
      'Existing Phone,0712064546,',
      'Existing Email,,taken@example.com',
      'Fresh,0722000000,fresh@example.com',
    ].join('\n'),
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.equal(insertedDocs.length, 1);
  assert.equal(insertedDocs[0].phone, '+254722000000');
  assert.equal(insertedDocs[0].email, 'fresh@example.com');
  assert.deepEqual(res.body.data[0], {
    totalRows: 3,
    created: 1,
    duplicates: 2,
    errors: 0,
    errorDetails: [],
  });
});

test('uploadRecipients returns mixed duplicate and validation error counts without blocking valid rows', async () => {
  let insertedDocs = [];

  mockSurvey({
    surveyId: '507f1f77bcf86cd799439041',
    companyId: '507f1f77bcf86cd799439042',
  });

  Recipient.find = async () => [{ email: 'existing@example.com' }];
  Recipient.create = async (doc) => {
    insertedDocs.push(doc);
    return {
      ...doc,
      _id: `recipient-${insertedDocs.length}`,
    };
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439041',
    companyId: '507f1f77bcf86cd799439042',
    userId: '507f1f77bcf86cd799439043',
    csv: [
      'name,phone,email',
      'Existing,,existing@example.com',
      'Broken Phone,not-a-phone,',
      'Fresh Phone,0722000000,',
      'Fresh Email,,new@example.com',
    ].join('\n'),
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.equal(insertedDocs.length, 2);
  assert.deepEqual(
    insertedDocs.map((doc) => ({
      name: doc.name,
      phone: doc.phone || null,
      email: doc.email || null,
    })),
    [
      { name: 'Fresh Phone', phone: '+254722000000', email: null },
      { name: 'Fresh Email', phone: null, email: 'new@example.com' },
    ]
  );
  assert.deepEqual(res.body.data[0], {
    totalRows: 4,
    created: 2,
    duplicates: 1,
    errors: 1,
    errorDetails: ['Row 3: Invalid phone number format'],
  });
});

test('uploadRecipients rejects an empty CSV file', async () => {
  mockSurvey({
    surveyId: '507f1f77bcf86cd799439091',
    companyId: '507f1f77bcf86cd799439092',
  });

  Recipient.find = async () => [];
  Recipient.create = async () => {
    throw new Error('create should not be called for an empty CSV file');
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439091',
    companyId: '507f1f77bcf86cd799439092',
    userId: '507f1f77bcf86cd799439093',
    csv: 'name,phone,email',
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.notEqual(nextError, null);
  assert.match(nextError.message, /CSV file is empty/i);
});

test('uploadRecipients includes insert-stage duplicate key failures in the duplicate summary', async () => {
  mockSurvey({
    surveyId: '507f1f77bcf86cd799439051',
    companyId: '507f1f77bcf86cd799439052',
  });

  Recipient.find = async () => [];
  Recipient.create = async () => {
    const error = new Error('duplicate key error');
    error.code = 11000;
    throw error;
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439051',
    companyId: '507f1f77bcf86cd799439052',
    userId: '507f1f77bcf86cd799439053',
    csv: 'name,phone,email\nFresh,0712064546,',
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.deepEqual(res.body.data[0], {
    totalRows: 1,
    created: 0,
    duplicates: 1,
    errors: 0,
    errorDetails: [],
  });
});

test('uploadRecipients rejects phone numbers saved in scientific notation', async () => {
  mockSurvey({
    surveyId: '507f1f77bcf86cd799439071',
    companyId: '507f1f77bcf86cd799439072',
  });

  Recipient.find = async () => [];
  Recipient.create = async () => {
    throw new Error('create should not be called for invalid CSV rows');
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439071',
    companyId: '507f1f77bcf86cd799439072',
    userId: '507f1f77bcf86cd799439073',
    csv: 'name,phone,email\nzaq,2.54712E+11,\nqaz,2.54799E+11,',
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.notEqual(nextError, null);
  assert.match(
    nextError.message,
    /scientific notation\. Format the phone column as text before saving the CSV/i
  );
});

test('uploadRecipients reports created rows accurately when one row is already in the survey', async () => {
  let createdDocs = [];

  mockSurvey({
    surveyId: '507f1f77bcf86cd799439081',
    companyId: '507f1f77bcf86cd799439082',
  });

  Recipient.find = async () => [{ phone: '+254712345677' }];
  Recipient.create = async (doc) => {
    createdDocs.push(doc);
    return {
      ...doc,
      _id: `recipient-${createdDocs.length}`,
    };
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439081',
    companyId: '507f1f77bcf86cd799439082',
    userId: '507f1f77bcf86cd799439083',
    csv: [
      'name,phone,email',
      'Existing,254712345677,',
      'Fresh One,254712345678,',
      'Fresh Two,254712345679,',
    ].join('\n'),
  });
  const res = buildRes();
  let nextError = null;

  await uploadRecipients[1](req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.equal(createdDocs.length, 2);
  assert.deepEqual(res.body.data[0], {
    totalRows: 3,
    created: 2,
    duplicates: 1,
    errors: 0,
    errorDetails: [],
  });
});

test('createRecipient trims the name and omits blank optional identifiers', async () => {
  let createdDoc = null;

  mockSurvey({
    surveyId: '507f1f77bcf86cd799439061',
    companyId: '507f1f77bcf86cd799439062',
  });

  Recipient.create = async (doc) => {
    createdDoc = doc;
    return {
      _id: '507f1f77bcf86cd799439064',
      ...doc,
    };
  };

  const req = buildReq({
    surveyId: '507f1f77bcf86cd799439061',
    companyId: '507f1f77bcf86cd799439062',
    userId: '507f1f77bcf86cd799439063',
    body: {
      name: '  Fresh User  ',
      email: '  fresh@example.com  ',
    },
  });
  const res = buildRes();
  let nextError = null;

  await createRecipient(req, res, (err) => {
    nextError = err;
  });

  assert.equal(nextError, null);
  assert.equal(res.code, 201);
  assert.equal(createdDoc.name, 'Fresh User');
  assert.equal(createdDoc.email, 'fresh@example.com');
  assert.equal('phone' in createdDoc, false);
});
