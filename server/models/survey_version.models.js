/**
 * Survey Version Model - Immutable snapshot of survey questions and structure
 *
 * Stores the actual survey content (questions, sections, logic) as an immutable
 * version snapshot. This ensures responses are always linked to the exact
 * survey structure that was presented to the respondent.
 *
 * @fileoverview SurveyVersion model with embedded question and section schemas
 * @author SurveyFlow Team
 */
import mongoose from "mongoose";

/**
 * Logic schema for conditional question visibility
 * @typedef {Object} Logic
 * @property {Object} visibleIf - Condition for question visibility
 * @property {string} visibleIf.questionId - ID of question to check
 * @property {string} visibleIf.operator - Comparison operator
 * @property {*} visibleIf.value - Value to compare against
 */
const logicSchema = new mongoose.Schema(
  {
    visibleIf: {
      questionId: String,
      operator: {
        type: String,
        enum: [
          "equals",
          "not_equals",
          "in",
          "gt",
          "lt",
          "gte",
          "lte",
          "contains",
          "exists",
        ],
      },
      value: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

/**
 * Visibility Rule schema for advanced conditional visibility
 * @typedef {Object} VisibilityRule
 * @property {string} id - Unique rule identifier
 * @property {string} targetType - Type of target: "section" | "question"
 * @property {string} targetId - ID of section or question to control
 * @property {string} effect - Visibility effect: "show" | "hide"
 * @property {Object} when - Condition for rule activation
 * @property {string} when.questionId - Question to evaluate
 * @property {string} when.operator - Comparison operator
 * @property {*} when.value - Value to compare against
 * @property {number} priority - Evaluation priority (higher = evaluated first)
 */
const visibilityRuleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["section", "question"],
      required: true,
    },
    targetId: { type: String, required: true },
    effect: {
      type: String,
      enum: ["show", "hide"],
      default: "show",
    },
    when: {
      questionId: { type: String, required: true },
      operator: {
        type: String,
        enum: [
          "equals",
          "not_equals",
          "in",
          "not_in",
          "gt",
          "lt",
          "gte",
          "lte",
          "contains",
          "exists",
        ],
        required: true,
      },
      value: mongoose.Schema.Types.Mixed,
    },
    priority: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Navigation Rule schema for non-linear survey flows
 * @typedef {Object} NavigationRule
 * @property {string} id - Unique rule identifier
 * @property {string} fromSectionId - Source section ID (null = from any section)
 * @property {Object} when - Condition for navigation
 * @property {string} when.questionId - Question to evaluate
 * @property {string} when.operator - Comparison operator
 * @property {*} when.value - Value to compare against
 * @property {Object} action - Navigation action to perform
 * @property {string} action.type - Action type: "jump" | "terminate" | "skip" | "jump_to_question"
 * @property {string} action.targetSectionId - Target section for jump (required if type="jump")
 * @property {string} action.targetQuestionId - Target question for question-level jumps
 * @property {number} action.skipCount - Number of questions to skip
 * @property {number} priority - Evaluation priority (higher = evaluated first)
 */
const navigationRuleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    fromSectionId: { type: String, default: null }, // null = applies from any section
    when: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (when) {
          if (typeof when === "boolean") return true;
          if (!when || typeof when !== "object") return false;

          const validOperators = new Set([
            "equals",
            "not_equals",
            "in",
            "not_in",
            "gt",
            "lt",
            "gte",
            "lte",
            "contains",
            "exists",
          ]);

          const hasGroup =
            Array.isArray(when.all) ||
            Array.isArray(when.any) ||
            Array.isArray(when.conditions) ||
            Boolean(when.not);
          if (hasGroup) return true;

          if (
            typeof when.questionId === "string" &&
            when.questionId.trim().length > 0 &&
            typeof when.operator === "string" &&
            validOperators.has(when.operator)
          ) {
            return true;
          }

          return when.always === true || when.type === "always";
        },
        message: "Invalid navigation rule condition format.",
      },
    },
    action: {
      type: {
        type: String,
        enum: ["jump", "terminate", "skip", "jump_to_question"],
        required: true,
      },
      targetSectionId: String, // Required if action.type = "jump"
      targetQuestionId: String, // Required if action.type = "jump_to_question"
      skipCount: Number, // Required if action.type = "skip"
    },
    priority: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Validation schema for question input validation rules
 * @typedef {Object} Validation
 * @property {number} minLength - Minimum text length
 * @property {number} maxLength - Maximum text length
 * @property {number} minSelections - Minimum choices required
 * @property {number} maxSelections - Maximum choices allowed
 */
const validationSchema = new mongoose.Schema(
  {
    minLength: { type: Number, min: 0 },
    maxLength: { type: Number, min: 1 },
    minSelections: { type: Number, min: 1 },
    maxSelections: { type: Number, min: 1 },
    pattern: {
      type: String,
      validate: {
        validator: function (val) {
          if (!val) return true;
          try {
            new RegExp(val);
            return true;
          } catch (e) {
            return false;
          }
        },
        message: "Invalid regex pattern",
      },
    },
    predefinedPattern: {
      type: String,
      enum: [
        "email",
        "phone",
        "url",
        "numeric",
        "integer",
        "alphanumeric",
        null,
      ],
    },
    customMessage: { type: String, maxlength: 200 },
  },
  { _id: false }
);

/**
 * Section schema for grouping related questions
 * @typedef {Object} Section
 * @property {string} id - Unique section identifier within survey
 * @property {string} title - Section title/heading
 * @property {string} description - Section description
 * @property {number} order - Display order within survey
 * @property {string[]} questionIds - Array of question IDs in this section (for multi-step mode)
 * @property {boolean} required - Whether section is required
 * @property {boolean} randomizeQuestions - Whether to randomize questions in section
 * @property {boolean} pageBreak - Whether section starts on a new page
 */
const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "" },
    description: String,
    order: Number,
    questionIds: { type: [String], default: [] }, // Questions in this section (for multi-step)
    required: { type: Boolean, default: false },
    randomizeQuestions: { type: Boolean, default: false },
    pageBreak: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Question schema representing individual survey questions
 * @typedef {Object} Question
 * @property {string} id - Unique question identifier within survey (required)
 * @property {string} type - Question type: short_text|long_text|single_choice|multiple_choice|dropdown|rating|date
 * @property {string} title - Question text/prompt (required, max 500 chars)
 * @property {string} helpText - Additional guidance text (max 300 chars)
 * @property {boolean} required - Whether answer is required (default: false)
 * @property {string} sectionId - ID of parent section (optional)
 * @property {number} order - Display order within survey
 * @property {string[]} options - Available choices for choice-type questions
 * @property {number} ratingScale - Scale for rating questions (5 or 10)
 * @property {Validation} validation - Input validation rules
 * @property {Logic} logic - Conditional visibility logic
 */
const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "short_text",
        "long_text",
        "single_choice",
        "multiple_choice",
        "dropdown",
        "rating",
        "date",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 500,
    },
    helpText: {
      type: String,
      maxlength: 300,
    },
    required: {
      type: Boolean,
      default: false,
    },
    sectionId: {
      type: String, // Optional grouping
    },
    order: Number,
    options: {
      type: [
        {
          type: String,
          maxlength: 200,
        },
      ],
      validate: {
        validator: function (val) {
          if (
            ["single_choice", "multiple_choice", "dropdown"].includes(this.type)
          ) {
            return Array.isArray(val) && val.length >= 1;
          }
          return !val || val.length === 0;
        },
        message:
          "Options are required (min 1) for choice questions and must be empty for non-choice questions.",
      },
    },
    allowOther: {
      type: Boolean,
      default: false,
      validate: {
        validator: function (val) {
          // Allow for single_choice, multiple_choice, and dropdown
          if (val === true) {
            return ["single_choice", "multiple_choice", "dropdown"].includes(
              this.type
            );
          }
          return true;
        },
        message:
          "allowOther is only valid for single_choice, multiple_choice, and dropdown questions.",
      },
    },
    ratingScale: {
      type: Number,
      enum: [5, 10],
      default: function () {
        return this.type === "rating" ? 5 : undefined;
      },
      validate: {
        validator: function (val) {
          return this.type !== "rating"
            ? val === undefined || val === null
            : true;
        },
        message: "ratingScale is only valid on rating questions.",
      },
    },
    validation: validationSchema,
    logic: logicSchema,
  },
  { _id: false }
);

/**
 * Survey Version schema representing an immutable snapshot of survey content
 * @typedef {Object} SurveyVersion
 * @property {ObjectId} surveyId - Reference to parent Survey (required)
 * @property {ObjectId} companyId - Company that owns this version (required)
 * @property {number} version - Version number, starts at 1 (required)
 * @property {Section[]} sections - Array of question sections
 * @property {Question[]} questions - Array of survey questions
 * @property {VisibilityRule[]} visibilityRules - Rules for conditional visibility
 * @property {NavigationRule[]} navigationRules - Rules for non-linear navigation
 * @property {Object} settings - Survey presentation settings
 * @property {string} settings.presentationMode - Presentation mode: "single_page" | "multi_step"
 * @property {number} settings.autoAdvanceThreshold - Auto-advance after N seconds (multi-step only)
 * @property {ObjectId} createdBy - User who created this version
 * @property {boolean} isLocked - Whether version is immutable (default: true)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const surveyVersionSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    version: { type: Number, required: true, min: 1 },

    sections: [sectionSchema],
    questions: [questionSchema],
    visibilityRules: { type: [visibilityRuleSchema], default: [] },
    navigationRules: { type: [navigationRuleSchema], default: [] },

    settings: {
      presentationMode: {
        type: String,
        enum: ["single_page", "multi_step"],
        default: "single_page",
      },
      autoAdvanceThreshold: {
        type: Number,
        min: 0,
        default: null, // null = no auto-advance
      },
      isSectional: {
        type: Boolean,
        default: false, // false = implicit/non-sectional, true = explicit/sectional
      },
    },

    // Optional test scenarios for validation (not used in runtime logic)
    scenarios: {
      type: [
        {
          id: String,
          name: String,
          steps: mongoose.Schema.Types.Mixed,
          expectedPath: [String],
        },
      ],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isLocked: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure section IDs and question IDs are unique within a version to keep references stable
surveyVersionSchema.pre("validate", function () {
  const idsAreUnique = (items, key) => {
    if (!Array.isArray(items)) return true;
    const seen = new Set();
    for (const item of items) {
      const value = item?.[key];
      if (!value) continue;
      if (seen.has(value)) return false;
      seen.add(value);
    }
    return true;
  };

  if (!idsAreUnique(this.sections, "id")) {
    throw new Error("Section ids must be unique within a survey version.");
  }
  if (!idsAreUnique(this.questions, "id")) {
    throw new Error("Question ids must be unique within a survey version.");
  }
  if (!idsAreUnique(this.visibilityRules, "id")) {
    throw new Error(
      "Visibility rule ids must be unique within a survey version."
    );
  }
  if (!idsAreUnique(this.navigationRules, "id")) {
    throw new Error(
      "Navigation rule ids must be unique within a survey version."
    );
  }

  // Validate navigation rules have required targets per action type
  if (Array.isArray(this.navigationRules)) {
    for (const rule of this.navigationRules) {
      if (rule.action?.type === "jump" && !rule.action?.targetSectionId) {
        throw new Error(
          `Navigation rule "${rule.id}" has action.type="jump" but missing targetSectionId.`
        );
      }
      if (
        rule.action?.type === "jump_to_question" &&
        !rule.action?.targetQuestionId
      ) {
        throw new Error(
          `Navigation rule "${rule.id}" has action.type="jump_to_question" but missing targetQuestionId.`
        );
      }
    }
  }
});

// Pre-save hook: Auto-correct contradictory settings
surveyVersionSchema.pre("save", function () {
  if (this.settings) {
    // Rule: Question mode (isSectional=false) MUST use single_page
    if (this.settings.isSectional === false) {
      this.settings.presentationMode = "single_page";
    }
    // Rule: Section mode (isSectional=true) MUST use multi_step
    if (this.settings.isSectional === true) {
      this.settings.presentationMode = "multi_step";
    }
  }
});

// Performance indexes for version queries
surveyVersionSchema.index({ surveyId: 1, version: 1 }, { unique: true });
surveyVersionSchema.index({ surveyId: 1, isLocked: 1 }); // For finding draft versions
surveyVersionSchema.index({ companyId: 1, createdAt: -1 }); // For company-wide version history

export default mongoose.model("SurveyVersion", surveyVersionSchema);
