import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Settings,
  Type,
  Star,
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Zap,
  Eye,
  HelpCircle,
  Copy,
} from "lucide-react";
import { QUESTION_TYPES } from "../../lib/constants/questionTypes";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { VisibilityToggle } from "./VisibilityToggle";
import { cn } from "../../lib/utils";

/**
 * QuestionSettingsPanel Component
 *
 * Comprehensive slide-out panel for question-specific settings
 * Production-grade design with organized sections and intuitive controls
 */
export function QuestionSettingsPanel({
  question,
  allQuestions = [],
  isOpen,
  onOpenChange,
  onUpdateQuestion,
  onChange,
  onVisibilityChange,
  onDeleteQuestion,
  onDuplicateQuestion,
  sections = [],
  currentSectionId,
  trigger,
  readonly = false,
}) {
  const [localQuestion, setLocalQuestion] = useState(question || {});
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with external question changes
  useEffect(() => {
    if (question) {
      setLocalQuestion(question);
      setHasChanges(false);
    }
  }, [question]);

  if (!question) return null;

  const isChoiceQuestion = [
    QUESTION_TYPES.SINGLE_CHOICE,
    QUESTION_TYPES.MULTIPLE_CHOICE,
    QUESTION_TYPES.DROPDOWN,
  ].includes(question.type);

  const isRatingQuestion = question.type === QUESTION_TYPES.RATING;
  const selectedTextPattern =
    (localQuestion.validation?.predefinedPattern ||
      localQuestion.validation?.pattern) === "number"
      ? "numeric"
      : localQuestion.validation?.predefinedPattern ||
        localQuestion.validation?.pattern ||
        "none";

  // Handle field updates
  const updateField = (field, value) => {
    const updated = { ...localQuestion, [field]: value };
    setLocalQuestion(updated);
    setHasChanges(true);
  };

  // Handle option updates for choice questions
  const updateOptions = (newOptions) => {
    updateField("options", newOptions);
  };

  const addOption = () => {
    const currentOptions = localQuestion.options || [];
    const newOption = `Option ${currentOptions.length + 1}`;
    updateOptions([...currentOptions, newOption]);
  };

  const removeOption = (index) => {
    const currentOptions = localQuestion.options || [];
    const newOptions = currentOptions.filter((_, i) => i !== index);
    updateOptions(newOptions);
  };

  const updateOption = (index, value) => {
    const currentOptions = [...(localQuestion.options || [])];
    currentOptions[index] = value;
    updateOptions(currentOptions);
  };

  const duplicateOption = (index) => {
    const currentOptions = localQuestion.options || [];
    const optionToDuplicate = currentOptions[index];
    const newOptions = [...currentOptions];
    newOptions.splice(index + 1, 0, `${optionToDuplicate} (Copy)`);
    updateOptions(newOptions);
  };

  // Save changes
  const handleSave = () => {
    if (hasChanges) {
      const saveCallback = onUpdateQuestion || onChange;
      saveCallback?.(localQuestion);
      setHasChanges(false);
    }
  };

  // Auto-save when closing
  const handleOpenChange = (open) => {
    if (!open && hasChanges) {
      handleSave();
    }
    onOpenChange?.(open);
  };

  // Question type information
  const getQuestionTypeInfo = () => {
    const typeMap = {
      [QUESTION_TYPES.SHORT_TEXT]: {
        label: "Short Text",
        description: "Single line text input",
        icon: Type,
        estimatedTime: "30 seconds",
      },
      [QUESTION_TYPES.LONG_TEXT]: {
        label: "Long Text",
        description: "Multi-line text area",
        icon: Type,
        estimatedTime: "2 minutes",
      },
      [QUESTION_TYPES.SINGLE_CHOICE]: {
        label: "Single Choice",
        description: "Pick one option",
        icon: Type,
        estimatedTime: "15 seconds",
      },
      [QUESTION_TYPES.MULTIPLE_CHOICE]: {
        label: "Multiple Choice",
        description: "Pick multiple options",
        icon: Type,
        estimatedTime: "30 seconds",
      },
      [QUESTION_TYPES.DROPDOWN]: {
        label: "Dropdown",
        description: "Select from dropdown",
        icon: Type,
        estimatedTime: "20 seconds",
      },
      [QUESTION_TYPES.RATING]: {
        label: "Rating Scale",
        description: "Star or numeric rating",
        icon: Star,
        estimatedTime: "15 seconds",
      },
      [QUESTION_TYPES.DATE]: {
        label: "Date Picker",
        description: "Select date",
        icon: Type,
        estimatedTime: "30 seconds",
      },
    };
    return (
      typeMap[question.type] || {
        label: "Unknown",
        description: "",
        icon: Type,
      }
    );
  };

  const typeInfo = getQuestionTypeInfo();
  const Icon = typeInfo.icon;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] flex flex-col h-full overflow-hidden"
      >
        <SheetHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <SheetTitle className="text-left">Question Settings</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {typeInfo.label}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    ~{typeInfo.estimatedTime}
                  </span>
                </div>
              </div>
            </div>
            {hasChanges && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Unsaved
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-medium text-slate-700">
                Basic Settings
              </h3>
            </div>

            {/* Question Title */}
            <div className="space-y-2">
              <Label htmlFor="question-title">Question Title</Label>
              <Textarea
                id="question-title"
                placeholder="What would you like to ask?"
                value={localQuestion.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                className="min-h-[60px] resize-none"
                disabled={readonly}
              />
              <p className="text-xs text-slate-500">
                Be specific and clear. Ask one thing at a time.
              </p>
            </div>

            {/* Question Description */}
            <div className="space-y-2">
              <Label htmlFor="question-description">
                Description (Optional)
              </Label>
              <Textarea
                id="question-description"
                placeholder="Add helpful context or instructions..."
                value={localQuestion.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                className="min-h-[60px] resize-none"
                disabled={readonly}
              />
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Required Question</Label>
                <p className="text-xs text-slate-500">
                  Respondents must answer to continue
                </p>
              </div>
              <Switch
                checked={localQuestion.required || false}
                onCheckedChange={(checked) => updateField("required", checked)}
                disabled={readonly}
              />
            </div>
          </div>

          <Separator />

          {/* Question Type Specific Settings */}
          {isChoiceQuestion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-medium text-slate-700">
                    Answer Choices
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={readonly}
                  className="h-8 px-3 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Choice
                </Button>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {(localQuestion.options || []).map((option, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 group"
                    >
                      <div className="flex-shrink-0">
                        <GripVertical className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                      </div>
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Choice ${index + 1}`}
                        className="flex-1"
                        disabled={readonly}
                      />
                      {!readonly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateOption(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {(!localQuestion.options ||
                  localQuestion.options.length === 0) && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No answer choices yet</p>
                    <p className="text-xs">
                      Add choices for respondents to select from
                    </p>
                  </div>
                )}
              </div>

              {/* Choice Settings */}
              {isChoiceQuestion && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow "Other" Option</Label>
                      <p className="text-xs text-slate-500">
                        Let respondents add their own choice
                      </p>
                    </div>
                    <Switch
                      checked={localQuestion.allowOther || false}
                      onCheckedChange={(checked) =>
                        updateField("allowOther", checked)
                      }
                      disabled={readonly}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Randomize Order</Label>
                      <p className="text-xs text-slate-500">
                        Show choices in random order
                      </p>
                    </div>
                    <Switch
                      checked={localQuestion.randomizeOptions || false}
                      onCheckedChange={(checked) =>
                        updateField("randomizeOptions", checked)
                      }
                      disabled={readonly}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isRatingQuestion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-medium text-slate-700">
                  Rating Scale
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scale Type</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                    value={localQuestion.ratingType || "star"}
                    onChange={(e) => updateField("ratingType", e.target.value)}
                    disabled={readonly}
                  >
                    <option value="star">Star Rating</option>
                    <option value="number">Number Scale</option>
                    <option value="emoji">Emoji Scale</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Scale Range</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                    value={localQuestion.ratingScale || 5}
                    onChange={(e) =>
                      updateField("ratingScale", parseInt(e.target.value))
                    }
                    disabled={readonly}
                  >
                    <option value={3}>1 to 3</option>
                    <option value={5}>1 to 5</option>
                    <option value={7}>1 to 7</option>
                    <option value={10}>1 to 10</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Low Label</Label>
                  <Input
                    placeholder="e.g., Poor"
                    value={localQuestion.ratingLowLabel || ""}
                    onChange={(e) =>
                      updateField("ratingLowLabel", e.target.value)
                    }
                    disabled={readonly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>High Label</Label>
                  <Input
                    placeholder="e.g., Excellent"
                    value={localQuestion.ratingHighLabel || ""}
                    onChange={(e) =>
                      updateField("ratingHighLabel", e.target.value)
                    }
                    disabled={readonly}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-medium text-slate-700">
                Logic & Visibility
              </h3>
            </div>

            {/* Conditional Visibility */}
            <div className="space-y-3">
              <VisibilityToggle
                questionId={localQuestion.id}
                questions={allQuestions}
                value={localQuestion.visibilityConditions || null}
                onChange={(conditions) => {
                  updateField("visibilityConditions", conditions);
                  onVisibilityChange?.(localQuestion.id, conditions);
                }}
                disabled={readonly}
              />
            </div>

            {/* Logic Setup for Choice Questions */}
            {isChoiceQuestion && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label>Answer Logic</Label>
                    <p className="text-xs text-slate-500">
                      Set different actions based on answers
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-3 h-3" />
                    Setup Logic
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Validation & Help */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-medium text-slate-700">
                Validation & Help
              </h3>
            </div>

            {/* Custom Validation */}
            {[QUESTION_TYPES.SHORT_TEXT, QUESTION_TYPES.LONG_TEXT].includes(
              question.type
            ) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Text Validation</Label>
                    <p className="text-xs text-slate-500">
                      Validate format or length
                    </p>
                  </div>
                  <Select
                    value={selectedTextPattern}
                    onValueChange={(value) =>
                      updateField("validation", {
                        ...(localQuestion.validation || {}),
                        predefinedPattern:
                          value === "none"
                            ? undefined
                            : value === "number"
                              ? "numeric"
                              : value,
                        pattern: undefined,
                      })
                    }
                    disabled={readonly}
                  >
                    <SelectTrigger className="h-10 w-full sm:w-[240px]">
                      <SelectValue placeholder="No Pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Pattern</SelectItem>
                      <SelectItem value="email">Email Address</SelectItem>
                      <SelectItem value="phone">Phone Number</SelectItem>
                      <SelectItem value="url">Website URL</SelectItem>
                      <SelectItem value="numeric">Numbers Only</SelectItem>
                      <SelectItem value="integer">Whole Numbers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label>Min Length</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-slate-400 cursor-help">
                            ?
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Require at least this many characters
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={localQuestion.validation?.minLength ?? ""}
                      onChange={(e) =>
                        updateField("validation", {
                          ...(localQuestion.validation || {}),
                          minLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      disabled={readonly}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label>Max Length</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-slate-400 cursor-help">
                            ?
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Limit to this many characters
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={localQuestion.validation?.maxLength ?? ""}
                      onChange={(e) =>
                        updateField("validation", {
                          ...(localQuestion.validation || {}),
                          maxLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      disabled={readonly}
                    />
                  </div>
                </div>

                {(localQuestion.validation?.predefinedPattern ||
                  localQuestion.validation?.pattern ||
                  localQuestion.validation?.minLength ||
                  localQuestion.validation?.maxLength) && (
                  <div className="space-y-2">
                    <Label>Custom Error Message</Label>
                    <Input
                      placeholder="Please enter a valid response"
                      value={localQuestion.validation?.customMessage || ""}
                      onChange={(e) =>
                        updateField("validation", {
                          ...(localQuestion.validation || {}),
                          customMessage: e.target.value,
                        })
                      }
                      disabled={readonly}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Choice Validation */}
            {isChoiceQuestion && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Selection Limits</Label>
                    <p className="text-xs text-slate-500">
                      Require at least/at most N selections
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Min Selections</Label>
                    <Input
                      type="number"
                      min="0"
                      value={localQuestion.validation?.minSelections ?? ""}
                      onChange={(e) =>
                        updateField("validation", {
                          ...(localQuestion.validation || {}),
                          minSelections: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      disabled={readonly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Selections</Label>
                    <Input
                      type="number"
                      min="0"
                      value={localQuestion.validation?.maxSelections ?? ""}
                      onChange={(e) =>
                        updateField("validation", {
                          ...(localQuestion.validation || {}),
                          maxSelections: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      disabled={readonly}
                    />
                  </div>
                </div>
                {(localQuestion.validation?.minSelections ||
                  localQuestion.validation?.maxSelections) && (
                  <div className="space-y-2">
                    <Label>Custom Error Message</Label>
                    <Input
                      placeholder="Please select the required number of options"
                      value={localQuestion.validation?.customMessage || ""}
                      onChange={(e) =>
                        updateField("validation", {
                          ...(localQuestion.validation || {}),
                          customMessage: e.target.value,
                        })
                      }
                      disabled={readonly}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            <div className="space-y-2">
              <Label>Help Text</Label>
              <Textarea
                placeholder="Additional instructions or examples..."
                value={localQuestion.helpText || ""}
                onChange={(e) => updateField("helpText", e.target.value)}
                className="min-h-[60px] resize-none"
                disabled={readonly}
              />
              <p className="text-xs text-slate-500">
                Appears below the question to guide respondents
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {!readonly && (
          <div className="border-t pt-6 mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicateQuestion?.(question)}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteQuestion?.(question.id)}
                  className="gap-2 text-red-600 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>

              {hasChanges && (
                <Button onClick={handleSave} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </Button>
              )}
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700">
                  Changes will be saved automatically when you close this panel
                </p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
