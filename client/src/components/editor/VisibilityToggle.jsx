import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Eye, EyeOff, Settings } from "lucide-react";

/**
 * VisibilityToggle Component
 *
 * Production-grade conditional visibility control for survey questions.
 * Intuitive toggle interface for setting question display conditions.
 */
export function VisibilityToggle({
  questionId,
  questions = [],
  value = null, // { sourceQuestionId, operator, value }
  onChange,
  disabled = false,
}) {
  const [enabled, setEnabled] = useState(!!value);

  const handleToggle = (checked) => {
    setEnabled(checked);
    if (!checked) {
      // Remove visibility condition
      onChange(null);
    } else {
      // Set default condition (first question, equals operator)
      const firstQuestion = questions.find((q) => q.id !== questionId);
      if (firstQuestion) {
        const defaultValue = getDefaultValueForQuestion(firstQuestion);
        onChange({
          sourceQuestionId: firstQuestion.id,
          operator: "equals",
          value: defaultValue,
        });
      }
    }
  };

  const handleSourceQuestionChange = (sourceQuestionId) => {
    const sourceQuestion = questions.find((q) => q.id === sourceQuestionId);
    const defaultValue = getDefaultValueForQuestion(sourceQuestion);
    onChange({
      sourceQuestionId,
      operator: "equals",
      value: defaultValue,
    });
  };

  const handleOperatorChange = (operator) => {
    const currentValue = value?.value;
    let newValue = currentValue;

    // Convert value format when switching between single and multi-value operators
    if (operator === "in") {
      // Single → array
      newValue = currentValue
        ? Array.isArray(currentValue)
          ? currentValue
          : [currentValue]
        : [];
    } else if (value?.operator === "in") {
      // Array → single (take first element)
      newValue = Array.isArray(currentValue)
        ? currentValue[0] || ""
        : currentValue || "";
    }

    onChange({
      ...value,
      operator,
      value: newValue,
    });
  };

  const handleValueChange = (newValue) => {
    onChange({
      ...value,
      value: newValue,
    });
  };

  const handleMultiValueToggle = (option, checked) => {
    const current = Array.isArray(value?.value) ? value.value : [];
    const updated = checked
      ? [...current, option]
      : current.filter((v) => v !== option);
    onChange({
      ...value,
      value: updated,
    });
  };

  // Get default value for a question based on its type
  const getDefaultValueForQuestion = (question) => {
    if (!question) return "";

    const isChoice = ["single_choice", "multiple_choice", "dropdown"].includes(
      question.type
    );
    if (isChoice && question.options && question.options.length > 0) {
      return question.options[0];
    }

    if (question.type === "rating") {
      return "5";
    }

    return "";
  };

  // Get source question object
  const sourceQuestion = value
    ? questions.find((q) => q.id === value.sourceQuestionId)
    : null;

  // Get available questions (exclude current question and questions after it)
  const currentIndex = questions.findIndex((q) => q.id === questionId);
  const availableQuestions = questions.filter(
    (q, idx) => idx < currentIndex && q.id !== questionId
  );

  // Determine if source question is a choice type (enables "is any of")
  const isSourceChoiceType =
    sourceQuestion &&
    ["single_choice", "multiple_choice", "dropdown"].includes(
      sourceQuestion.type
    );

  const operators = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    ...(isSourceChoiceType ? [{ value: "in", label: "is any of" }] : []),
    { value: "contains", label: "contains" },
  ];

  // Format display value for preview
  const formatPreviewValue = () => {
    if (value?.operator === "in" && Array.isArray(value?.value)) {
      if (value.value.length === 0) return "(none selected)";
      return value.value.map((v) => `"${v}"`).join(" or ");
    }
    return `"${value?.value}"`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              enabled
                ? "bg-indigo-100 text-indigo-600"
                : "bg-slate-100 text-slate-400"
            )}
          >
            {enabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-900">
              Conditional Visibility
            </Label>
            <p className="text-xs text-slate-500 mt-0.5">
              {enabled
                ? "Show based on conditions"
                : "Always show this question"}
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled || availableQuestions.length === 0}
        />
      </div>

      <AnimatePresence>
        {enabled && value && availableQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 pt-4 border-t border-slate-200"
          >
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Only show this question when:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Source question selector */}
              <Select
                value={value.sourceQuestionId || ""}
                onValueChange={handleSourceQuestionChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm bg-white border-slate-300">
                  <SelectValue placeholder="Select question..." />
                </SelectTrigger>
                <SelectContent>
                  {availableQuestions.map((q, idx) => (
                    <SelectItem key={q.id} value={q.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Q{idx + 1}
                        </span>
                        <span>{q.title || "Untitled Question"}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator selector */}
              <Select
                value={value.operator || "equals"}
                onValueChange={handleOperatorChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 w-[130px] text-sm bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value selector — single value for equals/not_equals/contains */}
              {sourceQuestion &&
                value.operator !== "in" &&
                renderValueInput(
                  sourceQuestion,
                  value.value,
                  handleValueChange,
                  disabled
                )}
            </div>

            {/* Multi-value checkboxes for "is any of" operator */}
            {sourceQuestion &&
              value.operator === "in" &&
              isSourceChoiceType &&
              sourceQuestion.options &&
              sourceQuestion.options.length > 0 && (
                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md space-y-2">
                  <p className="text-xs text-slate-500 mb-2">
                    Select one or more values:
                  </p>
                  {sourceQuestion.options.map((option) => {
                    const selected =
                      Array.isArray(value.value) &&
                      value.value.includes(option);
                    return (
                      <label
                        key={option}
                        className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 rounded px-1 py-0.5"
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            handleMultiValueToggle(option, checked)
                          }
                          disabled={disabled}
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              )}

            {/* Preview */}
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-md">
              <p className="text-sm text-slate-600">
                <span className="text-slate-400">Preview:</span> Question will
                only appear if
                <span className="font-medium mx-1">
                  {availableQuestions.find(
                    (q) => q.id === value.sourceQuestionId
                  )?.title || "selected question"}
                </span>
                <span className="mx-1">
                  {operators.find((op) => op.value === value.operator)?.label}
                </span>
                <span className="font-medium">{formatPreviewValue()}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {enabled && availableQuestions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md"
        >
          <p className="text-sm text-amber-700">
            No previous questions available for conditions. Add questions before
            this one to enable conditional logic.
          </p>
        </motion.div>
      )}

      {!enabled && availableQuestions.length === 0 && (
        <div className="mt-3 text-xs text-slate-500">
          Add questions before this one to enable conditional visibility
        </div>
      )}
    </motion.div>
  );
}

/**
 * Render appropriate input for the condition value based on question type
 */
function renderValueInput(sourceQuestion, currentValue, onChange, disabled) {
  const isChoice = ["single_choice", "multiple_choice", "dropdown"].includes(
    sourceQuestion.type
  );

  if (isChoice && sourceQuestion.options && sourceQuestion.options.length > 0) {
    return (
      <Select
        value={currentValue || ""}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[150px] text-sm bg-white border-slate-300">
          <SelectValue placeholder="Select value..." />
        </SelectTrigger>
        <SelectContent>
          {sourceQuestion.options.map((option, idx) => (
            <SelectItem key={idx} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (sourceQuestion.type === "rating") {
    const scale = sourceQuestion.ratingScale || 5;
    return (
      <Select
        value={currentValue || ""}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-[100px] text-sm bg-white border-slate-300">
          <SelectValue placeholder="Rating..." />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: scale }, (_, i) => i + 1).map((rating) => (
            <SelectItem key={rating} value={String(rating)}>
              {rating} star{rating !== 1 ? "s" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Default: text input
  return (
    <Input
      type="text"
      value={currentValue || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      className="h-9 w-[150px] text-sm bg-white border-slate-300"
      disabled={disabled}
    />
  );
}
