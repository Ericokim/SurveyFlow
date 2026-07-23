/**
 * OpenAPI 3.1 description of the SurveyFlow API.
 *
 * Hand-authored rather than generated: request shapes mirror the Joi schemas
 * declared in `server/routes/*.routes.js`, and every operation corresponds to a
 * `// @route` annotation in those files.
 *
 * `server/tests/unit/openapiCoverage.test.mjs` parses those annotations and
 * fails if this document drifts out of sync with the router, so the two cannot
 * silently diverge.
 *
 * @fileoverview OpenAPI document served at `/openapi.json` and rendered at `/`.
 */

const SERVER_URL =
  process.env.PUBLIC_API_URL || "https://surveyflow-api.onrender.com";

/* -------------------------------------------------------------------------- */
/* Reusable pieces                                                            */
/* -------------------------------------------------------------------------- */

const objectId = {
  type: "string",
  pattern: "^[0-9a-fA-F]{24}$",
  description: "MongoDB ObjectId.",
  examples: ["507f1f77bcf86cd799439011"],
};

const hexColor = {
  type: "string",
  pattern: "^#[0-9A-Fa-f]{6}$",
  examples: ["#f76046"],
};

/** Path parameter helpers. */
const p = {
  surveyId: {
    name: "id",
    in: "path",
    required: true,
    description: "Survey ObjectId.",
    schema: objectId,
  },
  recipientId: {
    name: "recipientId",
    in: "path",
    required: true,
    description: "Recipient ObjectId.",
    schema: objectId,
  },
  publicId: {
    name: "publicId",
    in: "path",
    required: true,
    description: "Public survey identifier from the shareable link.",
    schema: { type: "string" },
  },
};

const paginationParams = [
  {
    name: "page",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, default: 1 },
  },
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, default: 10 },
  },
];

/** Shorthand for the standard success envelope. */
const ok = (description, dataSchema) => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/Envelope" },
          dataSchema ? { properties: { data: dataSchema } } : {},
        ],
      },
    },
  },
});

const errs = (...codes) =>
  Object.fromEntries(
    codes.map((c) => [
      String(c),
      { $ref: `#/components/responses/${c}` },
    ])
  );

/** Every authenticated operation carries the same bearer requirement. */
const secured = [{ bearerAuth: [] }];

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

const schemas = {
  Envelope: {
    type: "object",
    description:
      "Every endpoint returns this envelope. `data` is always present and is " +
      "either an array or a single object; `paging` is null on unpaginated routes.",
    required: ["status", "data"],
    properties: {
      status: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "integer", examples: [200] },
          message: { type: "string", examples: ["Success"] },
        },
      },
      data: {
        description: "Payload — an array, a single object, or an empty array.",
      },
      paging: {
        oneOf: [{ $ref: "#/components/schemas/Paging" }, { type: "null" }],
      },
    },
  },

  Paging: {
    type: "object",
    properties: {
      page: { type: "integer", examples: [1] },
      limit: { type: "integer", examples: [10] },
      total: { type: "integer", examples: [42] },
      totalPages: { type: "integer", examples: [5] },
    },
  },

  Error: {
    type: "object",
    properties: {
      status: {
        type: "object",
        properties: {
          code: { type: "integer", examples: [400] },
          message: { type: "string", examples: ["Validation failed"] },
        },
      },
      data: { type: "array", items: {}, examples: [[]] },
      paging: { type: "null" },
    },
  },

  QuestionType: {
    type: "string",
    enum: [
      "short_text",
      "long_text",
      "single_choice",
      "multiple_choice",
      "dropdown",
      "rating",
      "date",
    ],
  },

  Question: {
    type: "object",
    required: ["title", "type"],
    properties: {
      id: { type: "string" },
      title: { type: "string", minLength: 1, maxLength: 500 },
      type: { $ref: "#/components/schemas/QuestionType" },
      required: { type: "boolean" },
      helpText: { type: "string", maxLength: 300 },
      options: {
        type: "array",
        items: { type: "string", maxLength: 200 },
        description: "Choice labels. Applies to choice and dropdown types.",
      },
      allowOther: { type: "boolean" },
      ratingScale: { type: "integer", enum: [5, 10] },
      sectionId: { type: "string" },
      order: { type: "integer" },
      validation: {
        type: "object",
        properties: {
          minLength: { type: "number", minimum: 0 },
          maxLength: { type: "number", minimum: 0 },
          minSelections: { type: "number", minimum: 0 },
          maxSelections: { type: "number", minimum: 0 },
          pattern: { type: "string", maxLength: 500 },
          predefinedPattern: {
            type: ["string", "null"],
            enum: [
              "email",
              "phone",
              "url",
              "numeric",
              "number",
              "integer",
              "alphanumeric",
              null,
            ],
          },
          customMessage: { type: "string", maxLength: 200 },
        },
      },
      logic: {
        type: "object",
        description:
          "Conditional visibility and navigation. Evaluated by the twin logic " +
          "engines in `server/utils/logicEngine.js` and the client.",
        properties: {
          visibleIf: {
            type: "object",
            required: ["questionId", "operator"],
            properties: {
              questionId: { type: "string" },
              operator: {
                type: "string",
                enum: [
                  "equals",
                  "not_equals",
                  "in",
                  "not_in",
                  "gt",
                  "lt",
                  "gte",
                  "lte",
                ],
              },
              value: {},
            },
          },
        },
      },
    },
  },

  Section: {
    type: "object",
    required: ["title"],
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      description: { type: ["string", "null"] },
      order: { type: "number" },
      questionIds: { type: "array", items: { type: "string" } },
    },
  },

  SurveyCreate: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      description: { type: ["string", "null"], maxLength: 1000 },
      questions: {
        type: "array",
        items: { $ref: "#/components/schemas/Question" },
      },
      sections: {
        type: "array",
        items: { $ref: "#/components/schemas/Section" },
      },
      logo: {
        type: ["string", "null"],
        description:
          "Absolute URL, root-relative path, or a filename ending in an image extension.",
      },
      themeColor: hexColor,
      thankYouMessage: { type: ["string", "null"], maxLength: 2000 },
      isWhitelistEnabled: { type: "boolean" },
      showProgress: { type: "boolean" },
      oneResponsePerRecipient: { type: "boolean" },
    },
  },

  SurveyUpdate: {
    allOf: [{ $ref: "#/components/schemas/SurveyCreate" }],
    description: "Same shape as creation, but every field is optional.",
  },

  AnswerMap: {
    type: "object",
    description: "Answers keyed by question id. Value type follows the question type.",
    additionalProperties: true,
    examples: [{ q1: "Yes", q2: ["a", "b"], q3: 4 }],
  },

  ResponseSubmission: {
    type: "object",
    required: ["answers"],
    properties: {
      answers: { $ref: "#/components/schemas/AnswerMap" },
      identifier: {
        type: "string",
        minLength: 1,
        description: "Whitelist identifier — email or phone, when enabled.",
      },
      recipientId: objectId,
      completionTime: { type: "number", description: "Seconds spent completing." },
      startedAt: { type: "string", format: "date-time" },
      mode: { type: "string", enum: ["live", "test", "preview"] },
      visitedSectionIds: { type: "array", items: { type: "string" } },
      visitedQuestionIds: { type: "array", items: { type: "string" } },
      navigation: { type: "object", additionalProperties: true },
    },
  },
};

/** Progress-save is submission minus completionTime. */
schemas.ProgressSave = {
  type: "object",
  required: ["answers"],
  properties: Object.fromEntries(
    Object.entries(schemas.ResponseSubmission.properties).filter(
      ([k]) => k !== "completionTime"
    )
  ),
};

/* -------------------------------------------------------------------------- */
/* Paths                                                                      */
/* -------------------------------------------------------------------------- */

const jsonBody = (schema, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

const multipartBody = (field, description) => ({
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: [field],
        properties: {
          [field]: { type: "string", format: "binary", description },
        },
      },
    },
  },
});

const paths = {
  /* ----------------------------- health ---------------------------------- */
  "/api/health": {
    get: {
      tags: ["Health"],
      summary: "Service and dependency status",
      description:
        "Reports API liveness plus the status of S3 and the database connection. " +
        "Used as the Render health check path.",
      security: [],
      responses: {
        200: {
          description: "Service status.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", examples: ["ok"] },
                  timestamp: { type: "string", format: "date-time" },
                  environment: { type: "string", examples: ["production"] },
                  version: { type: "string", examples: ["1.0.0"] },
                  services: {
                    type: "object",
                    properties: {
                      s3: { type: "object", additionalProperties: true },
                      database: {
                        type: "object",
                        properties: { status: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  /* ------------------------------ auth ----------------------------------- */
  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register new user and company",
      description:
        "Creates an admin user together with its owning company and returns a JWT.",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["name", "email", "password", "companyName"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          email: { type: "string", format: "email" },
          password: {
            type: "string",
            minLength: 8,
            pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
            description:
              "At least 8 characters, with an uppercase letter, a lowercase letter, and a digit.",
          },
          companyName: { type: "string", minLength: 2, maxLength: 200 },
        },
      }),
      responses: { ...{ 201: ok("Account created; envelope carries the JWT.") }, ...errs(400, 409) },
    },
  },

  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login user",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      }),
      responses: { ...{ 200: ok("Authenticated; envelope carries the JWT.") }, ...errs(400, 401) },
    },
  },

  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Get current user profile",
      security: secured,
      responses: { ...{ 200: ok("The authenticated user.") }, ...errs(401) },
    },
  },

  "/api/auth/preferences": {
    patch: {
      tags: ["Auth"],
      summary: "Update current user preferences",
      security: secured,
      requestBody: jsonBody({
        type: "object",
        properties: {
          theme: { type: "string", enum: ["light", "dark", "system"] },
        },
      }),
      responses: { ...{ 200: ok("Updated preferences.") }, ...errs(400, 401) },
    },
  },

  "/api/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Send password reset link",
      description:
        "Always responds 200 so the endpoint cannot be used to enumerate accounts. " +
        "With no comms API configured the email is logged to the server console.",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      }),
      responses: { ...{ 200: ok("Reset email dispatched if the account exists.") }, ...errs(400) },
    },
  },

  "/api/auth/reset-password/{resetToken}": {
    post: {
      tags: ["Auth"],
      summary: "Reset password via emailed link token",
      security: [],
      parameters: [
        {
          name: "resetToken",
          in: "path",
          required: true,
          description: "Raw token from the emailed reset link.",
          schema: { type: "string" },
        },
      ],
      requestBody: jsonBody({
        type: "object",
        required: ["newPassword"],
        properties: {
          newPassword: {
            type: "string",
            minLength: 8,
            pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
          },
        },
      }),
      responses: { ...{ 200: ok("Password changed.") }, ...errs(400) },
    },
  },

  /* ----------------------------- company --------------------------------- */
  "/api/company/profile": {
    get: {
      tags: ["Company"],
      summary: "Get company profile and settings",
      security: secured,
      responses: { ...{ 200: ok("Company profile.") }, ...errs(401, 404) },
    },
  },

  "/api/company/settings": {
    patch: {
      tags: ["Company"],
      summary: "Update company settings",
      description: "Admin only. Sets workspace branding defaults.",
      security: secured,
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, maxLength: 200 },
          primaryColor: hexColor,
          secondaryColor: hexColor,
          defaultFont: { type: "string", enum: ["Inter", "Roboto", "Arial"] },
          thankYouMessage: { type: ["string", "null"], maxLength: 2000 },
        },
      }),
      responses: { ...{ 200: ok("Updated settings.") }, ...errs(400, 401, 403) },
    },
  },

  "/api/company/logo": {
    post: {
      tags: ["Company"],
      summary: "Upload company logo",
      description: "Admin only. Stored in S3 through the backend SDK.",
      security: secured,
      requestBody: multipartBody("logo", "Image file."),
      responses: { ...{ 200: ok("Stored logo reference.") }, ...errs(400, 401, 403) },
    },
    delete: {
      tags: ["Company"],
      summary: "Delete company logo",
      security: secured,
      responses: { ...{ 200: ok("Logo removed.") }, ...errs(401, 403, 404) },
    },
  },

  "/api/company/logo/{filename}": {
    get: {
      tags: ["Company"],
      summary: "Serve company logo file",
      description: "Public so respondent pages can render branding without a session.",
      security: [],
      parameters: [
        {
          name: "filename",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Image bytes.",
          content: { "image/*": { schema: { type: "string", format: "binary" } } },
        },
        ...errs(404),
      },
    },
  },

  /* ----------------------------- surveys --------------------------------- */
  "/api/surveys": {
    get: {
      tags: ["Surveys"],
      summary: "List surveys",
      security: secured,
      parameters: [
        ...paginationParams,
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["draft", "published", "closed"] },
        },
        { name: "search", in: "query", required: false, schema: { type: "string" } },
      ],
      responses: { ...{ 200: ok("Paginated surveys.", { type: "array", items: { type: "object" } }) }, ...errs(401) },
    },
    post: {
      tags: ["Surveys"],
      summary: "Create new survey",
      security: secured,
      requestBody: jsonBody({ $ref: "#/components/schemas/SurveyCreate" }),
      responses: { ...{ 201: ok("Created survey.") }, ...errs(400, 401) },
    },
  },

  "/api/surveys/{id}": {
    get: {
      tags: ["Surveys"],
      summary: "Get single survey by ID",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("The survey.") }, ...errs(401, 404) },
    },
    patch: {
      tags: ["Surveys"],
      summary: "Update survey",
      security: secured,
      parameters: [p.surveyId],
      requestBody: jsonBody({ $ref: "#/components/schemas/SurveyUpdate" }),
      responses: { ...{ 200: ok("Updated survey.") }, ...errs(400, 401, 404) },
    },
    delete: {
      tags: ["Surveys"],
      summary: "Delete survey (soft delete)",
      description: "Marks the survey deleted; restore with the restore endpoint.",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Survey soft-deleted.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/effective-settings": {
    get: {
      tags: ["Surveys"],
      summary: "Get effective branding settings for survey",
      description: "Survey branding merged over company defaults.",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Resolved branding.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/logo": {
    post: {
      tags: ["Surveys"],
      summary: "Upload survey logo",
      security: secured,
      parameters: [p.surveyId],
      requestBody: multipartBody("logo", "Image file."),
      responses: { ...{ 200: ok("Stored logo reference.") }, ...errs(400, 401, 404) },
    },
    delete: {
      tags: ["Surveys"],
      summary: "Delete survey logo",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Logo removed.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/publish": {
    post: {
      tags: ["Surveys"],
      summary: "Publish survey",
      description:
        "Snapshots the survey into an immutable version and mints the public link, " +
        "so later edits cannot change what in-flight respondents already saw.",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Published survey with its public id.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/close": {
    post: {
      tags: ["Surveys"],
      summary: "Close survey",
      description: "Stops accepting new responses.",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Closed survey.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/duplicate": {
    post: {
      tags: ["Surveys"],
      summary: "Duplicate survey",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 201: ok("The new copy.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/restore": {
    post: {
      tags: ["Surveys"],
      summary: "Restore soft-deleted survey",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Restored survey.") }, ...errs(401, 404) },
    },
  },

  /* ---------------------------- recipients ------------------------------- */
  "/api/surveys/{id}/recipients": {
    get: {
      tags: ["Recipients"],
      summary: "List recipients",
      security: secured,
      parameters: [p.surveyId, ...paginationParams],
      responses: { ...{ 200: ok("Paginated recipients.", { type: "array", items: { type: "object" } }) }, ...errs(401, 404) },
    },
    post: {
      tags: ["Recipients"],
      summary: "Create single recipient",
      security: secured,
      parameters: [p.surveyId],
      requestBody: jsonBody({
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string", description: "E.164 recommended." },
          identifier: { type: "string", description: "Whitelist identifier." },
        },
      }),
      responses: { ...{ 201: ok("Created recipient.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/bulk": {
    post: {
      tags: ["Recipients"],
      summary: "Upload recipients via CSV",
      security: secured,
      parameters: [p.surveyId],
      requestBody: multipartBody("file", "CSV of recipients."),
      responses: { ...{ 200: ok("Import summary: created, skipped, and rejected rows.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/bulk-delete": {
    post: {
      tags: ["Recipients"],
      summary: "Delete multiple recipients",
      security: secured,
      parameters: [p.surveyId],
      requestBody: jsonBody({
        type: "object",
        required: ["recipientIds"],
        properties: { recipientIds: { type: "array", items: objectId } },
      }),
      responses: { ...{ 200: ok("Deletion summary.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/bulk-invite": {
    post: {
      tags: ["Recipients"],
      summary: "Send invites to multiple recipients",
      security: secured,
      parameters: [p.surveyId],
      requestBody: jsonBody({
        type: "object",
        properties: { recipientIds: { type: "array", items: objectId } },
      }),
      responses: { ...{ 200: ok("Invite dispatch summary.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/stats": {
    get: {
      tags: ["Recipients"],
      summary: "Get recipient statistics for survey",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Counts by invite and response status.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/{recipientId}": {
    patch: {
      tags: ["Recipients"],
      summary: "Update recipient status",
      security: secured,
      parameters: [p.surveyId, p.recipientId],
      requestBody: jsonBody({ type: "object", additionalProperties: true }),
      responses: { ...{ 200: ok("Updated recipient.") }, ...errs(400, 401, 404) },
    },
    delete: {
      tags: ["Recipients"],
      summary: "Delete recipient",
      security: secured,
      parameters: [p.surveyId, p.recipientId],
      responses: { ...{ 200: ok("Recipient deleted.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/{recipientId}/responses": {
    get: {
      tags: ["Recipients"],
      summary: "Get recipient responses",
      security: secured,
      parameters: [p.surveyId, p.recipientId],
      responses: { ...{ 200: ok("Responses submitted by this recipient.", { type: "array", items: { type: "object" } }) }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/{recipientId}/blacklist": {
    patch: {
      tags: ["Recipients"],
      summary: "Toggle recipient blacklist status",
      description: "Blacklisted recipients fail whitelist validation and cannot respond.",
      security: secured,
      parameters: [p.surveyId, p.recipientId],
      requestBody: jsonBody(
        {
          type: "object",
          properties: { blacklisted: { type: "boolean" } },
        },
        false
      ),
      responses: { ...{ 200: ok("Updated recipient.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/recipients/{recipientId}/invite": {
    post: {
      tags: ["Recipients"],
      summary: "Send invite to recipient",
      security: secured,
      parameters: [p.surveyId, p.recipientId],
      responses: { ...{ 200: ok("Invite dispatched.") }, ...errs(400, 401, 404) },
    },
  },

  /* -------------------- public respondent endpoints ---------------------- */
  "/api/r/{publicId}": {
    get: {
      tags: ["Respondent"],
      summary: "Get survey for respondent",
      description: "Returns the published snapshot behind a public link.",
      security: [],
      parameters: [p.publicId],
      responses: { ...{ 200: ok("Published survey.") }, ...errs(404, 410) },
    },
  },

  "/api/r/{publicId}/validate-access": {
    post: {
      tags: ["Respondent"],
      summary: "Validate access to survey (whitelist check)",
      description:
        "Only relevant when the survey has whitelisting enabled. Confirms the " +
        "identifier belongs to a non-blacklisted recipient.",
      security: [],
      parameters: [p.publicId],
      requestBody: jsonBody({
        type: "object",
        properties: {
          identifier: { type: "string", minLength: 1 },
          recipientId: objectId,
        },
      }),
      responses: { ...{ 200: ok("Access granted.") }, ...errs(400, 403, 404) },
    },
  },

  "/api/r/{publicId}/progress": {
    post: {
      tags: ["Respondent"],
      summary: "Save survey progress draft",
      security: [],
      parameters: [p.publicId],
      requestBody: jsonBody({ $ref: "#/components/schemas/ProgressSave" }),
      responses: { ...{ 200: ok("Draft stored.") }, ...errs(400, 403, 404) },
    },
  },

  "/api/r/{publicId}/preview": {
    get: {
      tags: ["Respondent"],
      summary: "Get survey for preview (no whitelist)",
      security: [],
      parameters: [p.publicId],
      responses: { ...{ 200: ok("Survey for preview rendering.") }, ...errs(404) },
    },
  },

  "/api/r/{publicId}/preview/submit": {
    post: {
      tags: ["Respondent"],
      summary: "Simulate preview submission (no save)",
      description:
        "Runs the same validation and logic evaluation as a live submit but " +
        "persists nothing — used by the editor preview.",
      security: [],
      parameters: [p.publicId],
      requestBody: jsonBody({ $ref: "#/components/schemas/ResponseSubmission" }),
      responses: { ...{ 200: ok("Simulated result.") }, ...errs(400, 404) },
    },
  },

  "/api/r/{publicId}/responses": {
    post: {
      tags: ["Respondent"],
      summary: "Submit survey response",
      security: [],
      parameters: [p.publicId],
      requestBody: jsonBody({ $ref: "#/components/schemas/ResponseSubmission" }),
      responses: { ...{ 201: ok("Response recorded.") }, ...errs(400, 403, 404, 409) },
    },
  },

  /* ----------------------- admin response endpoints ---------------------- */
  "/api/admin/surveys/{id}/responses": {
    get: {
      tags: ["Responses (admin)"],
      summary: "Get all responses for survey with pagination",
      security: secured,
      parameters: [p.surveyId, ...paginationParams],
      responses: { ...{ 200: ok("Paginated responses.", { type: "array", items: { type: "object" } }) }, ...errs(401, 404) },
    },
  },

  "/api/admin/responses/{id}": {
    get: {
      tags: ["Responses (admin)"],
      summary: "Get single response details",
      security: secured,
      parameters: [{ ...p.surveyId, description: "Response ObjectId." }],
      responses: { ...{ 200: ok("The response.") }, ...errs(401, 404) },
    },
    delete: {
      tags: ["Responses (admin)"],
      summary: "Delete response (admin override)",
      security: secured,
      parameters: [{ ...p.surveyId, description: "Response ObjectId." }],
      responses: { ...{ 200: ok("Response deleted.") }, ...errs(401, 403, 404) },
    },
  },

  "/api/admin/recipients/{id}/reset": {
    post: {
      tags: ["Responses (admin)"],
      summary: "Reset recipient submission status (admin override)",
      description:
        "Clears the submitted flag so a recipient can respond again under " +
        "one-response-per-recipient rules.",
      security: secured,
      parameters: [{ ...p.surveyId, description: "Recipient ObjectId." }],
      responses: { ...{ 200: ok("Recipient reset.") }, ...errs(401, 403, 404) },
    },
  },

  /* --------------------------- distribution ------------------------------ */
  "/api/surveys/{id}/sms/send": {
    post: {
      tags: ["Distribution"],
      summary: "Send SMS invitations to recipients",
      description:
        "Requires SMS credentials; with none configured the SMS service is disabled " +
        "and the call reports the failure rather than sending.",
      security: secured,
      parameters: [p.surveyId],
      requestBody: jsonBody({
        type: "object",
        properties: {
          recipientIds: {
            type: "array",
            items: objectId,
            description: "Omit to target every eligible recipient.",
          },
          message: { type: "string", minLength: 1, maxLength: 320 },
        },
      }),
      responses: { ...{ 200: ok("Send summary.") }, ...errs(400, 401, 404) },
    },
  },

  "/api/surveys/{id}/sms/stats": {
    get: {
      tags: ["Distribution"],
      summary: "Get SMS sending statistics",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Aggregate delivery counts.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/sms/logs": {
    get: {
      tags: ["Distribution"],
      summary: "Get SMS delivery logs with pagination",
      security: secured,
      parameters: [p.surveyId, ...paginationParams],
      responses: { ...{ 200: ok("Paginated delivery log.", { type: "array", items: { type: "object" } }) }, ...errs(401, 404) },
    },
  },

  /* ----------------------------- analytics ------------------------------- */
  "/api/surveys/{id}/analytics": {
    get: {
      tags: ["Analytics"],
      summary: "Get survey analytics dashboard data",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Dashboard aggregates.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/analytics/questions": {
    get: {
      tags: ["Analytics"],
      summary: "Get question-level analytics",
      security: secured,
      parameters: [p.surveyId],
      responses: { ...{ 200: ok("Per-question breakdowns.") }, ...errs(401, 404) },
    },
  },

  "/api/surveys/{id}/analytics/export/responses": {
    post: {
      tags: ["Analytics"],
      summary: "Export survey responses as CSV",
      security: secured,
      parameters: [p.surveyId],
      responses: {
        200: {
          description: "CSV file.",
          content: { "text/csv": { schema: { type: "string" } } },
        },
        ...errs(401, 404),
      },
    },
  },

  "/api/surveys/{id}/analytics/export/recipients": {
    post: {
      tags: ["Analytics"],
      summary: "Export survey recipients as CSV",
      security: secured,
      parameters: [p.surveyId],
      responses: {
        200: {
          description: "CSV file.",
          content: { "text/csv": { schema: { type: "string" } } },
        },
        ...errs(401, 404),
      },
    },
  },

  "/api/surveys/{id}/analytics/export/respondents": {
    post: {
      tags: ["Analytics"],
      summary: "Export survey respondents metadata as CSV",
      security: secured,
      parameters: [p.surveyId],
      responses: {
        200: {
          description: "CSV file.",
          content: { "text/csv": { schema: { type: "string" } } },
        },
        ...errs(401, 404),
      },
    },
  },
};

/* -------------------------------------------------------------------------- */
/* Document                                                                   */
/* -------------------------------------------------------------------------- */

const errorResponse = (code, description) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
});

export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SurveyFlow API",
    version: "1.0.0",
    summary: "Schema-driven survey authoring, distribution, and analytics.",
    description: [
      "The SurveyFlow API backs a schema-driven survey platform: surveys are",
      "documents of sections and questions with logic rules attached, so adding a",
      "question type is a renderer change rather than a migration.",
      "",
      "### Response envelope",
      "",
      "Every JSON endpoint returns the same envelope:",
      "",
      "```json",
      '{ "status": { "code": 200, "message": "Success" }, "data": [], "paging": null }',
      "```",
      "",
      "`data` is an array or a single object; `paging` is populated only on",
      "paginated list endpoints.",
      "",
      "### Authentication",
      "",
      "Send `Authorization: Bearer <token>` from `POST /api/auth/login` or",
      "`POST /api/auth/register`. Endpoints under **Respondent** are public so that",
      "survey links work without a session.",
    ].join("\n"),
    license: { name: "ISC" },
  },
  servers: [
    { url: SERVER_URL, description: "Production (Render)" },
    { url: "http://localhost:5001", description: "Local development" },
  ],
  tags: [
    { name: "Health", description: "Liveness and dependency status." },
    { name: "Auth", description: "Registration, login, and password recovery." },
    { name: "Company", description: "Workspace profile, settings, and branding." },
    { name: "Surveys", description: "Authoring lifecycle: create, publish, close, duplicate." },
    { name: "Recipients", description: "Whitelist management, bulk upload, and invitations." },
    { name: "Respondent", description: "Public endpoints powering the shareable survey link." },
    { name: "Responses (admin)", description: "Authenticated review and moderation of submissions." },
    { name: "Distribution", description: "SMS invitations and delivery reporting." },
    { name: "Analytics", description: "Aggregates and CSV exports." },
  ],
  security: [{ bearerAuth: [] }],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT issued by `/api/auth/login` or `/api/auth/register`.",
      },
    },
    schemas,
    responses: {
      400: errorResponse(400, "Validation failed."),
      401: errorResponse(401, "Missing or invalid credentials."),
      403: errorResponse(403, "Authenticated but not permitted."),
      404: errorResponse(404, "Resource not found."),
      409: errorResponse(409, "Conflicts with existing state."),
      410: errorResponse(410, "Survey is closed and no longer accepting responses."),
    },
  },
};

export default openapiSpec;
