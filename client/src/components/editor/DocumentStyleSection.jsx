import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  FileText,
  X,
  Clock,
  Star,
  Zap,
  Loader2,
  ChevronsDownUp,
  ChevronsUpDown,
  FileQuestion,
  Merge,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "../../lib/utils";
import { getVisibleSectionIds } from "../../lib/utils/logicEngine";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_IS_CHOICE,
} from "../../lib/constants/questionTypes";

/**
 * SectionPreview Component
 * Rich preview of section contents when collapsed
 */
function SectionPreview({
  section,
  questions,
  isHidden,
  hasSectionJump = false,
}) {
  const questionCount = questions.length;

  // Calculate estimated completion time (rough estimates)
  const estimatedMinutes = Math.max(
    1,
    Math.ceil(
      questions.reduce((time, q) => {
        switch (q.type) {
          case "long_text":
            return time + 1.5; // Longer to think and type
          case "multiple_choice":
            return time + 0.8; // Need to read all options
          case "rating":
            return time + 0.5; // Quick to rate
          case "date":
            return time + 0.7; // Need to think about date
          case "short_text":
            return time + 0.8; // Quick typing
          case "single_choice":
            return time + 0.6; // Quick selection
          case "dropdown":
            return time + 0.7; // Similar to single choice
          default:
            return time + 0.6;
        }
      }, 0)
    )
  );

  // Analyze question types
  const questionTypes = questions.reduce((types, q) => {
    types[q.type] = (types[q.type] || 0) + 1;
    return types;
  }, {});

  const hasLogic =
    hasSectionJump || questions.some((q) => q.logic || q.visibilityCondition);
  const requiredCount = questions.filter((q) => q.required).length;
  const choiceQuestions = questions.filter((q) =>
    QUESTION_TYPE_IS_CHOICE.has(q.type)
  );

  // Get most common question type
  const mostCommonType = Object.entries(questionTypes).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-2 space-y-1.5"
    >
      {/* Quick Stats */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-muted-foreground/80" />
          <span className="text-muted-foreground">
            {questionCount} question{questionCount !== 1 ? "s" : ""}
          </span>
        </div>

        {requiredCount > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" />
            <span className="text-amber-700">{requiredCount} required</span>
          </div>
        )}

        {hasLogic && (
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-primary">Logic</span>
          </div>
        )}

        {isHidden && (
          <div className="flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-amber-500" />
            <span className="text-amber-700">Hidden</span>
          </div>
        )}
      </div>

      {/* Question Type Summary */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(questionTypes).map(([type, count]) => (
          <Badge
            key={type}
            variant="secondary"
            className="text-xs px-2 py-0 bg-accent/60 text-muted-foreground"
          >
            {count}x {QUESTION_TYPE_LABELS[type] || type}
          </Badge>
        ))}
      </div>

      {/* Section Description Preview */}
      {section.description && (
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {section.description}
        </p>
      )}

      {/* Progress Indicator */}
      {/* <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              questionCount > 0 ? "bg-indigo-400" : "bg-slate-300"
            )}
            style={{
              width: questionCount > 0 ? "100%" : "0%",
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground">Ready</span>
      </div> */}
    </motion.div>
  );
}

/**
 * DocumentStyleSection Component
 * Production-grade CMS-style collapsible section that contains questions
 * Google Forms-like experience with clean design and intuitive interactions
 */
export function DocumentStyleSection({
  section,
  questions = [],
  sections = [], // Add sections array for statistics
  visibilityRules = [],
  sectionIndex = 0,
  sectionJumpTargetId = "__continue__",
  sectionJumpMap = {},
  sectionJumpSource = null,
  hasConditionalSectionVisibility = false,
  onSectionJumpChange,
  isExpanded = true,
  isHidden = false,
  onToggleExpand,
  onUpdateSection,
  onSaveSection, // Section save handler
  onCancelSection, // Section cancel handler
  isDirty = false,
  isSaving = false,
  onDeleteSection,
  onDuplicateSection,
  onMergeSectionWithAbove,
  onToggleVisibility,
  onLogicClick,
  onToggleSectionalMode, // NEW: Toggle between sectional and non-sectional mode
  onAddQuestion, // Function that receives (questionType, sectionId)
  expandedSections = {}, // New: Object of question expanded states
  onToggleQuestionExpanded, // New: Function to toggle question expansion
  isSectional = true, // Whether to show section title (false = implicit mode)
  children, // QuestionList component
  readonly = false,
  dragHandleProps,
  isDragging = false, // Visual feedback during drag
}) {
  // Manual save pattern
  const [titleDraft, setTitleDraft] = useState(section.title || "");
  const [descriptionDraft, setDescriptionDraft] = useState(
    section.description || ""
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [isEditingSectionJump, setIsEditingSectionJump] = useState(false);
  const [isSectionJumpOpen, setIsSectionJumpOpen] = useState(false);
  const descriptionRef = useRef(null);

  const sectionQuestions = questions.filter((q) =>
    section.questionIds?.includes(q.id)
  );

  const questionCount = sectionQuestions.length;
  const sortedSections = [...(sections || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const currentSectionIndex = Math.max(
    0,
    sortedSections.findIndex((s) => s.id === section.id)
  );
  const visibleSectionIds = useMemo(
    () => getVisibleSectionIds(sortedSections, visibilityRules || [], {}),
    [sortedSections, visibilityRules]
  );
  const defaultNextSection =
    sortedSections
      .slice(currentSectionIndex + 1)
      .find((candidate) => visibleSectionIds.has(candidate.id)) ||
    sortedSections[currentSectionIndex + 1] ||
    null;
  const selectedJumpSection =
    (sections || []).find((s) => s.id === sectionJumpTargetId) || null;
  const isEndTarget = sectionJumpTargetId === "__end__";
  const isImplicitEndByFlow = !defaultNextSection;
  const hasSectionJump = Boolean(selectedJumpSection);
  const continueOptionLabel = hasConditionalSectionVisibility
    ? "Continue to next visible section (based on logic)"
    : defaultNextSection
      ? `Continue to Section ${currentSectionIndex + 2}: ${defaultNextSection.title || "Untitled section"}`
      : "Continue: End survey";
  const continueDisplayLabel = hasConditionalSectionVisibility
    ? "Continue to next visible section (based on logic)"
    : defaultNextSection
      ? `Continue to Section ${currentSectionIndex + 2}: ${defaultNextSection.title || "Untitled section"}`
      : "End survey";
  const normalizedSectionJumpValue = sectionJumpTargetId || "__continue__";
  const currentJumpLabel = isEndTarget
    ? "End survey"
    : selectedJumpSection
      ? `Section ${Math.max(1, sections.findIndex((s) => s.id === selectedJumpSection.id) + 1)}: ${selectedJumpSection.title || "Untitled section"}`
      : continueDisplayLabel;
  const selectedJumpIndex = selectedJumpSection
    ? Math.max(
        0,
        sections.findIndex((s) => s.id === selectedJumpSection.id)
      )
    : -1;
  const isBackwardSectionJump =
    selectedJumpSection && selectedJumpIndex !== -1
      ? selectedJumpIndex < currentSectionIndex
      : false;
  const selectedJumpNextHopId = selectedJumpSection
    ? sectionJumpMap?.[selectedJumpSection.id] || null
    : null;
  const selectedJumpNextHopSection = selectedJumpNextHopId
    ? sections.find((s) => s.id === selectedJumpNextHopId) || null
    : null;
  const effectivePathHint = selectedJumpSection
    ? selectedJumpNextHopId === "__end__"
      ? `Effective path: Section ${currentSectionIndex + 1} -> Section ${selectedJumpIndex + 1} -> End survey`
      : selectedJumpNextHopSection
        ? `Effective path: Section ${currentSectionIndex + 1} -> Section ${selectedJumpIndex + 1} -> Section ${Math.max(1, sections.findIndex((s) => s.id === selectedJumpNextHopSection.id) + 1)}`
        : null
    : null;
  const backwardJumpEndWarning =
    isBackwardSectionJump && selectedJumpNextHopId === "__end__"
      ? "Warning: this backward jump lands on a section configured to end the survey."
      : null;
  const hasConditionalBranching =
    sectionJumpSource === "derived" ||
    sectionJumpSource === "explicit_with_conditional";

  // Sync drafts with props when section changes externally
  useEffect(() => {
    setTitleDraft(section.title || "");
    setDescriptionDraft(section.description || "");
    setIsEditingSectionJump(false);
    setIsSectionJumpOpen(false);
  }, [section.id, section.title, section.description]);

  // Unified handlers for both title and description
  const handleTitleChange = (e) => {
    const nextTitle = e.target.value;
    setTitleDraft(nextTitle);
    onUpdateSection?.(section.id, { title: nextTitle });
  };

  const handleDescriptionChange = (e) => {
    const nextDescription = e.target.value;
    setDescriptionDraft(nextDescription);
    onUpdateSection?.(section.id, { description: nextDescription });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4"
    >
      <Card
        data-section-id={section.id}
        className={cn(
          "group transition-all duration-200 border rounded-xl overflow-hidden gap-0 py-0",
          isHidden && "opacity-50 bg-muted/40",
          isExpanded && "shadow-none border-border",
          !isExpanded && "border-border",
          !readonly && "hover:border-ring/40",
          isDragging &&
            "opacity-50 shadow-2xl ring-4 ring-primary/30 scale-105 rotate-1 border-primary/60 cursor-grabbing"
        )}
      >
        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          {/* Section Header - Compact Single Row Layout */}
          <CardHeader
            className={cn(
              "py-2 !pb-2 px-4 bg-muted/40",
              isExpanded ? "border-b border-border/60" : "border-b-0"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Drag Handle */}
              {!readonly && (
                <div
                  {...dragHandleProps}
                  className={cn(
                    "cursor-grab active:cursor-grabbing transition-all duration-200 shrink-0 rounded p-1 -ml-1",
                    isDragging
                      ? "text-primary bg-primary/10 scale-110"
                      : "text-muted-foreground/80 hover:text-primary hover:bg-accent/60"
                  )}
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              )}

              {/* Expand/Collapse Trigger */}

              {isSectional && (
                <div className="hidden sm:flex p-1.5 bg-primary/10 rounded-lg shrink-0">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
              )}

              {isSectional && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-primary/80 hover:text-foreground hover:bg-primary/10"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </TooltipTrigger>

                  <TooltipContent side="top">
                    {isExpanded
                      ? "Collapse this Section"
                      : "Expand this Section"}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Section Title - Always visible input */}
              {isSectional && (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="h-6 px-2 text-[11px] sm:text-xs shrink-0 bg-accent/60 text-foreground"
                  >
                    <span className="sm:hidden">
                      S{currentSectionIndex + 1}
                    </span>
                    <span className="hidden sm:inline">
                      Section {currentSectionIndex + 1}
                    </span>
                  </Badge>
                  <Input
                    value={titleDraft}
                    onChange={handleTitleChange}
                    className="!border-transparent bg-transparent shadow-none font-medium text-foreground px-1 sm:px-2 h-auto text-sm sm:text-base focus-visible:!border-ring focus-visible:ring-0 truncate"
                    placeholder="Section title..."
                    disabled={readonly}
                  />
                </div>
              )}

              {/* Badges */}
              {(section.required ||
                section.randomizeQuestions ||
                section.pageBreak) && (
                <div className="order-3 basis-full flex flex-wrap items-center gap-1 pb-1">
                  {section.required && (
                    <Badge className="text-xs h-6 px-2 bg-destructive/15 text-destructive border-destructive/35 hover:bg-destructive/15">
                      Required
                    </Badge>
                  )}
                  {section.randomizeQuestions && (
                    <Badge
                      variant="secondary"
                      className="text-xs h-6 px-2 bg-accent/60 text-foreground"
                    >
                      Randomized
                    </Badge>
                  )}
                  {section.pageBreak && (
                    <Badge
                      variant="secondary"
                      className="text-xs h-6 px-2 bg-accent/60 text-foreground"
                    >
                      Page break
                    </Badge>
                  )}
                  {hasSectionJump && (
                    <Badge
                      variant="secondary"
                      className="text-xs h-6 px-2 bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      Section jump
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons - Always visible with tooltips */}
              {!readonly && (
                <TooltipProvider>
                  <div className="order-2 basis-full flex items-center justify-start gap-2 sm:basis-auto sm:ml-auto sm:justify-start">
                    <QuestionTypeSelector
                      onSelect={(questionType) =>
                        onAddQuestion?.(questionType, section.id)
                      }
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 min-w-12 px-3 gap-1 border-primary/30 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
                        >
                          <Plus
                            className="sm:mr-2 size-4 text-green-700"
                            aria-hidden="true"
                          />
                          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Add Question
                          </span>
                        </Button>
                      }
                    />

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Collapse/Expand All Questions */}

                      {isSectional && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  !onToggleQuestionExpanded ||
                                  sectionQuestions.length === 0
                                )
                                  return;

                                // Check if all questions in THIS section are expanded
                                const allExpanded = sectionQuestions.every(
                                  (q) => expandedSections?.[q.id] ?? true
                                );

                                // Toggle all questions in THIS section only
                                sectionQuestions.forEach((q) => {
                                  onToggleQuestionExpanded(q.id, !allExpanded);
                                });
                              }}
                              className="h-8 w-8 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                            >
                              {sectionQuestions.every(
                                (q) => expandedSections?.[q.id] ?? true
                              ) ? (
                                <ChevronsDownUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4 text-blue-500" />
                              )}
                            </Button>
                          </TooltipTrigger>

                          <TooltipContent>
                            <p>
                              {sectionQuestions.every(
                                (q) => expandedSections?.[q.id] ?? true
                              )
                                ? "Collapse all questions"
                                : "Expand all questions"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* Delete Section - only in sectional mode */}
                      {isSectional && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteSection?.(section.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/15"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete section</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* More Actions */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-foreground/75 hover:text-foreground hover:bg-accent"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {isSectional && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onDuplicateSection?.(section.id)
                                    }
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate section
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onMergeSectionWithAbove?.(section.id)
                                    }
                                    disabled={section.order === 0}
                                  >
                                    <Merge className="w-4 h-4 mr-2" />
                                    Merge with section above
                                  </DropdownMenuItem>
                                </>
                              )}
                              {onToggleSectionalMode && (
                                <>
                                  {isSectional && <DropdownMenuSeparator />}
                                  <DropdownMenuItem
                                    onClick={() => onToggleSectionalMode()}
                                  >
                                    <FileQuestion className="w-4 h-4 mr-2" />
                                    {isSectional
                                      ? "Convert to questions"
                                      : "Convert to sections"}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isSectional ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onDeleteSection?.(section.id)
                                    }
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete section
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onDeleteSection?.(section.id)
                                    }
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete questions
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>More options</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </TooltipProvider>
              )}
            </div>

            {/* Collapsed Preview */}
            {!isExpanded && questionCount > 0 && (
              <div
                className="mt-2 pl-10"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <SectionPreview
                  section={section}
                  questions={sectionQuestions}
                  isHidden={isHidden}
                  hasSectionJump={hasSectionJump}
                />
              </div>
            )}
          </CardHeader>

          {/* Section Content */}
          <CollapsibleContent>
            <CardContent className="pt-0 px-3 sm:px-4 pb-2 sm:pb-3">
              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && !readonly && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 sm:mb-6 p-4 sm:p-6 bg-linear-to-br from-muted/60 to-muted/30 border-2 border-border rounded-lg sm:rounded-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Settings className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">
                            Section Settings
                          </h4>
                          <p className="hidden sm:block text-xs text-muted-foreground">
                            Configure behavior and appearance
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettings(false)}
                        className="h-11 w-11 sm:h-8 sm:w-8 p-0 text-muted-foreground/80 hover:text-muted-foreground touch-manipulation self-start sm:self-center"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Section Information */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-medium text-foreground mb-2 block">
                            Section Information
                          </Label>
                          <div className="space-y-3">
                            {/* Section Description */}
                            <div className="p-3 bg-card border border-border rounded-lg">
                              <Label className="text-sm font-medium text-foreground mb-2 block">
                                Section Description
                              </Label>
                              <Input
                                ref={descriptionRef}
                                value={descriptionDraft}
                                onChange={handleDescriptionChange}
                                placeholder="Add a description for this section (optional)..."
                                className="text-sm"
                              />
                            </div>

                            {/* Required Toggle */}
                            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Required Section
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Force respondents to complete this section
                                </p>
                              </div>
                              <Switch
                                checked={section.required || false}
                                onCheckedChange={(checked) =>
                                  onUpdateSection(section.id, {
                                    required: checked,
                                  })
                                }
                              />
                            </div>

                            {/* Randomize Questions */}
                            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Randomize Questions
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Show questions in random order
                                </p>
                              </div>
                              <Switch
                                checked={section.randomizeQuestions || false}
                                onCheckedChange={(checked) =>
                                  onUpdateSection(section.id, {
                                    randomizeQuestions: checked,
                                  })
                                }
                              />
                            </div>

                            {/* Section Break */}
                            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Section Break
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Start this section on a new page
                                </p>
                              </div>
                              <Switch
                                checked={section.pageBreak || false}
                                onCheckedChange={(checked) =>
                                  onUpdateSection(section.id, {
                                    pageBreak: checked,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Visibility Settings */}
                      </div>

                      {/* Section Actions */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-medium text-foreground mb-2 block">
                            Section Actions
                          </Label>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDuplicateSection?.(section.id)}
                              className="w-full justify-start bg-card border-border hover:bg-muted/40"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate this section
                            </Button>
                            {sections.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Are you sure you want to delete this section? This action cannot be undone."
                                    )
                                  ) {
                                    onDeleteSection?.(section.id);
                                  }
                                }}
                                className="w-full justify-start bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete section
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Section Stats */}
                        <div>
                          <Label className="text-xs font-medium text-foreground mb-2 block">
                            Section Statistics
                          </Label>
                          <div className="p-3 bg-card border border-border rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div>
                                <div className="text-lg font-semibold text-foreground">
                                  {questionCount}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Question{questionCount !== 1 ? "s" : ""}
                                </div>
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-foreground">
                                  {sections.findIndex(
                                    (s) => s.id === section.id
                                  ) + 1}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Position
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-border/60">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    isHidden ? "bg-amber-400" : "bg-emerald-400"
                                  )}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {isHidden
                                    ? "Hidden from respondents"
                                    : "Visible to respondents"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Questions Container */}
              {questionCount > 0 ? (
                <div className="space-y-3 mb-4">
                  {children}

                  {/* Add Another Question */}
                  {!readonly && (
                    <div className="pt-3 pb-1">
                      <QuestionTypeSelector
                        onSelect={(questionType) =>
                          onAddQuestion?.(questionType, section.id)
                        }
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        }
                      />
                    </div>
                  )}

                  {isExpanded && isSectional && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="shrink-0">
                        After section {sectionIndex + 1}
                      </span>
                      <span className="shrink-0">Go to</span>
                      {readonly || !isEditingSectionJump ? (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex h-8 w-full sm:w-auto sm:min-w-[260px] sm:max-w-[460px] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm",
                            readonly
                              ? "cursor-default text-muted-foreground"
                              : "cursor-pointer text-foreground hover:border-primary/40"
                          )}
                          onClick={() => {
                            if (!readonly) {
                              setIsEditingSectionJump(true);
                              setIsSectionJumpOpen(true);
                            }
                          }}
                          disabled={readonly}
                          title={currentJumpLabel}
                        >
                          <span className="truncate">{currentJumpLabel}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ) : (
                        <Select
                          value={normalizedSectionJumpValue}
                          open={isSectionJumpOpen}
                          onValueChange={(value) => {
                            onSectionJumpChange?.(section.id, value);
                            setIsEditingSectionJump(false);
                            setIsSectionJumpOpen(false);
                          }}
                          onOpenChange={(open) => {
                            setIsSectionJumpOpen(open);
                            if (!open) setIsEditingSectionJump(false);
                          }}
                          disabled={readonly}
                        >
                          <SelectTrigger className="h-8 w-full sm:w-auto sm:min-w-[260px] sm:max-w-[380px] bg-background">
                            <SelectValue placeholder="Continue to next section" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__continue__">
                              {continueOptionLabel}
                            </SelectItem>
                            <SelectItem value="__end__">End survey</SelectItem>
                            {sections
                              .filter(
                                (targetSection) =>
                                  targetSection.id !== section.id
                              )
                              .map((targetSection) => {
                                const targetIndex = Math.max(
                                  0,
                                  sections.findIndex(
                                    (s) => s.id === targetSection.id
                                  )
                                );
                                return (
                                  <SelectItem
                                    key={targetSection.id}
                                    value={targetSection.id}
                                  >
                                    Section {targetIndex + 1}:{" "}
                                    {targetSection.title || "Untitled section"}
                                  </SelectItem>
                                );
                              })}
                          </SelectContent>
                        </Select>
                      )}

                      {/* {(hasConditionalBranching ||
                        (!selectedJumpSection &&
                          hasConditionalSectionVisibility)) && (
                          <span className="text-xs text-muted-foreground">
                            This section jump is a fallback; option logic can override it.
                          </span>
                        )} */}
                      {/* {effectivePathHint && (
                        <span className="text-xs text-muted-foreground">
                          {effectivePathHint}
                        </span>
                      )} */}
                      {/* {backwardJumpEndWarning && (
                        <span className="text-xs text-amber-600">
                          {backwardJumpEndWarning}
                        </span>
                      )} */}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-border rounded-lg  bg-muted/30 mt-6 mb-3 ">
                  <div className="max-w-sm mx-auto">
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      No questions yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start building your section by adding the first question
                    </p>
                    {!readonly && (
                      <QuestionTypeSelector
                        onSelect={(questionType) =>
                          onAddQuestion?.(questionType, section.id)
                        }
                        trigger={
                          <Button size="sm" className="">
                            <Plus className="h-4 w-4 mr-1" />
                            Add first question
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Section-Scoped Save/Cancel Controls */}
              {/* {!readonly && (isDirty || isSaving) && (      )} */}
              {/* <div className="mt-6 pt-4 border-t border-border flex items-end justify-end">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancelSection}
                    disabled={isLocalSaving || isSaving}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      setIsLocalSaving(true);

                      await new Promise((resolve) => setTimeout(resolve, 50));
                      try {
                        await onSaveSection?.();
                      } catch (error) {
                        console.error("Save failed:", error);
                      } finally {
                        setIsLocalSaving(false);
                      }
                    }}
                    disabled={isLocalSaving || isSaving}
                    className="px-4"
                  >
                    {isLocalSaving || isSaving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div> */}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}
