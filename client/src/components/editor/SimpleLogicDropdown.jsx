import { AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  ArrowRight,
  ExternalLink,
  XCircle,
  Zap,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

/**
 * SimpleLogicDropdown Component
 *
 * Production-grade navigation logic control for survey answer choices.
 * Intuitive interface for setting branching behavior without complexity.
 */
export function SimpleLogicDropdown({
  questionId,
  currentSectionId,
  sections = [],
  questions = [],
  isSectional = true,
  value = null,
  onChange,
  disabled = false,
}) {
  const isQuestionMode = !isSectional;
  const actionOptions = ["continue", "jump", "end_survey"];
  const rawAction =
    value?.action === "jump_to_section" || value?.action === "jump_to_question"
      ? "jump"
      : value?.action || "continue";
  const currentAction = actionOptions.includes(rawAction)
    ? rawAction
    : "continue";

  const rawTargetType = isQuestionMode
    ? "question"
    : value?.targetType ||
      (value?.action === "jump_to_question"
        ? "question"
        : value?.targetQuestionId
          ? "question"
          : "section");
  const currentTargetType = ["section", "question"].includes(rawTargetType)
    ? rawTargetType
    : isQuestionMode
      ? "question"
      : "section";

  const handleActionChange = (newAction) => {
    if (newAction === "continue") {
      onChange(null);
      return;
    }

    if (newAction === "jump") {
      const defaultTargetType = isQuestionMode
        ? "question"
        : availableSections.length > 0
          ? "section"
          : "question";
      const firstQuestion = availableJumpQuestions[0] || null;
      const firstSection = availableSections[0] || null;
      onChange({
        action: "jump",
        targetType: defaultTargetType,
        targetSectionId:
          defaultTargetType === "section" ? firstSection?.id || null : null,
        targetQuestionId:
          defaultTargetType === "question" ? firstQuestion?.id || null : null,
      });
      return;
    }

    if (newAction === "end_survey") {
      onChange({ action: "end_survey" });
    }
  };

  const handleJumpTargetChange = (encodedTarget) => {
    if (!encodedTarget) return;

    const [targetType, targetId] = encodedTarget.split(":");
    if (!targetType || !targetId) return;

    onChange({
      action: "jump",
      targetType,
      targetSectionId: targetType === "section" ? targetId : null,
      targetQuestionId: targetType === "question" ? targetId : null,
    });
  };

  const handleJumpSectionChange = (sectionId) => {
    if (!sectionId) return;

    if (sectionId === currentSectionId) {
      const firstQuestionInSection = availableJumpQuestions.find((question) => {
        const questionSectionId =
          sectionByQuestionId.get(question.id) || question.sectionId || "__none__";
        return questionSectionId === sectionId;
      });

      onChange({
        action: "jump",
        targetType: "question",
        targetSectionId: sectionId,
        targetQuestionId: firstQuestionInSection?.id || null,
      });
      return;
    }

    onChange({
      action: "jump",
      targetType: "section",
      targetSectionId: sectionId,
      targetQuestionId: null,
    });
  };

  const handleJumpDestinationChange = (encodedDestination) => {
    if (!encodedDestination) return;

    if (encodedDestination === "top") {
      onChange({
        action: "jump",
        targetType: "section",
        targetSectionId: selectedJumpSectionId,
        targetQuestionId: null,
      });
      return;
    }

    if (encodedDestination.startsWith("question:")) {
      const [, targetQuestionId] = encodedDestination.split(":");
      onChange({
        action: "jump",
        targetType: "question",
        targetSectionId: selectedJumpSectionId,
        targetQuestionId,
      });
    }
  };

  const availableSections = sections.filter((s) => s.id !== currentSectionId);

  const questionById = new Map((questions || []).map((q) => [q.id, q]));
  const sectionByQuestionId = new Map();
  (sections || []).forEach((section) => {
    (section.questionIds || []).forEach((id) => {
      sectionByQuestionId.set(id, section.id);
    });
  });

  const orderedQuestions = (() => {
    const sectionSorted = [...(sections || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const ordered = [];
    sectionSorted.forEach((section) => {
      (section.questionIds || []).forEach((id) => {
        const question = questionById.get(id);
        if (question) ordered.push(question);
      });
    });
    const includedIds = new Set(ordered.map((q) => q.id));
    const remaining = (questions || []).filter((q) => !includedIds.has(q.id));
    return [...ordered, ...remaining];
  })();

  const currentQuestionIndex = orderedQuestions.findIndex(
    (q) => q.id === questionId
  );
  const availableJumpQuestions = orderedQuestions.filter(
    (q, idx) => q.id !== questionId && idx > currentQuestionIndex
  );
  const jumpQuestionsBySection = availableJumpQuestions.reduce((acc, q) => {
    const sectionId =
      sectionByQuestionId.get(q.id) || q.sectionId || "__none__";
    if (!acc.has(sectionId)) acc.set(sectionId, []);
    acc.get(sectionId).push(q);
    return acc;
  }, new Map());
  const sectionHasJumpQuestions = (sectionId) =>
    availableJumpQuestions.some((question) => {
      const questionSectionId =
        sectionByQuestionId.get(question.id) || question.sectionId || "__none__";
      return questionSectionId === sectionId;
    });
  const jumpSectionOptions = sections.filter(
    (section) =>
      section.id !== currentSectionId || sectionHasJumpQuestions(section.id)
  );

  const getActionConfig = () => {
    switch (currentAction) {
      case "continue":
        return {
          icon: ArrowRight,
          label: "Continue",
          description: "Proceed to next question",
          color: "text-slate-600",
          bgColor: "bg-slate-50",
        };
      case "jump":
        return {
          icon: ExternalLink,
          label: "Jump to...",
          description: "Skip to a section or question",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        };
      case "end_survey":
        return {
          icon: XCircle,
          label: "End survey",
          description: "Complete survey early",
          color: "text-red-600",
          bgColor: "bg-red-50",
        };
      default:
        return {
          icon: ArrowRight,
          label: "Continue",
          description: "Default behavior",
          color: "text-slate-600",
          bgColor: "bg-slate-50",
        };
    }
  };

  const actionConfig = getActionConfig();
  const IconComponent = actionConfig.icon;
  const targetQuestionSectionId =
    sectionByQuestionId.get(value?.targetQuestionId) ||
    questions.find((q) => q.id === value?.targetQuestionId)?.sectionId ||
    null;
  const selectedJumpSectionId =
    currentTargetType === "question"
      ? targetQuestionSectionId
      : value?.targetSectionId;
  const fallbackJumpSectionId = jumpSectionOptions[0]?.id || null;
  const resolvedJumpSectionId = selectedJumpSectionId || fallbackJumpSectionId;
  const destinationQuestions = availableJumpQuestions.filter((question) => {
    const sectionId =
      sectionByQuestionId.get(question.id) || question.sectionId || "__none__";
    return sectionId === resolvedJumpSectionId;
  });

  const selectedJumpTargetValue =
    currentTargetType === "question"
      ? `question:${value?.targetQuestionId || ""}`
      : `section:${value?.targetSectionId || ""}`;

  return (
    <div className="flex flex-col lg:flex-row lg:flex-wrap items-start lg:items-center gap-2 w-full max-w-full overflow-hidden">
      {/* Logic indicator */}
      {currentAction !== "continue" && (
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
            actionConfig.bgColor,
            actionConfig.color
          )}
        >
          <Zap className="h-3 w-3" />
          <span>Logic</span>
        </div>
      )}

      {/* Main action dropdown */}
      <Select
        value={currentAction}
        onValueChange={handleActionChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-full lg:w-auto lg:min-w-[160px] lg:max-w-[200px] text-sm bg-white border-slate-300",
            currentAction !== "continue" && "border-indigo-300 bg-indigo-50"
          )}
        >
          <SelectValue>
            <span className="flex items-center gap-2">
              <IconComponent className="h-4 w-4" />
              <span>{actionConfig.label}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="continue">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="font-medium">Continue to next</div>
                <div className="text-xs text-slate-500">Default behavior</div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="jump">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Jump to...</div>
                <div className="text-xs text-slate-500">
                  Go to a section or question
                </div>
              </div>
            </div>
          </SelectItem>
          <SelectItem value="end_survey">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-red-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="font-medium">End survey</div>
                <div className="text-xs text-slate-500">
                  Complete survey early
                </div>
              </div>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Secondary selectors with animations */}
      <AnimatePresence mode="wait">
        {/* Jump target selector */}
        {currentAction === "jump" && (
          <div
            key="jump-selector"
            className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 w-full lg:w-auto min-w-0"
          >
            {!isQuestionMode &&
            (jumpSectionOptions.length > 0 ||
              availableJumpQuestions.length > 0) ? (
              <>
                <Select
                  value={resolvedJumpSectionId || ""}
                  onValueChange={handleJumpSectionChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 w-full lg:w-[220px] text-sm bg-white border-slate-300">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jumpSectionOptions.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                              <span className="truncate max-w-44">
                                {section.title || "Untitled Section"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-xs text-xs"
                          >
                            {section.title || "Untitled Section"}
                          </TooltipContent>
                        </Tooltip>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={
                    currentTargetType === "question"
                      ? `question:${value?.targetQuestionId || ""}`
                      : resolvedJumpSectionId === currentSectionId
                        ? ""
                        : "top"
                  }
                  onValueChange={handleJumpDestinationChange}
                  disabled={disabled || !resolvedJumpSectionId}
                >
                  <SelectTrigger className="h-9 w-full lg:w-[250px] text-sm bg-white border-slate-300">
                    <SelectValue placeholder="Top of section" />
                  </SelectTrigger>
                  <SelectContent>
                    {resolvedJumpSectionId !== currentSectionId && (
                      <SelectItem value="top">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                          <span>Top of section</span>
                        </div>
                      </SelectItem>
                    )}

                    {destinationQuestions.length > 0 && <SelectSeparator />}

                    {destinationQuestions.map((question) => {
                      const title =
                        question.title || question.text || "Untitled Question";
                      return (
                        <SelectItem
                          key={question.id}
                          value={`question:${question.id}`}
                        >
                          <Tooltip delayDuration={150}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                                <span className="truncate max-w-30 lg:max-w-45">
                                  {title}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-xs text-xs"
                            >
                              {title}
                            </TooltipContent>
                          </Tooltip>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </>
            ) : !isQuestionMode ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  No valid jump targets available
                </span>
              </div>
            ) : availableJumpQuestions.length > 0 ? (
              <Select
                value={selectedJumpTargetValue}
                onValueChange={handleJumpTargetChange}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 w-full lg:w-[240px] text-sm bg-white border-slate-300">
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent>
                  {[...jumpQuestionsBySection.entries()].map(
                    ([sectionId, sectionQuestions], groupIndex) => {
                      const sectionTitle =
                        sections.find((s) => s.id === sectionId)?.title ||
                        "General";
                      return (
                        <div key={`jump-group-${sectionId}`}>
                          {groupIndex > 0 && <SelectSeparator />}
                          <SelectGroup>
                            <SelectLabel>{sectionTitle}</SelectLabel>
                            {sectionQuestions.map((question) => {
                              const title =
                                question.title ||
                                question.text ||
                                "Untitled Question";
                              return (
                                <SelectItem
                                  key={question.id}
                                  value={`question:${question.id}`}
                                >
                                  <Tooltip delayDuration={150}>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                                        <span className="truncate max-w-30 lg:max-w-45">
                                          {title}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-xs text-xs"
                                    >
                                      {title}
                                    </TooltipContent>
                                  </Tooltip>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        </div>
                      );
                    }
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  No valid jump targets available
                </span>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
