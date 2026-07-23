import test from 'node:test';
import assert from 'node:assert/strict';

import { updateSurvey } from '../../controllers/surveys.controllers.js';
import Survey from '../../models/survey.models.js';
import SurveyVersion from '../../models/survey_version.models.js';

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

test('updateSurvey saves structural navigation changes without ReferenceError', async () => {
  const original = {
    surveyFindOne: Survey.findOne,
    versionCreate: SurveyVersion.create,
    versionFindOne: SurveyVersion.findOne,
  };

  let createdVersion = null;

  try {
    Survey.findOne = async () => ({
      _id: '507f1f77bcf86cd799439021',
      companyId: '507f1f77bcf86cd799439022',
      currentVersion: 0,
      status: 'draft',
      save: async () => {},
      toObject() {
        return {
          _id: this._id,
          companyId: this.companyId,
          currentVersion: this.currentVersion,
          status: this.status,
        };
      },
    });

    SurveyVersion.create = async (doc) => {
      createdVersion = doc;
      return doc;
    };

    SurveyVersion.findOne = () => ({
      lean: async () => ({
        questions: createdVersion.questions,
        sections: createdVersion.sections,
        visibilityRules: createdVersion.visibilityRules,
        navigationRules: createdVersion.navigationRules,
        settings: createdVersion.settings,
      }),
    });

    const req = {
      params: { id: '507f1f77bcf86cd799439021' },
      user: {
        _id: '507f1f77bcf86cd799439023',
        companyId: '507f1f77bcf86cd799439022',
      },
      body: {
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            title: 'Choose one',
            order: 1,
            options: ['A', 'B'],
          },
        ],
        sections: [
          {
            id: 's1',
            title: 'Main',
            order: 0,
            questionIds: ['q1'],
          },
        ],
        navigationRules: [
          {
            id: 'nr1',
            fromSectionId: 's1',
            when: true,
            action: { type: 'terminate' },
            priority: 0,
          },
        ],
      },
    };
    const res = buildRes();
    let nextError = null;

    await updateSurvey(req, res, (err) => {
      nextError = err;
    });

    assert.equal(nextError, null);
    assert.equal(res.code, 200);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(createdVersion.navigationRules.length, 1);
    assert.equal(createdVersion.navigationRules[0].id, 'nr1');
  } finally {
    Survey.findOne = original.surveyFindOne;
    SurveyVersion.create = original.versionCreate;
    SurveyVersion.findOne = original.versionFindOne;
  }
});
