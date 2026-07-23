import { Page } from '@playwright/test';
import { baseQuestionSurvey, type SurveyShape } from './fixtures';

type MockOptions = {
  surveyOverride?: Partial<SurveyShape>;
  forcePublicSurveyError?: boolean;
  forcePreviewSurveyError?: boolean;
  forceClosedOnSubmit?: boolean;
  whitelistAllowedIdentifiers?: string[];
  recipients?: Array<{
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    status?: string;
    createdAt?: string;
    journey?: {
      label: string;
      answeredLabel: string;
      lastSavedAt?: string;
    };
  }>;
  recipientStats?: Record<string, number>;
};

function apiResponse(data: any, message = 'OK') {
  return {
    status: { code: 200, message },
    data,
  };
}

export async function setupAuthenticatedPage(page: Page) {
  await page.addInitScript(() => {
    const user = { _id: 'u1', name: 'QA User', email: 'qa@example.com', role: 'admin' };
    localStorage.setItem('token', 'token-e2e');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token: 'token-e2e' }, version: 0 }));
  });
}

export async function setupApiMocks(page: Page, options: MockOptions = {}) {
  const initial = { ...baseQuestionSurvey(), ...(options.surveyOverride || {}) } as SurveyShape;
  let survey: SurveyShape = initial;
  const submittedIdentityScopes = new Set<string>();
  const savedProgressByIdentityScope = new Map<string, any>();

  const recipients = options.recipients || [];
  const recipientStats = options.recipientStats || {
    totalRecipients: recipients.length,
    pending: 0,
    invited: 0,
    completed: 0,
  };

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path.endsWith('/api/company/profile') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse({ name: 'TechFlow', logo: '/logo.png' })) });
    }

    if (path.endsWith('/api/surveys') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...apiResponse([survey]), paging: { total: 1, page: 1, pages: 1 } }) });
    }

    if (path.endsWith('/api/surveys') && method === 'POST') {
      const payload = req.postDataJSON?.() || {};
      survey = { ...survey, ...payload, _id: 'created-1', publicId: survey.publicId || 'created-pub' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(survey, 'Survey created')) });
    }

    if (path.match(/\/api\/surveys\/[^/]+$/) && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(survey)) });
    }

    if (path.match(/\/api\/surveys\/[^/]+$/) && method === 'PATCH') {
      const payload = req.postDataJSON?.() || {};
      survey = { ...survey, ...payload };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(survey, 'Changes saved')) });
    }

    if (path.match(/\/api\/surveys\/[^/]+\/publish$/) && method === 'POST') {
      survey = { ...survey, status: 'published' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(survey, 'Published')) });
    }

    if (path.match(/\/api\/surveys\/[^/]+\/duplicate$/) && method === 'POST') {
      const duplicated = {
        ...survey,
        _id: 'survey-dup-1',
        publicId: 'pub-dup-1',
        title: `Copy of ${survey.title || 'Survey'}`,
        status: 'draft',
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(duplicated, 'Survey duplicated successfully')),
      });
    }

    if (path.match(/\/api\/surveys\/[^/]+\/recipients$/) && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...apiResponse(recipients), paging: { total: recipients.length, page: 1, pages: 1 } }) });
    }

    if (path.match(/\/api\/surveys\/[^/]+\/recipients\/stats$/) && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(recipientStats)) });
    }

    if (path.match(/\/api\/surveys\/[^/]+\/recipients$/) && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse({ _id: 'r-new' }, 'Recipient added')) });
    }

    if (path.match(/\/api\/r\/[^/]+\/validate-access$/) && method === 'POST') {
      if (survey.status === 'closed') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: {
              code: 409,
              message: 'This survey is closed and no longer accepting responses.',
            },
          }),
        });
      }

      const payload = req.postDataJSON?.() || {};
      const allowed = options.whitelistAllowedIdentifiers || ['allow@example.com'];
      const identifierScope =
        typeof payload.identifier === 'string' && payload.identifier.trim().length > 0
          ? payload.identifier.trim().toLowerCase()
          : null;
      const recipientScope =
        typeof payload.recipientId === 'string' && payload.recipientId.trim().length > 0
          ? payload.recipientId.trim()
          : null;
      const identityScope = recipientScope || identifierScope;

      if (payload.identifier && !allowed.includes(payload.identifier)) {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: 403, message: 'Not authorized' } }) });
      }
      const savedProgress = identityScope ? savedProgressByIdentityScope.get(identityScope) : null;
      if (
        survey.oneResponsePerRecipient &&
        savedProgress?.responseStatus === 'completed'
      ) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: {
              code: 409,
              message: 'You have already completed this survey',
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiResponse(
            {
              identifier: payload.identifier,
              recipientId: recipientScope,
              responseStatus: savedProgress?.responseStatus || null,
              resume: savedProgress || null,
            },
            'Access granted'
          )
        ),
      });
    }

    if (path.match(/\/api\/r\/[^/]+\/progress$/) && method === 'POST') {
      if (survey.status === 'closed') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: {
              code: 409,
              message: 'This survey is closed and no longer accepting responses.',
            },
          }),
        });
      }

      const payload = req.postDataJSON?.() || {};
      const identifierScope =
        typeof payload.identifier === 'string' && payload.identifier.trim().length > 0
          ? payload.identifier.trim().toLowerCase()
          : null;
      const recipientScope =
        typeof payload.recipientId === 'string' && payload.recipientId.trim().length > 0
          ? payload.recipientId.trim()
          : null;
      const identityScope = recipientScope || identifierScope;

      if (identityScope) {
        const answeredCount = Object.values(payload.answers || {}).filter(Boolean).length;
        const totalQuestions = survey.questions?.length || 0;
        const percentComplete = totalQuestions > 0
          ? Math.round((answeredCount / totalQuestions) * 100)
          : 0;
        const savedDraft = {
          responseId: 'draft-1',
          responseStatus: 'in_progress',
          answers: payload.answers || {},
          navigation: payload.navigation || {},
          progress: {
            answeredCount,
            totalQuestions,
            percentComplete,
          },
          journey: {
            percentComplete,
            answeredCount,
            totalQuestions,
            label: `${percentComplete}% complete`,
            answeredLabel: `${answeredCount}/${totalQuestions} answered`,
            lastSavedAt: new Date().toISOString(),
          },
          startedAt: payload.startedAt,
          lastSavedAt: new Date().toISOString(),
          submittedAt: null,
        };
        savedProgressByIdentityScope.set(identityScope, savedDraft);
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiResponse(
            identityScope ? savedProgressByIdentityScope.get(identityScope) : {},
            'Survey progress saved successfully'
          )
        ),
      });
    }

    if (path.match(/\/api\/r\/[^/]+\/preview$/) && method === 'GET') {
      if (options.forcePreviewSurveyError) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: { code: 500, message: 'Preview load failed' } }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(survey)) });
    }

    if (path.match(/\/api\/r\/[^/]+$/) && method === 'GET') {
      if (options.forcePublicSurveyError) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: { code: 500, message: 'Public load failed' } }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse(survey)) });
    }

    if (path.match(/\/api\/r\/[^/]+\/preview\/submit$/) && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse({ ok: true }, 'Preview validated successfully!')) });
    }

    if (path.match(/\/api\/r\/[^/]+\/responses$/) && method === 'POST') {
      if (options.forceClosedOnSubmit || survey.status === 'closed') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: {
              code: 409,
              message: 'This survey is closed and no longer accepting responses.',
            },
          }),
        });
      }

      const payload = req.postDataJSON?.() || {};
      const identifierScope =
        typeof payload.identifier === 'string' && payload.identifier.trim().length > 0
          ? payload.identifier.trim().toLowerCase()
          : null;
      const recipientScope =
        typeof payload.recipientId === 'string' && payload.recipientId.trim().length > 0
          ? payload.recipientId.trim()
          : null;
      const identityScope = recipientScope || identifierScope;

      if (
        survey.oneResponsePerRecipient &&
        identityScope &&
        submittedIdentityScopes.has(identityScope)
      ) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ status: { code: 409, message: 'Already submitted' } }),
        });
      }

      if (survey.oneResponsePerRecipient && identityScope) {
        submittedIdentityScopes.add(identityScope);
      }

      if (identityScope) {
        const answeredCount = Object.values(payload.answers || {}).filter(Boolean).length;
        const totalQuestions = survey.questions?.length || 0;
        savedProgressByIdentityScope.set(identityScope, {
          responseId: 'resp-1',
          responseStatus: 'completed',
          answers: payload.answers || {},
          navigation: payload.navigation || {},
          progress: {
            answeredCount,
            totalQuestions,
            percentComplete: 100,
          },
          startedAt: payload.startedAt,
          lastSavedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse({ _id: 'resp-1' }, 'Response submitted successfully!')) });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(apiResponse({})) });
  });
}

export async function openEditor(page: Page, surveyId = 'survey-q-1') {
  await page.goto(`/surveys/${surveyId}`);
}

export async function openPublicPreview(page: Page, publicId = 'pub-q-1') {
  await page.goto(`/r/${publicId}/preview`);
}

export async function openLiveSurvey(page: Page, publicId = 'pub-q-1') {
  await page.goto(`/r/${publicId}`);
}

export async function openDraftPreview(page: Page, survey: SurveyShape) {
  await page.goto('/');
  await page.evaluate((s) => {
    sessionStorage.setItem('draftPreview', JSON.stringify(s));
  }, survey);
  await page.goto('/preview/draft');
}
