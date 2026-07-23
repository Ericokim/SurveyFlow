import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const TEST_PORT = process.env.INTEGRATION_PORT || '5111';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const DEV_USER_ID = '507f1f77bcf86cd799439011';
const DEV_COMPANY_ID = '507f1f77bcf86cd799439012';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
};

const firstData = (body) => {
  if (Array.isArray(body?.data)) return body.data[0] || null;
  return body?.data || null;
};

const waitForServer = async (timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await wait(500);
  }

  throw new Error(
    `Server did not become ready within ${timeoutMs}ms` +
      (lastError ? `: ${lastError.message}` : '')
  );
};

const startServer = async () => {
  const child = spawn('node', ['server/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: TEST_PORT,
      DEV_BYPASS_AUTH: 'true',
      DEV_USER_ID,
      DEV_COMPANY_ID,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  await waitForServer();

  return {
    child,
    getLogs: () => logs,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGINT');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        wait(5000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
};

test(
  'integration: save -> publish -> save -> duplicate keeps survey valid',
  { timeout: 120000 },
  async () => {
    assert.ok(
      process.env.MONGO_URI,
      'MONGO_URI is required for integration test execution'
    );

    const server = await startServer();
    const cleanupIds = [];

    try {
      const createPayload = {
        title: `Integration Lifecycle ${Date.now()}`,
        description: 'integration flow check',
        type: 'open_ended',
        settings: {
          presentationMode: 'single_page',
          isSectional: false,
          autoAdvanceThreshold: null,
        },
        questions: [
          {
            id: 'q1',
            type: 'short_text',
            title: 'Email',
            required: true,
            validation: { predefinedPattern: 'email' },
          },
          {
            id: 'q2',
            type: 'short_text',
            title: 'Numeric legacy alias',
            required: true,
            validation: { predefinedPattern: 'integer' },
          },
        ],
      };

      const created = await requestJson('/api/surveys', {
        method: 'POST',
        body: JSON.stringify(createPayload),
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const sourceSurvey = firstData(created.body);
      const sourceSurveyId = sourceSurvey?._id;
      assert.ok(sourceSurveyId, 'Expected created survey id');
      cleanupIds.push(sourceSurveyId);

      const saveAfterCreate = await requestJson(`/api/surveys/${sourceSurveyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: `${createPayload.title} - saved`,
          questions: [
            {
              id: 'q1',
              type: 'short_text',
              title: 'Email',
              required: true,
              validation: { predefinedPattern: 'email' },
            },
            {
              id: 'q2',
              type: 'short_text',
              title: 'Numeric legacy alias',
              required: true,
              validation: { predefinedPattern: 'integer' },
            },
          ],
        }),
      });
      assert.equal(saveAfterCreate.status, 200, JSON.stringify(saveAfterCreate.body));

      const publish = await requestJson(`/api/surveys/${sourceSurveyId}/publish`, {
        method: 'POST',
      });
      assert.equal(publish.status, 200, JSON.stringify(publish.body));

      const saveAfterPublish = await requestJson(`/api/surveys/${sourceSurveyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: 'edited after publish',
          questions: [
            {
              id: 'q1',
              type: 'short_text',
              title: 'Email',
              required: true,
              validation: { predefinedPattern: 'email' },
            },
            {
              id: 'q2',
              type: 'short_text',
              title: 'Numeric legacy alias',
              required: true,
              validation: { predefinedPattern: 'integer' },
            },
          ],
        }),
      });
      assert.equal(saveAfterPublish.status, 200, JSON.stringify(saveAfterPublish.body));

      const duplicate = await requestJson(`/api/surveys/${sourceSurveyId}/duplicate`, {
        method: 'POST',
      });
      assert.equal(duplicate.status, 201, JSON.stringify(duplicate.body));
      const duplicatedSurvey = firstData(duplicate.body);
      assert.ok(duplicatedSurvey?._id, 'Expected duplicated survey id');
      cleanupIds.push(duplicatedSurvey._id);
      assert.notEqual(duplicatedSurvey._id, sourceSurveyId);
      assert.equal(duplicatedSurvey.status, 'draft');
      assert.equal(duplicatedSurvey.responseCount, 0);

      const duplicatedDetails = await requestJson(`/api/surveys/${duplicatedSurvey._id}`, {
        method: 'GET',
      });
      assert.equal(duplicatedDetails.status, 200, JSON.stringify(duplicatedDetails.body));

      const duplicatedDetailsSurvey = firstData(duplicatedDetails.body);
      const duplicatedQuestionsSafe = duplicatedDetailsSurvey?.questions || [];
      const q2 = duplicatedQuestionsSafe.find(
        (q) => q.title === 'Numeric legacy alias'
      );
      assert.ok(q2, 'Expected duplicated numeric question');
      assert.equal(
        q2.validation?.predefinedPattern,
        'numeric',
        `Expected alias normalization, got: ${JSON.stringify(q2.validation)}`
      );
    } finally {
      for (const id of cleanupIds.reverse()) {
        try {
          await requestJson(`/api/surveys/${id}`, { method: 'DELETE' });
        } catch {
          // Cleanup should never fail the test.
        }
      }
      await server.stop();
    }
  }
);
