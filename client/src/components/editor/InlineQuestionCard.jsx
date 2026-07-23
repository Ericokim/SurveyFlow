import React, { useState } from "react";
import {
  MoreVertical,
  GripVertical,
  Copy,
  Trash2,
  Plus,
  X,
  Settings,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronUp,
  Star,
  Pencil,
  Layers,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "../../lib/utils";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_IS_CHOICE,
  QUESTION_TYPES,
} from "../../lib/constants/questionTypes";
import { SimpleLogicDropdown } from "./SimpleLogicDropdown";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Accordion, AccordionContent, AccordionItem } from "../ui/accordion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

const TEXT_FORMAT_OPTIONS = [
  { value: "none", label: "Any Text" },
  { value: "numeric", label: "Numbers Only (decimals allowed)" },
  { value: "integer", label: "Whole Numbers Only" },
  { value: "email", label: "Email Address" },
  { value: "phone", label: "Phone Number" },
  { value: "url", label: "Website URL" },
  { value: "alphanumeric", label: "Letters + Numbers" },
];

const TEXT_FORMAT_HELP = {
  none: "Accepts any text input.",
  numeric: "Accepts numbers, including decimals (e.g., 3.5).",
  integer: "Accepts whole numbers only (e.g., 3, 10, 25).",
  email: "Accepts valid email addresses (e.g., john@example.com).",
  phone: "Accepts phone numbers with country code (e.g., +254712345678).",
  url: "Accepts valid website URLs.",
  alphanumeric: "Accepts letters, numbers, and spaces only.",
};

const TEXT_FORMAT_BADGE_LABELS = {
  numeric: "Numbers",
  integer: "Numbers",
  email: "Email",
  phone: "Phone",
  url: "URL",
  alphanumeric: "A-Z + 0-9",
};

/**
 * InlineQuestionCard - Production-grade question editor
 * Google Forms-like experience with clean design and intuitive interactions
 */
export function InlineQuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveToSection,
  currentSectionId = null,
  sections = [],
  onOptionLogicChange,
  getOptionLogic,
  readonly = false,
  allQuestions = [],
  visibilityCondition = null,
  isSelected = false,
  dragHandleProps = {}, // For drag and drop
  isDragging = false, // Visual feedback during drag
  isHidden = false,
  onToggleVisibility,
  expanded = false, // NEW: Control expanded/collapsed state
  onToggleExpanded, // NEW: Callback when user toggles
  showTitleError = false,
  isSectional = false, // Whether survey is section-based (logic only works with sections)
}) {
  const selectedTextPattern =
    (question.validation?.predefinedPattern || question.validation?.pattern) ===
    "number"
      ? "numeric"
      : question.validation?.predefinedPattern ||
        question.validation?.pattern ||
        "none";

  // Field values
  const [titleValue, setTitleValue] = useState(question.title || "");
  const [descriptionValue, setDescriptionValue] = useState(
    question.helpText || ""
  );

  // Sync state when question prop changes
  React.useEffect(() => {
    setTitleValue(question.title || "");
  }, [question.title]);

  React.useEffect(() => {
    setDescriptionValue(question.helpText || "");
  }, [question.helpText]);
  const currentType = question.type;
  const isTextQuestion =
    currentType === QUESTION_TYPES.SHORT_TEXT ||
    currentType === QUESTION_TYPES.LONG_TEXT;
  const answerFormatBadgeLabel = TEXT_FORMAT_BADGE_LABELS[selectedTextPattern];
  const currentRequired = question.required || false;
  const currentOptions = question.options || [];
  const optionsForRender =
    currentOptions.length > 0 ? currentOptions : ["Option 1", "Option 2"];
  const currentRatingScale = question.ratingScale || 5;
  const [isSelectionLimitsOpen, setIsSelectionLimitsOpen] = useState(false);

  // Component now receives drag props from parent SortableQuestionCard

  // Track changes for inline editing
  const handleTitleChange = (e) => {
    setTitleValue(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescriptionValue(e.target.value);
  };

  const handleTypeChange = (newType) => {
    onUpdate({ type: newType });
  };

  const handleRequiredChange = (checked) => {
    onUpdate({ required: checked });
  };

  const handleRatingScaleChange = (scale) => {
    onUpdate({ ratingScale: scale });
  };

  const handleSelectionLimitChange = (field, rawValue) => {
    const trimmedValue = String(rawValue ?? "").trim();
    const parsedValue =
      trimmedValue === ""
        ? undefined
        : Number.isFinite(Number(trimmedValue))
          ? Math.max(0, Number(trimmedValue))
          : undefined;

    onUpdate({
      validation: {
        ...(question.validation || {}),
        [field]: parsedValue,
      },
    });
  };

  const handleTextPatternChange = (rawValue) => {
    const nextPattern = rawValue === "none" ? undefined : rawValue;
    onUpdate({
      validation: {
        ...(question.validation || {}),
        // Keep both keys aligned for backward + forward compatibility.
        predefinedPattern: nextPattern,
        pattern: nextPattern,
      },
    });
  };

  const handleOptionChange = (index, value) => {
    const baseOptions =
      currentOptions.length > 0 ? currentOptions : optionsForRender;
    const updated = [...baseOptions];
    updated[index] = value;
    onUpdate({ options: updated });
  };

  const renumberOptionLabels = (options) => {
    let counter = 1;
    return options.map((opt) => {
      const trimmed = typeof opt === "string" ? opt.trim() : "";
      if (/^Option\s+\d+$/i.test(trimmed)) {
        const next = `Option ${counter}`;
        counter += 1;
        return next;
      }
      counter += 1;
      return opt;
    });
  };

  const addOption = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const baseOptions =
      currentOptions.length > 0 ? currentOptions : optionsForRender;
    const newOptions = [...baseOptions, `Option ${baseOptions.length + 1}`];
    onUpdate({ options: renumberOptionLabels(newOptions) });
  };

  const removeOption = (index, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent deletion if only 1 option remains (need at least 1)
    const baseOptions =
      currentOptions.length > 0 ? currentOptions : optionsForRender;
    if (baseOptions.length <= 1) {
      toast.error("Questions must have at least one option");
      return;
    }

    const updated = baseOptions.filter((_, i) => i !== index);
    onUpdate({ options: renumberOptionLabels(updated) });
  };

  const hasLogic =
    onOptionLogicChange &&
    question.options?.some((opt) => {
      const logic = getOptionLogic?.(question.id, opt);
      return logic && logic.type !== "continue";
    });
  const sortedSections = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const alternateSections = sortedSections.filter(
    (section) => section.id !== currentSectionId
  );

  const isVisible = visibilityCondition?.enabled !== false;
  const isLogicHidden = !isVisible;
  const canMoveToAnotherSection =
    isSectional &&
    typeof onMoveToSection === "function" &&
    alternateSections.length > 0;
  const getSectionLabel = (section) => {
    const sectionIndex = sortedSections.findIndex(
      (item) => item.id === section.id
    );
    return `Section ${Math.max(sectionIndex + 1, 1)}: ${
      section.title || "Untitled section"
    }`;
  };
  const renderMoveToSectionMenu = () => {
    if (!canMoveToAnotherSection) return null;

    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Layers className="w-4 h-4 mr-2" />
          Move to section
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-64">
          {alternateSections.map((section) => (
            <DropdownMenuItem
              key={section.id}
              onClick={() => onMoveToSection(section.id)}
            >
              {getSectionLabel(section)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  // Collapsed Summary View - Match screenshot design exactly
  if (!expanded) {
    const summary = question.title?.trim() || "Untitled question";
    const buildOptionsPreviewText = (options = []) => {
      if (!Array.isArray(options) || options.length === 0) return "";
      const previewText = options.slice(0, 3).join(" • ");
      const reservedForTitle = Math.min(summary.length, 80);
      const previewCharBudget = Math.max(24, 110 - reservedForTitle);

      if (previewText.length <= previewCharBudget) {
        return options.length > 3 ? `${previewText} …` : previewText;
      }

      const clipped = previewText.slice(0, previewCharBudget).trimEnd();
      return `${clipped}…`;
    };

    const renderOptionsPreview = () => {
      if (!QUESTION_TYPE_IS_CHOICE.has(currentType)) return null;
      const opts = currentOptions;
      if (!opts.length) return null;
      const previewText = buildOptionsPreviewText(opts);
      if (!previewText) return null;
      return (
        <span className="hidden xl:inline text-xs text-muted-foreground ml-2 truncate max-w-[36ch]">
          {previewText}
        </span>
      );
    };

    return (
      <Accordion
        type="single"
        collapsible
        value=""
        onValueChange={() => onToggleExpanded?.()}
        className="space-y-0"
      >
        <AccordionItem
          value={question.id}
          data-question-id={question.id}
          className={cn(
            "relative bg-card rounded-lg mt-2 border border-border/70 transition-colors overflow-hidden hover:border-ring/40 last:!border-b",
            isSelected && "border-ring/40",
            isDragging &&
              "opacity-50 shadow-2xl ring-4 ring-primary/30 scale-105 rotate-1 border-primary/60 cursor-grabbing",
            (!isVisible || isHidden) && "opacity-60 bg-muted/40",
            showTitleError && "border-red-300"
          )}
        >
          <AccordionPrimitive.Header className="flex w-full items-center border-b border-border bg-muted/40 overflow-hidden">
            <AccordionPrimitive.Trigger className="flex-1 px-2.5 sm:px-3 py-2.5 hover:no-underline cursor-pointer text-left min-w-0 overflow-hidden">
              <div className="flex w-full items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
                {/* Drag Handle */}
                {!readonly && (
                  <div
                    {...dragHandleProps}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "cursor-grab active:cursor-grabbing transition-all duration-200 shrink-0 rounded p-1",
                      isDragging
                        ? "text-primary bg-primary/10 scale-110"
                        : "text-muted-foreground/80 hover:text-primary hover:bg-accent/60"
                    )}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}

                {/* Question Number */}
                <span className="text-sm font-semibold text-foreground shrink-0">
                  Q{index + 1}
                </span>

                {/* Title & Options Preview */}
                <div className="flex-1 min-w-0 flex items-baseline gap-1 sm:gap-1.5 overflow-hidden">
                  <span className="text-sm text-foreground truncate block w-full">
                    {summary}
                  </span>
                  {renderOptionsPreview()}
                </div>

                {/* Badges */}
                <div className="hidden sm:flex flex-wrap items-center gap-1.5 ml-auto">
                  {showTitleError && (
                    <Badge className="text-xs h-5 px-2 bg-destructive/15 text-destructive border-destructive/35 hover:bg-destructive/15">
                      Missing title
                    </Badge>
                  )}
                  {question.required && (
                    <Badge className="text-xs h-5 px-2 bg-destructive/15 text-destructive border-destructive/35 hover:bg-destructive/15">
                      Required
                    </Badge>
                  )}
                  <Badge className="text-xs h-5 px-2 border-border bg-secondary/70 text-foreground hover:bg-secondary/70">
                    {QUESTION_TYPE_LABELS[question.type]}
                  </Badge>
                  {isTextQuestion &&
                    selectedTextPattern !== "none" &&
                    answerFormatBadgeLabel && (
                      <Badge className="text-xs h-5 px-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        {answerFormatBadgeLabel}
                      </Badge>
                    )}
                  {question.allowOther &&
                    QUESTION_TYPE_IS_CHOICE.has(question.type) && (
                      <Badge className="text-xs h-5 px-2 bg-primary/20 text-primary border-primary/40 hover:bg-primary/20">
                        + Other
                      </Badge>
                    )}
                  {hasLogic && (
                    <Badge className="text-xs h-5 px-2 bg-purple-600/10 text-purple-500 border-purple-400/20 hover:bg-purple-800/10">
                      <Settings className="w-3 h-3 mr-1" />
                      Logic
                    </Badge>
                  )}
                  {isLogicHidden && (
                    <Badge
                      variant="outline"
                      className="text-xs h-5 px-2 text-muted-foreground border-border"
                    >
                      <EyeOff className="w-3 h-3 mr-1" />
                      Logic hidden
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionPrimitive.Trigger>

            {/* Actions */}
            {!readonly && (
              <div className="flex items-center gap-1 shrink-0 px-2 py-2.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-foreground/75 hover:text-foreground hover:bg-accent"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={onToggleExpanded}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Question
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {/* {renderMoveToSectionMenu()} */}
                    {onToggleVisibility && (
                      <>
                        <DropdownMenuSeparator />
                        {isLogicHidden && !isHidden && (
                          <DropdownMenuItem disabled>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hidden by logic rule
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleVisibility?.();
                          }}
                        >
                          {isHidden ? (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Show in editor
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Hide in editor
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleExpanded?.()}
                  className="h-8 w-8 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            )}
          </AccordionPrimitive.Header>
          <AccordionContent />
        </AccordionItem>
      </Accordion>
    );
  }

  // Expanded Edit View (existing code)
  return (
    <Accordion
      type="single"
      collapsible
      value={question.id}
      onValueChange={(value) => {
        if (!value) onToggleExpanded?.();
      }}
      className="space-y-0 rounded-lg mt-2 transition-all duration-200 ring-0"
    >
      <AccordionItem
        value={question.id}
        data-question-id={question.id}
        className={cn(
          "group relative bg-card rounded-lg border border-border/70 transition-colors overflow-hidden hover:border-ring/40 last:!border-b",
          isSelected && "border-ring/40",
          isDragging &&
            "opacity-50 shadow-2xl ring-4 ring-primary/30 scale-105 rotate-1 border-primary/60 cursor-grabbing",
          (!isVisible || isHidden) && "opacity-60 bg-muted/40"
        )}
      >
        <AccordionPrimitive.Header className="flex w-full items-center border-b border-border/60 bg-muted/40">
          <AccordionPrimitive.Trigger className="px-3 py-2 rounded-none hover:no-underline cursor-pointer flex-1 text-left">
            <div className="flex w-full flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex items-center">
                {/* Drag Handle */}
                {!readonly && (
                  <div
                    {...dragHandleProps}
                    className={cn(
                      "flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200 shrink-0 rounded p-1",
                      isDragging
                        ? "text-primary bg-primary/10 scale-110"
                        : "text-muted-foreground/80 hover:text-primary hover:bg-accent/60"
                    )}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}

                {/* Question Number - More Prominent */}
                <div className="flex items-center justify-center min-w-7 h-7 bg-primary/10 text-primary font-bold text-xs rounded-md shrink-0 ml-1">
                  {index + 1}
                </div>
              </div>

              {/* Main Header Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {/* Question Type */}
                  {!readonly ? (
                    <div
                      data-no-toggle
                      onPointerDownCapture={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <QuestionTypeSelector
                        onSelect={handleTypeChange}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-medium hover:bg-muted/40 transition-colors"
                          >
                            {QUESTION_TYPE_LABELS[currentType]}
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs h-6 font-medium"
                    >
                      {QUESTION_TYPE_LABELS[currentType]}
                    </Badge>
                  )}

                  {/* Status Badges */}
                  {hasLogic && (
                    <Badge className="text-xs h-6 bg-primary/10 text-primary hover:bg-primary/10 font-medium">
                      <Settings className="w-3 h-3 mr-1" />
                      Logic
                    </Badge>
                  )}
                  {isLogicHidden && (
                    <Badge
                      variant="outline"
                      className="text-xs h-6 text-muted-foreground font-medium"
                    >
                      <EyeOff className="w-3 h-3 mr-1" />
                      Logic hidden
                    </Badge>
                  )}
                  {isHidden && (
                    <Badge
                      variant="outline"
                      className="text-xs h-6 text-amber-600 border-amber-200 font-medium"
                    >
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hidden in editor
                    </Badge>
                  )}
                </div>

                {readonly && question.required && (
                  <Badge className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full hover:bg-red-100 font-medium">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          </AccordionPrimitive.Trigger>

          {/* Simple Action Menu */}
          {!readonly && (
            <div className="flex items-center gap-1 shrink-0 px-2 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 w-7 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Question
                  </DropdownMenuItem>
                  {renderMoveToSectionMenu()}
                  {onToggleVisibility && (
                    <>
                      <DropdownMenuSeparator />
                      {isLogicHidden && !isHidden && (
                        <DropdownMenuItem disabled>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hidden by logic rule
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleVisibility?.();
                        }}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Show in editor
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide in editor
                          </>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Question
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleExpanded?.()}
                className="h-8 w-8 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          )}
        </AccordionPrimitive.Header>

        <AccordionContent
          className="px-3 py-3 space-y-3 border-b border-border"
          data-question-content
        >
          {/* Question Title */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Question
            </Label>
            <Textarea
              value={titleValue}
              onChange={handleTitleChange}
              onBlur={() => {
                const trimmed = (titleValue || "").trim();
                const currentTitle = (question.title || "").trim();
                if (trimmed !== currentTitle) {
                  onUpdate({ title: trimmed });
                }
              }}
              placeholder="Enter your question..."
              className={cn(
                "resize-none",
                showTitleError && "border-red-300 focus:border-red-400"
              )}
              rows={1}
              readOnly={readonly}
            />
          </div>

          {/* Help Text */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Help Text (Optional)
            </Label>
            <Input
              value={descriptionValue}
              onChange={handleDescriptionChange}
              onBlur={() => {
                const trimmed = (descriptionValue || "").trim();
                const currentHelp = (question.helpText || "").trim();
                if (trimmed !== currentHelp) {
                  onUpdate({ helpText: trimmed || undefined });
                }
              }}
              placeholder="Additional instructions for respondents..."
              readOnly={readonly}
            />
          </div>

          {/* Text answer format */}
          {[QUESTION_TYPES.SHORT_TEXT, QUESTION_TYPES.LONG_TEXT].includes(
            currentType
          ) && (
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Answer Format
              </Label>
              <Select
                value={selectedTextPattern}
                onValueChange={handleTextPatternChange}
                disabled={readonly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Any Text" />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                {TEXT_FORMAT_HELP[selectedTextPattern]}
              </p>
            </div>
          )}

          {/* Question Options Preview/Editor */}
          {QUESTION_TYPE_IS_CHOICE.has(currentType) && (
            <div className="space-y-2">
              <AnimatePresence>
                {optionsForRender.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className="flex flex-col lg:flex-row lg:items-center gap-2 p-1.5 rounded-lg border border-border hover:border-ring/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 w-full min-w-0 lg:flex-1">
                      {/* Option Circle */}
                      <div
                        className={cn(
                          "w-4 h-4 border-2 border-muted-foreground/70 shrink-0",
                          question.type === "multiple_choice"
                            ? "rounded-sm"
                            : "rounded-full"
                        )}
                      />

                      {/* Option Text */}
                      <Input
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(optionIndex, e.target.value)
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                        className="flex-1 min-w-0 border-0 shadow-none focus-visible:ring-0 bg-transparent h-7 text-sm"
                        readOnly={readonly}
                      />

                      {/* Remove Option (mobile/tablet) */}
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => removeOption(optionIndex, e)}
                          disabled={optionsForRender.length <= 1}
                          className={cn(
                            "opacity-75 hover:opacity-100 transition-opacity text-muted-foreground/80 hover:text-red-600 p-1 h-auto shrink-0 lg:hidden",
                            optionsForRender.length <= 1 &&
                              "opacity-30 cursor-not-allowed"
                          )}
                          title={
                            optionsForRender.length <= 1
                              ? "Questions must have at least one option"
                              : "Remove this option"
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Logic Dropdown - Available in both modes (simplified when question-based) */}
                    {!readonly && onOptionLogicChange && (
                      <div className="opacity-100 transition-opacity w-full min-w-0 lg:w-auto lg:shrink-0">
                        <SimpleLogicDropdown
                          questionId={question.id}
                          currentSectionId={
                            sections.find((s) =>
                              s.questionIds?.includes(question.id)
                            )?.id
                          }
                          sections={sections}
                          questions={allQuestions}
                          isSectional={isSectional}
                          value={(() => {
                            const logic = getOptionLogic?.(question.id, option);
                            if (!logic || logic.type === "continue")
                              return null;
                            if (logic.type === "end")
                              return { action: "end_survey" };
                            if (logic.type === "jump") {
                              return {
                                action: "jump",
                                targetType: "section",
                                targetSectionId: logic.targetSectionId,
                              };
                            }
                            if (logic.type === "jump_to_question") {
                              return {
                                action: "jump",
                                targetType: "question",
                                targetQuestionId: logic.targetQuestionId,
                              };
                            }
                            return null;
                          })()}
                          onChange={(newLogic) => {
                            if (!newLogic) {
                              onOptionLogicChange(question.id, option, {
                                type: "continue",
                              });
                              return;
                            }
                            if (newLogic.action === "end_survey") {
                              onOptionLogicChange(question.id, option, {
                                type: "end",
                              });
                            } else if (
                              newLogic.action === "jump" &&
                              newLogic.targetType === "section"
                            ) {
                              onOptionLogicChange(question.id, option, {
                                type: "jump",
                                targetSectionId: newLogic.targetSectionId,
                              });
                            } else if (
                              newLogic.action === "jump" &&
                              newLogic.targetType === "question"
                            ) {
                              onOptionLogicChange(question.id, option, {
                                type: "jump_to_question",
                                targetQuestionId: newLogic.targetQuestionId,
                              });
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Remove Option (desktop, original placement) */}
                    {!readonly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => removeOption(optionIndex, e)}
                        disabled={optionsForRender.length <= 1}
                        className={cn(
                          "hidden lg:inline-flex opacity-75 hover:opacity-100 transition-opacity text-muted-foreground/80 hover:text-red-600 p-1 h-auto shrink-0",
                          optionsForRender.length <= 1 &&
                            "opacity-30 cursor-not-allowed"
                        )}
                        title={
                          optionsForRender.length <= 1
                            ? "Questions must have at least one option"
                            : "Remove this option"
                        }
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                {/* Add Option */}
                {!readonly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="w-full sm:w-36 justify-center sm:justify-start text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add option
                  </Button>
                )}

                {/* Allow Other Option Toggle - Only for Single/Multiple Choice AND Dropdown */}
                {!readonly &&
                  (currentType === QUESTION_TYPES.SINGLE_CHOICE ||
                    currentType === QUESTION_TYPES.MULTIPLE_CHOICE ||
                    currentType === QUESTION_TYPES.DROPDOWN) && (
                    <div className="flex items-center justify-between sm:justify-end border-border/60">
                      <Label
                        htmlFor={`allow-other-${question.id}`}
                        className="text-sm text-muted-foreground cursor-pointer mr-4"
                      >
                        Add Other
                      </Label>
                      <Switch
                        id={`allow-other-${question.id}`}
                        checked={question.allowOther || false}
                        onCheckedChange={(checked) => {
                          onUpdate({ allowOther: checked });
                        }}
                      />
                    </div>
                  )}
              </div>

              {currentType === QUESTION_TYPES.MULTIPLE_CHOICE && (
                <div className="mt-2 rounded-md border border-border bg-muted/20 p-2">
                  <Collapsible
                    open={isSelectionLimitsOpen}
                    onOpenChange={setIsSelectionLimitsOpen}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-5">
                          Selection Limits
                        </p>
                        <p className="text-xs text-muted-foreground leading-4">
                          Control how many options respondents can select.
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                        >
                          {isSelectionLimitsOpen ? "Hide" : "Edit"}
                          <ChevronDown
                            className={cn(
                              "ml-1.5 h-3.5 w-3.5 transition-transform",
                              isSelectionLimitsOpen && "rotate-180"
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`min-selections-${question.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Min selections
                          </Label>
                          <Input
                            id={`min-selections-${question.id}`}
                            type="number"
                            min="0"
                            value={question.validation?.minSelections ?? ""}
                            onChange={(e) =>
                              handleSelectionLimitChange(
                                "minSelections",
                                e.target.value
                              )
                            }
                            placeholder="No minimum"
                            readOnly={readonly}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`max-selections-${question.id}`}
                            className="text-xs text-muted-foreground"
                          >
                            Max selections
                          </Label>
                          <Input
                            id={`max-selections-${question.id}`}
                            type="number"
                            min="0"
                            value={question.validation?.maxSelections ?? ""}
                            onChange={(e) =>
                              handleSelectionLimitChange(
                                "maxSelections",
                                e.target.value
                              )
                            }
                            placeholder="No maximum"
                            readOnly={readonly}
                          />
                        </div>
                      </div>

                      <div className="mt-2 rounded-md border border-dashed border-border/80 bg-background/70 px-2 py-1.5">
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const minSelections =
                              question.validation?.minSelections;
                            const maxSelections =
                              question.validation?.maxSelections;

                            if (
                              Number.isFinite(minSelections) &&
                              Number.isFinite(maxSelections)
                            ) {
                              return `Respondents can select ${minSelections}-${maxSelections} options.`;
                            }
                            if (Number.isFinite(minSelections)) {
                              return `Respondents must select at least ${minSelections} option${minSelections === 1 ? "" : "s"}.`;
                            }
                            if (Number.isFinite(maxSelections)) {
                              return `Respondents can select up to ${maxSelections} option${maxSelections === 1 ? "" : "s"}.`;
                            }
                            return "No selection limit set. Respondents can choose any number of options.";
                          })()}
                        </p>
                        {Number.isFinite(question.validation?.minSelections) &&
                          Number.isFinite(question.validation?.maxSelections) &&
                          question.validation.minSelections >
                            question.validation.maxSelections && (
                            <p className="mt-1 text-xs text-destructive">
                              Min selections should not be greater than max
                              selections.
                            </p>
                          )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          )}

          {/* Rating Scale Preview */}
          {question.type === QUESTION_TYPES.RATING && (
            <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(question.ratingScale || 5, 5) },
                  (_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                    />
                  )
                )}
                {(question.ratingScale || 5) > 5 && (
                  <span className="text-sm text-muted-foreground ml-1">
                    ...
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">
                1-{question.ratingScale || 5} scale
              </span>
            </div>
          )}

          {/* Advanced Settings - Only show for question types that have settings */}
          {!readonly && currentType === QUESTION_TYPES.RATING && (
            <div className="border-t border-border/60 pt-3">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Advanced Settings
                </h4>
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg">
                  {/* Rating Scale Settings */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Rating Scale
                    </Label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`ratingScale-${question.id}`}
                          value={5}
                          checked={currentRatingScale === 5}
                          onChange={() => handleRatingScaleChange(5)}
                          className="text-primary"
                        />
                        <span className="text-sm font-medium">1-5 scale</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`ratingScale-${question.id}`}
                          value={10}
                          checked={currentRatingScale === 10}
                          onChange={() => handleRatingScaleChange(10)}
                          className="text-primary"
                        />
                        <span className="text-sm font-medium">1-10 scale</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Required toggle */}
          {!readonly && (
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <div>
                <Label
                  htmlFor={`required-${question.id}`}
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Required
                </Label>
                <p className="text-xs text-muted-foreground">
                  Respondents must answer this question
                </p>
              </div>
              <Switch
                id={`required-${question.id}`}
                checked={currentRequired}
                onCheckedChange={handleRequiredChange}
              />
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
