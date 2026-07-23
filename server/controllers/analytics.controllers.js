/**
 * Analytics Controllers
 *
 * Handles survey analytics, metrics calculation, and CSV exports.
 * Follows KISS + DRY principles with standardized responses.
 *
 * @fileoverview Analytics controllers for SurveyFlow API
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";
import papa from "papaparse";
import { asyncHandler } from "../middleware/utilityMiddleware.js";
import { sendResponse } from "../utils/response.js";
import Survey from "../models/survey.models.js";
import SurveyVersion from "../models/survey_version.models.js";
import Response from "../models/response.models.js";
import Recipient from "../models/recipient.models.js";
import {
  getAnswerableQuestionIds,
  computeVisibleQuestionsInSection,
  getVisibleQuestionIds,
  getVisibleSectionIds,
} from "../utils/logicEngine.js";

const resolveCompanyScope = (req) => {
  const companyId = req.user?.companyId;
  const isScoped = !!companyId;
  return { companyId, isScoped };
};

/**
 * Calculate survey completion rate
 * @param {number} totalRecipients - Total number of recipients
 * @param {number} totalResponses - Total number of responses
 * @returns {number} Completion rate percentage (0-100)
 */
const calculateCompletionRate = (totalRecipients, totalResponses) => {
  if (totalRecipients === 0) return 0;
  return Math.round((totalResponses / totalRecipients) * 100);
};

/**
 * Calculate average completion time
 * @param {Array} responses - Array of response documents
 * @returns {number} Average completion time in seconds
 */
const calculateAverageCompletionTime = (responses) => {
  if (responses.length === 0) return 0;

  const validTimes = responses
    .filter((r) => r.completionTime && r.completionTime > 0)
    .map((r) => r.completionTime);

  if (validTimes.length === 0) return 0;

  const average =
    validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
  return Math.round(average);
};

const isAnswerProvided = (answer) =>
  !(
    answer === undefined ||
    answer === null ||
    (typeof answer === "string" && answer.trim() === "") ||
    (Array.isArray(answer) && answer.length === 0)
  );

const resolveQuestionAnswerFormat = (question = {}) => {
  const predefined = question?.validation?.predefinedPattern;
  const pattern = question?.validation?.pattern;
  const candidate = predefined || pattern;
  const normalized = candidate === "number" ? "numeric" : candidate;
  const supported = new Set([
    "email",
    "phone",
    "url",
    "numeric",
    "integer",
    "alphanumeric",
  ]);
  return supported.has(normalized) ? normalized : null;
};

const buildSearchRegex = (rawSearch = "") => {
  const search = String(rawSearch || "").trim();
  if (!search) return null;
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

const getEffectiveNavigationRules = (
  questions = [],
  surveyNavigationRules = []
) => {
  const optionRules = [];
  for (const question of questions) {
    if (!Array.isArray(question.options)) continue;
    for (const option of question.options) {
      if (!option.logic?.action) continue;
      optionRules.push({
        id: `${question.id}_${option.text}`,
        fromSectionId: question.sectionId || null,
        when: {
          questionId: question.id,
          operator: "equals",
          value: option.text,
        },
        action: option.logic.action,
        priority: option.logic.priority || 0,
      });
    }
  }
  return [...(surveyNavigationRules || []), ...optionRules];
};

const computeEffectiveShownQuestionIds = (surveyVersion, answers = {}) => {
  const questions = surveyVersion?.questions || [];
  const sections = surveyVersion?.sections || [];
  const visibilityRules = surveyVersion?.visibilityRules || [];
  const navigationRules = surveyVersion?.navigationRules || [];

  const visibleQuestionIds = getVisibleQuestionIds(
    questions,
    visibilityRules,
    answers
  );
  const visibleSectionIds = getVisibleSectionIds(
    sections,
    visibilityRules,
    answers
  );
  const answerableQuestionIds = getAnswerableQuestionIds(
    questions,
    sections,
    visibleQuestionIds,
    visibleSectionIds
  );

  const effectiveNavRules = getEffectiveNavigationRules(
    questions,
    navigationRules
  );
  let effectiveIds = answerableQuestionIds;

  if (effectiveNavRules.length > 0) {
    const answerableQuestions = questions
      .filter((q) => answerableQuestionIds.has(q.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    let jumpVisibleQuestions;
    if (sections.length > 1) {
      jumpVisibleQuestions = [];
      for (const section of sections) {
        if (!visibleSectionIds.has(section.id)) continue;
        const sectionQuestions = answerableQuestions.filter(
          (q) =>
            section.questionIds?.includes(q.id) || q.sectionId === section.id
        );
        jumpVisibleQuestions.push(
          ...computeVisibleQuestionsInSection(
            sectionQuestions,
            effectiveNavRules,
            answers,
            section.id
          )
        );
      }
    } else {
      jumpVisibleQuestions = computeVisibleQuestionsInSection(
        answerableQuestions,
        effectiveNavRules,
        answers,
        sections[0]?.id || null
      );
    }

    effectiveIds = new Set(jumpVisibleQuestions.map((q) => q.id));
  }

  // Preserve ordering by survey question order.
  const orderedIds = questions.map((q) => q.id);
  return orderedIds.filter((id) => effectiveIds.has(id));
};

// @desc    Get survey analytics dashboard data
// @route   GET /api/surveys/:id/analytics
// @access  Private
export const getSurveyAnalytics = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const surveyMatch = { _id: surveyId };
  if (isScoped) {
    surveyMatch.companyId = companyId;
  }
  const survey = await Survey.findOne(surveyMatch);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Get basic counts using aggregation for performance
  const [recipientStats, responseStats, recentResponses] = await Promise.all([
    // Recipient statistics
    Recipient.aggregate([
      { $match: { surveyId: new mongoose.Types.ObjectId(surveyId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Response statistics with completion time analysis
    Response.aggregate([
      {
        $match: {
          surveyId: new mongoose.Types.ObjectId(surveyId),
          mode: "live",
          $or: [
            { responseStatus: "completed" },
            { responseStatus: { $exists: false } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          // Exclude 0 values (responses where timing was not captured) so they
          // don't drag the average to zero. $cond returns null for 0s, and
          // $avg ignores nulls.
          avgCompletionTime: {
            $avg: {
              $cond: [{ $gt: ["$completionTime", 0] }, "$completionTime", null],
            },
          },
          deviceBreakdown: {
            $push: "$device",
          },
          dailyResponses: {
            $push: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" },
              },
              submittedAt: "$submittedAt",
            },
          },
        },
      },
    ]),

    // Recent responses for activity feed
    Response.find({
      surveyId,
      mode: "live",
      $or: [
        { responseStatus: "completed" },
        { responseStatus: { $exists: false } },
      ],
    })
      .select(
        "recipientName recipientEmail recipientPhone submittedAt device completionTime"
      )
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Process recipient statistics
  const recipients = {
    total: 0,
    pending: 0,
    invited: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  };

  recipientStats.forEach((stat) => {
    recipients[stat._id] = stat.count;
    recipients.total += stat.count;
  });

  // Process response statistics
  const responseData = responseStats[0] || {
    totalResponses: 0,
    avgCompletionTime: 0,
    deviceBreakdown: [],
    dailyResponses: [],
  };

  // Calculate completion rate
  const completionRate = calculateCompletionRate(
    recipients.total,
    responseData.totalResponses
  );
  const dropOffRate =
    recipients.total > 0
      ? Math.max(
          0,
          Math.round(
            ((recipients.total - responseData.totalResponses) /
              recipients.total) *
              100
          )
        )
      : 0;
  const lastResponseAt = recentResponses[0]?.submittedAt || null;

  // Process device breakdown
  const deviceStats = responseData.deviceBreakdown.reduce((acc, device) => {
    if (device) {
      acc[device] = (acc[device] || 0) + 1;
    }
    return acc;
  }, {});

  // Process daily responses for chart (full range)
  const dailyResponseCounts = responseData.dailyResponses.reduce(
    (acc, item) => {
      acc[item.date] = (acc[item.date] || 0) + 1;
      return acc;
    },
    {}
  );

  const sortedDates = Object.keys(dailyResponseCounts).sort();
  const chartData = [];

  if (sortedDates.length > 0) {
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);

    for (
      let current = new Date(startDate);
      current <= endDate;
      current.setDate(current.getDate() + 1)
    ) {
      const dateKey = current.toISOString().split("T")[0];
      chartData.push({
        date: dateKey,
        responses: dailyResponseCounts[dateKey] || 0,
      });
    }
  }

  // Prepare analytics summary
  const analytics = {
    overview: {
      totalRecipients: recipients.total,
      totalResponses: responseData.totalResponses,
      completionRate,
      dropOffRate,
      avgCompletionTime: Math.round(responseData.avgCompletionTime || 0),
      lastResponseAt,
      surveyStatus: survey.status,
      publishedAt: survey.publishedAt,
    },
    recipients,
    devices: deviceStats,
    dailyActivity: chartData,
    recentActivity: recentResponses,
  };

  sendResponse(res, {
    data: analytics,
    message: "Survey analytics retrieved successfully",
  });
});

// @desc    Export survey responses as CSV
// @route   POST /api/surveys/:id/export/responses
// @access  Private
export const exportResponses = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const surveyId = req.params.id;
  const searchRegex = buildSearchRegex(req.body?.search || req.query?.search);

  // Verify survey exists and belongs to user's company
  const surveyMatch = { _id: surveyId };
  if (isScoped) {
    surveyMatch.companyId = companyId;
  }
  const survey = await Survey.findOne(surveyMatch);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Get published survey version for question details
  const surveyVersion = await SurveyVersion.findOne({
    surveyId,
    version: survey.publishedVersion,
  }).lean();

  if (!surveyVersion || !surveyVersion.questions) {
    res.status(404);
    throw new Error("Survey questions not found");
  }

  // Get all responses (live mode only)
  const responseQuery = {
    surveyId,
    mode: "live",
    $or: [
      { responseStatus: "completed" },
      { responseStatus: { $exists: false } },
    ],
  };
  if (searchRegex) {
    responseQuery.$or = [
      { recipientName: searchRegex },
      { recipientEmail: searchRegex },
      { recipientPhone: searchRegex },
    ];
  }

  const responses = await Response.find(responseQuery)
    .sort({ submittedAt: -1 })
    .lean();

  if (responses.length === 0) {
    res.status(400);
    throw new Error("No responses found to export");
  }

  const recipientIds = responses
    .map((response) => response.recipientId)
    .filter(Boolean);

  const recipientsById = new Map();
  if (recipientIds.length > 0) {
    const recipients = await Recipient.find({ _id: { $in: recipientIds } })
      .select("_id status")
      .lean();
    recipients.forEach((recipient) => {
      recipientsById.set(recipient._id.toString(), recipient);
    });
  }

  // Prepare CSV headers
  const headers = [
    "Response ID",
    "Recipient Name",
    "Recipient Phone",
    "Recipient Email",
    "Invite Status",
    "Submitted At",
    "Completion Time (seconds)",
    "Device",
    "Completion Status",
    "Shown Questions",
    "Skipped Questions",
    ...surveyVersion.questions.map((q) => q.title),
  ];

  // Prepare CSV data rows
  const rows = responses.map((response) => {
    // response.answers is already a plain object after .lean()
    const answersMap = response.answers || {};
    const shownQuestionIds = computeEffectiveShownQuestionIds(
      surveyVersion,
      answersMap
    );
    const shownSet = new Set(shownQuestionIds);
    const skippedQuestionIds = (surveyVersion.questions || [])
      .map((q) => q.id)
      .filter((id) => !shownSet.has(id));

    return [
      response._id.toString(),
      response.recipientName || "Anonymous",
      response.recipientPhone || "",
      response.recipientEmail || "",
      response.recipientId
        ? recipientsById.get(response.recipientId.toString())?.status || ""
        : "",
      response.submittedAt ? response.submittedAt.toISOString() : "",
      response.completionTime || 0,
      response.device || "",
      "completed",
      shownQuestionIds.join(","),
      skippedQuestionIds.join(","),
      ...surveyVersion.questions.map((question) => {
        const answer = answersMap[question.id];

        // Handle different answer types
        if (answer === null || answer === undefined) {
          return "";
        }

        if (Array.isArray(answer)) {
          return answer.join("; ");
        }

        return String(answer);
      }),
    ];
  });

  // Generate CSV content
  const csvContent = papa.unparse({
    fields: headers,
    data: rows,
  });

  // Set response headers for file download
  const fileName = `survey-responses-${survey.title.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  )}-${new Date().toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", Buffer.byteLength(csvContent));

  res.send(csvContent);
});

// @desc    Export survey recipients as CSV
// @route   POST /api/surveys/:id/export/recipients
// @access  Private
export const exportRecipients = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const surveyMatch = { _id: surveyId };
  if (isScoped) {
    surveyMatch.companyId = companyId;
  }
  const survey = await Survey.findOne(surveyMatch);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Get all recipients
  const recipients = await Recipient.find({ surveyId })
    .sort({ createdAt: -1 })
    .lean();

  if (recipients.length === 0) {
    res.status(400);
    throw new Error("No recipients found to export");
  }

  // Prepare CSV headers
  const headers = [
    "Recipient ID",
    "Name",
    "Phone",
    "Email",
    "Status",
    "Invited At",
    "Completed At",
    "Created At",
  ];

  // Prepare CSV data rows
  const rows = recipients.map((recipient) => [
    recipient._id.toString(),
    recipient.name,
    recipient.phone || "",
    recipient.email || "",
    recipient.status,
    recipient.invitedAt ? recipient.invitedAt.toISOString() : "",
    recipient.completedAt ? recipient.completedAt.toISOString() : "",
    recipient.createdAt ? recipient.createdAt.toISOString() : "",
  ]);

  // Generate CSV content
  const csvContent = papa.unparse({
    fields: headers,
    data: rows,
  });

  // Set response headers for file download
  const fileName = `survey-recipients-${survey.title.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  )}-${new Date().toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", Buffer.byteLength(csvContent));

  res.send(csvContent);
});

// @desc    Export survey respondents metadata as CSV
// @route   POST /api/surveys/:id/export/respondents
// @access  Private
export const exportRespondents = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const surveyId = req.params.id;
  const searchRegex = buildSearchRegex(req.body?.search || req.query?.search);

  const surveyMatch = { _id: surveyId };
  if (isScoped) {
    surveyMatch.companyId = companyId;
  }
  const survey = await Survey.findOne(surveyMatch);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  const responseQuery = {
    surveyId,
    mode: "live",
    $or: [
      { responseStatus: "completed" },
      { responseStatus: { $exists: false } },
    ],
  };
  if (searchRegex) {
    responseQuery.$or = [
      { recipientName: searchRegex },
      { recipientEmail: searchRegex },
      { recipientPhone: searchRegex },
    ];
  }

  const responses = await Response.find(responseQuery)
    .select(
      "_id recipientId recipientName recipientPhone recipientEmail submittedAt completionTime device surveyVersion mode"
    )
    .sort({ submittedAt: -1 })
    .lean();

  if (responses.length === 0) {
    res.status(400);
    throw new Error("No respondents found to export");
  }

  const recipientIds = responses
    .map((response) => response.recipientId)
    .filter(Boolean);

  const recipientsById = new Map();
  if (recipientIds.length > 0) {
    const recipients = await Recipient.find({ _id: { $in: recipientIds } })
      .select("_id status")
      .lean();
    recipients.forEach((recipient) => {
      recipientsById.set(recipient._id.toString(), recipient);
    });
  }

  const headers = [
    "Response ID",
    "Respondent",
    "Email",
    "Phone",
    "Invite Status",
    "Submitted At",
    "Completion Time (seconds)",
    "Device",
    "Mode",
    "Survey Version",
  ];

  const rows = responses.map((response) => [
    response._id.toString(),
    response.recipientName || "Anonymous",
    response.recipientEmail || "",
    response.recipientPhone || "",
    response.recipientId
      ? recipientsById.get(response.recipientId.toString())?.status || ""
      : "",
    response.submittedAt ? response.submittedAt.toISOString() : "",
    response.completionTime || 0,
    response.device || "",
    response.mode || "",
    response.surveyVersion || "",
  ]);

  const csvContent = papa.unparse({
    fields: headers,
    data: rows,
  });

  const fileName = `survey-respondents-${survey.title.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  )}-${new Date().toISOString().split("T")[0]}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", Buffer.byteLength(csvContent));
  res.send(csvContent);
});

// @desc    Get question-level analytics for survey
// @route   GET /api/surveys/:id/analytics/questions
// @access  Private
export const getQuestionAnalytics = asyncHandler(async (req, res) => {
  const { companyId, isScoped } = resolveCompanyScope(req);
  const surveyId = req.params.id;

  // Verify survey exists and belongs to user's company
  const surveyMatch = { _id: surveyId };
  if (isScoped) {
    surveyMatch.companyId = companyId;
  }
  const survey = await Survey.findOne(surveyMatch);

  if (!survey) {
    res.status(404);
    throw new Error("Survey not found");
  }

  // Check if survey has been published
  if (!survey.publishedVersion || survey.publishedVersion === 0) {
    return sendResponse(res, {
      data: [],
      message:
        "Survey has not been published yet. Publish the survey to see question analytics.",
    });
  }

  // Get published survey version for question details
  const surveyVersion = await SurveyVersion.findOne({
    surveyId,
    version: survey.publishedVersion,
  }).lean();

  if (!surveyVersion || !surveyVersion.questions) {
    return sendResponse(res, {
      data: [],
      message: "Published survey version not found",
    });
  }

  // Get all responses (live mode only)
  const responses = await Response.find({
    surveyId,
    mode: "live",
    $or: [
      { responseStatus: "completed" },
      { responseStatus: { $exists: false } },
    ],
  }).lean();

  if (responses.length === 0) {
    return sendResponse(res, {
      data: [],
      message: "No responses found for analysis",
    });
  }

  const sectionsById = new Map(
    (surveyVersion.sections || []).map((section) => [section.id, section])
  );

  const responseVisibilityData = responses.map((response) => {
    const answersMap = response.answers || {};
    const visibleQuestionIds = getVisibleQuestionIds(
      surveyVersion.questions,
      surveyVersion.visibilityRules || [],
      answersMap
    );
    const visibleSectionIds = getVisibleSectionIds(
      surveyVersion.sections || [],
      surveyVersion.visibilityRules || [],
      answersMap
    );
    const answerableQuestionIds = getAnswerableQuestionIds(
      surveyVersion.questions,
      surveyVersion.sections || [],
      visibleQuestionIds,
      visibleSectionIds
    );
    return { answersMap, answerableQuestionIds };
  });

  // Analyze each question with visibility-aware denominator
  const questionAnalytics = surveyVersion.questions.map((question) => {
    const displayedAnswers = [];
    let displayedCount = 0;

    for (const responseData of responseVisibilityData) {
      if (!responseData.answerableQuestionIds.has(question.id)) continue;
      displayedCount += 1;
      const answer = responseData.answersMap[question.id];
      if (isAnswerProvided(answer)) {
        displayedAnswers.push(answer);
      }
    }

    const answeredCount = displayedAnswers.length;
    const skippedVisibleCount = Math.max(displayedCount - answeredCount, 0);
    const responseRate =
      displayedCount > 0
        ? Math.round((answeredCount / displayedCount) * 100)
        : 0;

    let analytics = {
      questionId: question.id,
      questionTitle: question.title,
      questionType: question.type,
      answerFormat: resolveQuestionAnswerFormat(question),
      sectionId: question.sectionId || null,
      sectionTitle: question.sectionId
        ? sectionsById.get(question.sectionId)?.title || null
        : null,
      order: question.order ?? null,
      totalResponses: responses.length,
      displayedCount,
      answeredCount,
      skippedVisibleCount,
      responseRate,
      totalAnswers: answeredCount,
      answerValues: displayedAnswers.map((answer) => {
        if (Array.isArray(answer)) return answer.join(", ");
        if (answer === null || answer === undefined) return "";
        if (typeof answer === "object") return JSON.stringify(answer);
        return String(answer);
      }),
    };

    // Type-specific analytics
    switch (question.type) {
      case "single_choice":
      case "multiple_choice":
      case "dropdown":
        // Count frequency of each option
        const optionCounts = {};
        displayedAnswers.forEach((answer) => {
          if (Array.isArray(answer)) {
            answer.forEach((option) => {
              optionCounts[option] = (optionCounts[option] || 0) + 1;
            });
          } else {
            optionCounts[answer] = (optionCounts[answer] || 0) + 1;
          }
        });

        // Convert to choiceDistribution array for frontend
        const totalAnswered = answeredCount;
        const allOptions =
          Array.isArray(question.options) && question.options.length > 0
            ? question.options
            : Object.keys(optionCounts);
        analytics.choiceDistribution = allOptions.map((option) => ({
          option,
          count: optionCounts[option] || 0,
          percentage:
            totalAnswered > 0
              ? Math.round(((optionCounts[option] || 0) / totalAnswered) * 100)
              : 0,
        }));
        break;

      case "rating":
        // Calculate rating statistics
        const numericAnswers = displayedAnswers
          .map((answer) => parseFloat(answer))
          .filter((answer) => !isNaN(answer));

        if (numericAnswers.length > 0) {
          const average =
            numericAnswers.reduce((sum, rating) => sum + rating, 0) /
            numericAnswers.length;
          const sorted = [...numericAnswers].sort((a, b) => a - b);
          const middle = Math.floor(sorted.length / 2);
          const median =
            sorted.length % 2 === 0
              ? (sorted[middle - 1] + sorted[middle]) / 2
              : sorted[middle];

          analytics.averageRating = Math.round(average * 100) / 100;
          analytics.medianRating = Math.round(median * 100) / 100;
          analytics.minRating = sorted[0];
          analytics.maxRating = sorted[sorted.length - 1];
          analytics.ratingDistribution = {};
          numericAnswers.forEach((rating) => {
            analytics.ratingDistribution[rating] =
              (analytics.ratingDistribution[rating] || 0) + 1;
          });
        }
        break;

      case "short_text":
      case "long_text":
        // Text analysis - word count, common words
        const textAnswers = displayedAnswers
          .map((answer) => {
            if (answer === null || answer === undefined) return "";
            if (Array.isArray(answer)) return answer.join(", ");
            if (typeof answer === "object") return JSON.stringify(answer);
            return String(answer);
          })
          .filter((answer) => answer.trim() !== "");
        const avgLength =
          textAnswers.length > 0
            ? Math.round(
                textAnswers.reduce((sum, text) => sum + text.length, 0) /
                  textAnswers.length
              )
            : 0;

        analytics.averageLength = avgLength;
        analytics.textAnswers = textAnswers;
        analytics.sampleAnswers = textAnswers.slice(0, 5);
        break;

      case "date":
        // Date analysis
        const dateAnswers = displayedAnswers.filter((answer) => answer);
        analytics.sampleDates = dateAnswers.slice(0, 10);
        break;

      default:
        break;
    }

    return analytics;
  });

  questionAnalytics.sort((a, b) => {
    const sectionOrderA = sectionsById.get(a.sectionId)?.order ?? 0;
    const sectionOrderB = sectionsById.get(b.sectionId)?.order ?? 0;
    if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  sendResponse(res, {
    data: questionAnalytics,
    message: "Question analytics retrieved successfully",
  });
});
