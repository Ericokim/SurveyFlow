import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { duplicateSurvey } from '../../controllers/surveys.controllers.js';
import Survey from '../../models/survey.models.js';
import SurveyVersion from '../../models/survey_version.models.js';
import Recipient from '../../models/recipient.models.js';

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

test('duplicateSurvey clones published survey definition only and skips recipients', async () => {
  const original = {
    surveyFindOne: Survey.findOne,
    surveyCreate: Survey.create,
    versionFindOne: SurveyVersion.findOne,
    versionCreate: SurveyVersion.create,
    recipientFind: Recipient.find,
    startSession: mongoose.startSession,
  };

  let recipientFindCalls = 0;
  let createdVersionPayload = null;

  try {
    Survey.findOne = () => ({
      lean: async () => ({
        _id: '507f1f77bcf86cd799439011',
        companyId: '507f1f77bcf86cd799439012',
        title: 'Published Survey',
        description: 'src',
        status: 'published',
        currentVersion: 1,
        logo: '',
        themeColor: '',
        thankYouMessage: '',
        isWhitelistEnabled: false,
        showProgress: true,
        oneResponsePerRecipient: true,
        captureMetadata: false,
      }),
    });

    SurveyVersion.findOne = () => ({
      lean: async () => ({
        surveyId: '507f1f77bcf86cd799439011',
        version: 1,
        questions: [
          {
            id: 'q1',
            type: 'short_text',
            title: 'Age',
            order: 1,
            validation: { predefinedPattern: 'integer' },
          },
        ],
        sections: [{ id: 's1', title: 'Main', order: 0, questionIds: ['q1'] }],
        visibilityRules: [],
        navigationRules: [],
        settings: { presentationMode: 'single_page', isSectional: false },
      }),
    });

    Survey.create = async () => [
      {
        _id: '507f1f77bcf86cd799439013',
        toObject() {
          return {
            _id: this._id,
            title: 'Copy of Published Survey',
          };
        },
      },
    ];

    SurveyVersion.create = async (docs) => {
      createdVersionPayload = docs?.[0];
      return docs;
    };

    Recipient.find = async () => {
      recipientFindCalls += 1;
      return [];
    };

    mongoose.startSession = async () => ({
      async withTransaction(cb) {
        await cb();
      },
      async endSession() {},
    });

    const req = {
      params: { id: '507f1f77bcf86cd799439011' },
      user: {
        _id: '507f1f77bcf86cd799439014',
        companyId: '507f1f77bcf86cd799439012',
      },
    };
    const res = buildRes();

    let nextError = null;
    await duplicateSurvey(req, res, (err) => {
      nextError = err;
    });

    assert.equal(nextError, null);
    assert.equal(res.code, 201);
    assert.equal(recipientFindCalls, 0);
    assert.equal(createdVersionPayload.questions[0].validation.predefinedPattern, 'numeric');
    assert.equal(res.body.data[0].responseCount, 0);
  } finally {
    Survey.findOne = original.surveyFindOne;
    Survey.create = original.surveyCreate;
    SurveyVersion.findOne = original.versionFindOne;
    SurveyVersion.create = original.versionCreate;
    Recipient.find = original.recipientFind;
    mongoose.startSession = original.startSession;
  }
});
