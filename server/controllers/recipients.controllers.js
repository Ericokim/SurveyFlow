/**
 * Recipient Controllers
 *
 * Handles recipient management including CSV upload, list, and status tracking.
 * Follows KISS + DRY principles with standardized responses and pagination.
 *
 * @fileoverview Recipient controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";
import multer from "multer";
import papa from "papaparse";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse, sendCreated } from "../utils/response.js";
import { executePagedQuery } from "../utils/pagination.utils.js";
import Recipient from "../models/recipient.models.js";
import Survey from "../models/survey.models.js";
import Communication from "../models/communication.models.js";
import Response from "../models/response.models.js";
import SurveyVersion from "../models/survey_version.models.js";
import {
  getAnswerableQuestionIds,
  getRequiredValidationSet,
  getVisibleQuestionIds,
  getVisibleSectionIds,
} from "../utils/logicEngine.js";

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

/**
 * Normalize phone number to E.164 format
 * @param {string} phone - Phone number to normalize
 * @param {string} defaultCountry - Default country code (default: 'KE')
 * @returns {string|null} Normalized phone or null if invalid
 */
const normalizePhone = (phone, defaultCountry = "KE") => {
  try {
    if (!phone || typeof phone !== "string") return null;

    const cleaned = phone.trim();
    if (!cleaned) return null;

    // Check if already in E.164 format
    if (cleaned.startsWith("+")) {
      return isValidPhoneNumber(cleaned) ? cleaned : null;
    }

    // Parse with default country
    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
    return phoneNumber && phoneNumber.isValid()
      ? phoneNumber.format("E.164")
      : null;
  } catch (error) {
    return null;
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SCIENTIFIC_NOTATION_PATTERN = /^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i;

const buildRecipientDocument = (recipient = {}) => {
  const normalizedName =
    typeof recipient.name === "string" ? recipient.name.trim() : "";
  const document = {
    name: normalizedName,
  };

  if (recipient.phone) {
    document.phone = recipient.phone;
  }

  if (recipient.email) {
    document.email = recipient.email;
  }

  return document;
};

const buildJourneySummary = (response = null) => {
  if (!response) return null;

  const progress = response.progress || {};
  const answeredCount = Number(progress.answeredCount || 0);
  const totalQuestions = Number(progress.totalQuestions || 0);
  const percentComplete = Number(progress.percentComplete || 0);

  return {
    percentComplete,
    answeredCount,
    totalQuestions,
    label: `${percentComplete}% complete`,
    answeredLabel: `${answeredCount}/${totalQuestions} answered`,
    lastSavedAt: response.lastSavedAt || response.updatedAt || null,
  };
};

export const deriveRecipientStatus = (recipient = {}, response = null) => {
  if (response) {
    return (response.responseStatus || "completed") === "completed"
      ? "completed"
      : "in_progress";
  }

  if (recipient.status === "in_progress") {
    if (recipient.invitedAt) return "invited";
    return "pending";
  }

  if (recipient.status === "completed" || recipient.completedAt) {
    return "completed";
  }

  return recipient.status;
};

// @desc    Toggle recipient blacklist status
// @route   PATCH /api/surveys/:id/recipients/:recipientId/blacklist
// @access  Private
export const toggleRecipientBlacklist = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const recipientId = req.params.recipientId;

  const survey = await Survey.findOne({ _id: surveyId, companyId });
  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  const recipient = await Recipient.findOne({
    _id: recipientId,
    surveyId,
  });

  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  recipient.isBlacklisted = !recipient.isBlacklisted;
  await recipient.save();

  sendResponse(res, {
    data: recipient,
    message: `Recipient ${
      recipient.isBlacklisted ? "blacklisted" : "unblacklisted"
    } successfully`,
  });
});

/**
 * Process CSV data and validate recipients
 * @param {string} csvText - CSV content as text
 * @returns {Object} Processing results
 */
const processCSV = (csvText) => {
  const results = papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (results.errors.length > 0) {
    throw new Error(`CSV parsing error: ${results.errors[0].message}`);
  }

  const validRecipients = [];
  const errors = [];
  const totalRows = results.data.length;

  results.data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    const { name, phone, email } = row;

    if (!phone && !email) {
      errors.push(`Row ${rowNum}: Either phone or email is required`);
      return;
    }

    // Normalize phone if provided
    let normalizedPhone = null;
    if (phone) {
      const trimmedPhone = phone.trim();
      if (SCIENTIFIC_NOTATION_PATTERN.test(trimmedPhone)) {
        errors.push(
          `Row ${rowNum}: Phone number appears to be in scientific notation. Format the phone column as text before saving the CSV`
        );
        return;
      }

      normalizedPhone = normalizePhone(trimmedPhone);
      if (!normalizedPhone) {
        errors.push(`Row ${rowNum}: Invalid phone number format`);
        return;
      }
    }

    // Validate email if provided
    let cleanEmail = null;
    if (email && email.trim()) {
      cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        errors.push(`Row ${rowNum}: Invalid email format`);
        return;
      }
    }

    validRecipients.push({
      name: name?.trim() || "",
      phone: normalizedPhone,
      email: cleanEmail,
    });
  });

  return { validRecipients, errors, totalRows };
};

/**
 * Validate single recipient data
 * @param {Object} data - Recipient data
 * @returns {Object} Validation result
 */
const validateRecipient = (data) => {
  const errors = [];
  const { name, phone, email } = data;

  if (!phone && !email) {
    errors.push("Either phone or email is required");
  }

  // Normalize phone if provided
  let normalizedPhone = null;
  if (phone) {
    const trimmedPhone = phone.trim();
    if (SCIENTIFIC_NOTATION_PATTERN.test(trimmedPhone)) {
      errors.push(
        "Phone number appears to be in scientific notation. Format the phone field as text before saving the CSV"
      );
    } else {
      normalizedPhone = normalizePhone(trimmedPhone);
      if (!normalizedPhone) {
        errors.push("Invalid phone number format");
      }
    }
  }

  // Validate email if provided
  let cleanEmail = null;
  if (email && email.trim()) {
    cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      errors.push("Invalid email format");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    recipient: buildRecipientDocument({
      name,
      phone: normalizedPhone,
      email: cleanEmail,
    }),
  };
};

// @desc    Create single recipient
// @route   POST /api/surveys/:id/recipients
// @access  Private
export const createRecipient = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const { name, phone, email } = req.body;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Validate recipient data
  const validation = validateRecipient({ name, phone, email });
  if (!validation.valid) {
    res.status(400);
    throw new Error(validation.errors.join(", "));
  }

  try {
    const recipient = await Recipient.create({
      ...validation.recipient,
      surveyId,
      companyId,
      createdBy: req.user._id,
      status: "pending",
    });

    sendCreated(res, recipient, "Recipient created successfully");
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409);
      throw new Error("Recipient already exists for this survey");
    }
    throw error;
  }
});

// @desc    Upload recipients via CSV
// @route   POST /api/surveys/:id/recipients/bulk
// @access  Private
export const uploadRecipients = [
  upload.single("csvFile"),
  asyncHandler(async (req, res) => {
    const { companyId } = req.user;
    const surveyId = req.params.id;

    // Verify survey exists and belongs to user's company
    const survey = await Survey.findOne({
      _id: surveyId,
      companyId,
    });

    if (!survey) {
      res.status(404);
      throw new Error("Survey not found");
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400);
      throw new Error("CSV file is required");
    }

    try {
      // Process CSV file
      const csvText = req.file.buffer.toString("utf-8");
      const { validRecipients, errors, totalRows } = processCSV(csvText);

      if (totalRows === 0) {
        res.status(400);
        throw new Error("CSV file is empty");
      }

      if (errors.length > 0 && validRecipients.length === 0) {
        res.status(400);
        throw new Error(`CSV validation failed:\n${errors.join("\n")}`);
      }

      // Check for existing recipients to avoid duplicates
      const existingRecipients = await Recipient.find({
        surveyId,
        $or: [
          ...validRecipients
            .filter((r) => r.phone)
            .map((r) => ({ phone: r.phone })),
          ...validRecipients
            .filter((r) => r.email)
            .map((r) => ({ email: r.email })),
        ],
      });

      const existingPhones = new Set(
        existingRecipients.filter((r) => r.phone).map((r) => r.phone)
      );
      const existingEmails = new Set(
        existingRecipients.filter((r) => r.email).map((r) => r.email)
      );
      const uploadedPhones = new Set();
      const uploadedEmails = new Set();
      let duplicateCount = 0;

      // Filter out existing recipients and duplicates within the uploaded file
      const newRecipients = validRecipients.filter((recipient) => {
        const hasExistingPhone =
          !!recipient.phone && existingPhones.has(recipient.phone);
        const hasExistingEmail =
          !!recipient.email && existingEmails.has(recipient.email);
        const hasUploadedPhone =
          !!recipient.phone && uploadedPhones.has(recipient.phone);
        const hasUploadedEmail =
          !!recipient.email && uploadedEmails.has(recipient.email);

        if (
          hasExistingPhone ||
          hasExistingEmail ||
          hasUploadedPhone ||
          hasUploadedEmail
        ) {
          duplicateCount += 1;
          return false;
        }

        if (recipient.phone) {
          uploadedPhones.add(recipient.phone);
        }

        if (recipient.email) {
          uploadedEmails.add(recipient.email);
        }

        return true;
      });

      // Create recipients one by one so the summary reflects what actually persisted
      let createdRecipients = [];
      let insertStageDuplicateCount = 0;
      for (const recipient of newRecipients) {
        try {
          const createdRecipient = await Recipient.create({
            ...buildRecipientDocument(recipient),
            surveyId,
            companyId,
            createdBy: req.user._id,
            status: "pending",
          });
          createdRecipients.push(createdRecipient);
        } catch (error) {
          if (error?.code === 11000) {
            insertStageDuplicateCount += 1;
            continue;
          }

          throw error;
        }
      }

      const summary = {
        totalRows,
        created: createdRecipients.length,
        duplicates: duplicateCount + insertStageDuplicateCount,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors.slice(0, 10) : [], // First 10 errors only
      };

      sendCreated(res, summary, "Recipients uploaded successfully");
    } catch (error) {
      res.status(400);
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }),
];

// @desc    Get all recipients for survey with pagination
// @route   GET /api/surveys/:id/recipients
// @access  Private
export const getRecipients = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Parse pagination and filters
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const status = req.query.status;
  const search = req.query.search?.trim();

  // Build filter
  const filter = { surveyId };
  if (
    status &&
    ["pending", "invited", "in_progress", "completed", "failed"].includes(
      status
    )
  ) {
    filter.status = status;
  }

  if (search) {
    const textRegex = new RegExp(escapeRegex(search), "i");
    const normalizedPhone = search.replace(/[^\d+]/g, "");
    const phoneRegex = normalizedPhone
      ? new RegExp(escapeRegex(normalizedPhone))
      : null;

    filter.$or = [
      { name: textRegex },
      { email: textRegex },
      ...(phoneRegex ? [{ phone: phoneRegex }] : []),
    ];
  }

  // Execute paginated query
  const result = await executePagedQuery(Recipient, filter, {
    page,
    pageSize,
    sort: { createdAt: -1 },
    select:
      "name phone email status invitedAt completedAt createdAt isBlacklisted",
  });

  const activeVersion = survey.publishedVersion || survey.currentVersion || null;
  const recipientIds = result.data.map((recipient) => recipient._id);
  const responses =
    activeVersion && recipientIds.length > 0
      ? await Response.find({
          surveyId,
          surveyVersion: activeVersion,
          recipientId: { $in: recipientIds },
          mode: "live",
        })
          .select("recipientId responseStatus progress lastSavedAt updatedAt")
          .lean()
      : [];
  const responseByRecipientId = new Map(
    responses.map((response) => [String(response.recipientId), response])
  );
  const enrichedRecipients = result.data.map((recipient) => {
    const response = responseByRecipientId.get(String(recipient._id));

    return {
      ...recipient,
      status: deriveRecipientStatus(recipient, response),
      journey: buildJourneySummary(response),
    };
  });

  sendResponse(res, {
    data: enrichedRecipients,
    paging: result.paging,
    message: "Recipients retrieved successfully",
  });
});

// @desc    Get recipient statistics for survey
// @route   GET /api/surveys/:id/recipients/stats
// @access  Private
export const getRecipientStats = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  const summary = {
    total: 0,
    pending: 0,
    invited: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  };

  const recipients = await Recipient.find({ surveyId })
    .select("_id status invitedAt completedAt")
    .lean();
  const activeVersion = survey.publishedVersion || survey.currentVersion || null;
  const recipientIds = recipients.map((recipient) => recipient._id);
  const responses =
    activeVersion && recipientIds.length > 0
      ? await Response.find({
          surveyId,
          surveyVersion: activeVersion,
          recipientId: { $in: recipientIds },
          mode: "live",
        })
          .select("recipientId responseStatus")
          .lean()
      : [];
  const responseByRecipientId = new Map(
    responses.map((response) => [String(response.recipientId), response])
  );

  recipients.forEach((recipient) => {
    const derivedStatus = deriveRecipientStatus(
      recipient,
      responseByRecipientId.get(String(recipient._id))
    );
    summary[derivedStatus] = (summary[derivedStatus] || 0) + 1;
    summary.total += 1;
  });

  sendResponse(res, {
    data: summary,
    message: "Recipient statistics retrieved successfully",
  });
});

// @desc    Get responses for a specific recipient
// @route   GET /api/surveys/:id/recipients/:recipientId/responses
// @access  Private
export const getRecipientResponses = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const recipientId = req.params.recipientId;

  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    res.status(400);
    throw new Error("Invalid recipient id");
  }

  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  })
    .select("_id title")
    .lean();

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  const recipient = await Recipient.findOne({
    _id: recipientId,
    surveyId,
  })
    .select("_id name email phone status invitedAt completedAt")
    .lean();

  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  if (survey.oneResponsePerRecipient) {
    const existingLiveResponse = await Response.findOne({
      surveyId,
      surveyVersion: survey.publishedVersion,
      recipientId: recipient._id,
      mode: "live",
      $or: [
        { responseStatus: "completed" },
        { responseStatus: { $exists: false } },
      ],
    }).select("_id");

    if (existingLiveResponse) {
      res.status(409);
      throw new Error("Recipient already completed this survey");
    }
  }

  const responses = await Response.find({
    surveyId,
    recipientId,
    mode: "live",
    $or: [
      { responseStatus: "completed" },
      { responseStatus: { $exists: false } },
    ],
  })
    .sort({ submittedAt: -1 })
    .lean();

  if (!responses.length) {
    return sendResponse(res, {
      data: {
        recipient,
        responses: [],
        summary: {
          totalResponses: 0,
          latestSubmittedAt: null,
        },
      },
      message: "No responses found for recipient",
    });
  }

  const versionIds = [
    ...new Set(
      responses
        .map((response) => response.surveyVersion)
        .filter((value) => Number.isFinite(value))
    ),
  ];

  const versions = await SurveyVersion.find({
    surveyId,
    version: { $in: versionIds },
  })
    .select("version questions sections visibilityRules")
    .lean();

  const versionMap = new Map(
    versions.map((version) => [version.version, version])
  );

  const normalizedResponses = responses.map((response) => {
    const surveyVersion = versionMap.get(response.surveyVersion);
    const versionQuestions = surveyVersion?.questions || [];
    const versionSections = surveyVersion?.sections || [];
    const versionVisibilityRules = surveyVersion?.visibilityRules || [];
    const questionsById = new Map(
      versionQuestions.map((question) => [question.id, question])
    );
    const sectionsById = new Map(
      versionSections.map((section) => [section.id, section])
    );

    const rawAnswers =
      response.answers instanceof Map
        ? Object.fromEntries(response.answers)
        : response.answers || {};
    const answeredQuestionIds = Object.keys(rawAnswers);

    const visibleQuestionIds = getVisibleQuestionIds(
      versionQuestions,
      versionVisibilityRules,
      rawAnswers
    );
    const visibleSectionIds = getVisibleSectionIds(
      versionSections,
      versionVisibilityRules,
      rawAnswers
    );
    const answerableQuestionIds = getAnswerableQuestionIds(
      versionQuestions,
      versionSections,
      visibleQuestionIds,
      visibleSectionIds
    );
    const requiredQuestionIds = versionQuestions
      .filter((question) => question.required)
      .map((question) => question.id);
    const { missingRequiredQuestionIds } = getRequiredValidationSet({
      requiredQuestionIds,
      visibleQuestionIds: answerableQuestionIds,
      answeredQuestionIds,
    });

    const answers = Object.entries(rawAnswers).map(([questionId, answer]) => {
      const question = questionsById.get(questionId);
      const sectionTitle = question?.sectionId
        ? sectionsById.get(question.sectionId)?.title || null
        : null;
      return {
        questionId,
        questionTitle: question?.title || question?.text || "Untitled question",
        questionType: question?.type || "short_text",
        answer,
        required: !!question?.required,
        sectionId: question?.sectionId || null,
        sectionTitle,
        order: question?.order ?? null,
      };
    });

    answers.sort((a, b) => (a.order || 0) - (b.order || 0));

    const hiddenQuestionIds = versionQuestions
      .map((question) => question.id)
      .filter((questionId) => !answerableQuestionIds.has(questionId));
    const hiddenRequiredQuestionIds = hiddenQuestionIds.filter((questionId) =>
      requiredQuestionIds.includes(questionId)
    );

    return {
      _id: response._id,
      surveyVersion: response.surveyVersion,
      submittedAt: response.submittedAt,
      completionTime: response.completionTime || 0,
      device: response.device || "Unknown",
      metadata: response.metadata || {},
      answers,
      logicSummary: {
        totalQuestions: versionQuestions.length,
        answeredQuestions: answeredQuestionIds.length,
        answerableQuestions: answerableQuestionIds.size,
        hiddenByLogicQuestions: hiddenQuestionIds.length,
        hiddenRequiredQuestions: hiddenRequiredQuestionIds.length,
        missingVisibleRequiredQuestions: missingRequiredQuestionIds.size,
      },
    };
  });

  sendResponse(res, {
    data: {
      recipient,
      responses: normalizedResponses,
      summary: {
        totalResponses: normalizedResponses.length,
        latestSubmittedAt: normalizedResponses[0]?.submittedAt || null,
      },
    },
    message: "Recipient responses retrieved successfully",
  });
});

// @desc    Update recipient status
// @route   PATCH /api/surveys/:id/recipients/:recipientId
// @access  Private
export const updateRecipientStatus = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const recipientId = req.params.recipientId;
  const { status } = req.body;

  // Validate status
  const validStatuses = [
    "pending",
    "invited",
    "in_progress",
    "completed",
    "failed",
  ];
  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Find and update recipient
  const recipient = await Recipient.findOne({
    _id: recipientId,
    surveyId,
  });

  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  recipient.status = status;

  // Update timestamps based on status
  if (status === "invited" && !recipient.invitedAt) {
    recipient.invitedAt = new Date();
    recipient.completedAt = null;
  } else if (status === "in_progress") {
    recipient.completedAt = null;
  } else if (status === "completed" && !recipient.completedAt) {
    recipient.completedAt = new Date();
  }

  await recipient.save();

  sendResponse(res, {
    data: recipient,
    message: "Recipient status updated successfully",
  });
});

// @desc    Delete recipient
// @route   DELETE /api/surveys/:id/recipients/:recipientId
// @access  Private
export const deleteRecipient = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const recipientId = req.params.recipientId;

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Find and delete recipient
  const recipient = await Recipient.findOne({
    _id: recipientId,
    surveyId,
  });

  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  await recipient.deleteOne();

  sendResponse(res, {
    data: { _id: recipientId },
    message: "Recipient deleted successfully",
  });
});

// @desc    Delete multiple recipients
// @route   POST /api/surveys/:id/recipients/bulk-delete
// @access  Private
export const deleteRecipients = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const { recipientIds } = req.body;

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    res.status(400);
    throw new Error("recipientIds must be a non-empty array");
  }

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Delete recipients
  const result = await Recipient.deleteMany({
    _id: { $in: recipientIds },
    surveyId,
  });

  sendResponse(res, {
    data: { deleted: result.deletedCount },
    message: `${result.deletedCount} recipient(s) deleted successfully`,
  });
});

// @desc    Send survey invite to recipient
// @route   POST /api/surveys/:id/recipients/:recipientId/invite
// @access  Private
export const sendInvite = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const recipientId = req.params.recipientId;
  const { message: rawMessage } = req.body || {};

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Check if survey is published
  if (survey.status !== "published") {
    res.status(400);
    throw new Error("Survey must be published before sending invites");
  }

  // Find recipient
  const recipient = await Recipient.findOne({
    _id: recipientId,
    surveyId,
  });

  if (!recipient) {
    res.status(404);
    throw new Error("Recipient not found");
  }

  // Generate survey link with recipient tracking
  const surveyLink = `${
    process.env.FRONTEND_URL || "http://localhost:5173"
  }/r/${survey.publicId}?rid=${recipient._id}`;

  const defaultMessage = `You're invited to complete "${survey.title}". Click here: ${surveyLink}`;
  const template =
    typeof rawMessage === "string" && rawMessage.trim().length > 0
      ? rawMessage.trim()
      : defaultMessage;
  const safeName = recipient.name?.trim() || "there";
  const resolvedMessage = template
    .replace(/\{name\}/gi, safeName)
    .replace(/\{url\}/gi, surveyLink)
    .replace(/\{survey\}/gi, survey.title || "our survey");

  // Determine channel (SMS if phone, fallback to email)
  const channel = recipient.phone ? "sms" : "email";

  let communication;
  try {
    // TODO: Integrate with actual SMS/Email provider (e.g., Twilio, SendGrid)
    communication = await Communication.create({
      surveyId,
      recipientId: recipient._id,
      channel,
      message: resolvedMessage,
      status: "sent",
      createdAt: new Date(),
    });

    // Mark as invited only after communication is logged successfully.
    recipient.status = "invited";
    recipient.invitedAt = new Date();
    recipient.completedAt = null;
    await recipient.save();
  } catch (error) {
    // Keep recipient lifecycle accurate when invite dispatch fails.
    recipient.status = "failed";
    await recipient.save();
    throw error;
  }

  sendResponse(res, {
    data: {
      recipient,
      communication,
      inviteLink: surveyLink,
    },
    message: "Invite sent successfully",
  });
});

// @desc    Send invites to multiple recipients
// @route   POST /api/surveys/:id/recipients/bulk-invite
// @access  Private
export const sendBulkInvites = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const surveyId = req.params.id;
  const { recipientIds } = req.body;

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    res.status(400);
    throw new Error("recipientIds must be a non-empty array");
  }

  // Verify survey exists and belongs to user's company
  const survey = await Survey.findOne({
    _id: surveyId,
    companyId,
  });

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Check if survey is published
  if (survey.status !== "published") {
    res.status(400);
    throw new Error("Survey must be published before sending invites");
  }

  // Find recipients
  const recipients = await Recipient.find({
    _id: { $in: recipientIds },
    surveyId,
  });

  const communications = [];
  const updatedRecipients = [];
  const failedRecipients = [];

  for (const recipient of recipients) {
    if (survey.oneResponsePerRecipient) {
      const existingLiveResponse = await Response.findOne({
        surveyId,
        surveyVersion: survey.publishedVersion,
        recipientId: recipient._id,
        mode: "live",
        $or: [
          { responseStatus: "completed" },
          { responseStatus: { $exists: false } },
        ],
      }).select("_id");

      if (existingLiveResponse) {
        failedRecipients.push({
          recipientId: recipient._id,
          name: recipient.name || null,
          error: "Recipient already completed this survey",
        });
        continue;
      }
    }

    const surveyLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/r/${survey.publicId}?rid=${recipient._id}`;
    const message = `You're invited to complete "${survey.title}". Click here: ${surveyLink}`;
    const channel = recipient.phone ? "sms" : "email";

    try {
      // Create communication log
      const communication = await Communication.create({
        surveyId,
        recipientId: recipient._id,
        channel,
        message,
        status: "sent",
        createdAt: new Date(),
      });

      communications.push(communication);

      // Update recipient status
      recipient.status = "invited";
      recipient.invitedAt = new Date();
      recipient.completedAt = null;
      await recipient.save();
      updatedRecipients.push(recipient);
    } catch (error) {
      recipient.status = "failed";
      await recipient.save();
      failedRecipients.push({
        recipientId: recipient._id,
        name: recipient.name || null,
        error: error.message || "Failed to send invite",
      });
    }
  }

  sendResponse(res, {
    data: {
      sent: updatedRecipients.length,
      failed: failedRecipients.length,
      recipients: updatedRecipients,
      failures: failedRecipients,
    },
    message:
      failedRecipients.length > 0
        ? `${updatedRecipients.length} invite(s) sent, ${failedRecipients.length} failed`
        : `${updatedRecipients.length} invite(s) sent successfully`,
  });
});
