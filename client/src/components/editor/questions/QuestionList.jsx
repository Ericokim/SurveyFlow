import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion as Motion } from "framer-motion";
import { InlineQuestionCard } from "../InlineQuestionCard";
import { EmptyState } from "../../ui/empty-state";
import { Button } from "../../ui/button";
import { FileQuestion, Plus, EyeOff } from "lucide-react";
import { QuestionTypeSelector } from "../QuestionTypeSelector";
import { cn } from "../../../lib/utils";

/**
 * SortableQuestionCard - Individual sortable question wrapper
 */
function SortableQuestionCard({
  question,
  index,
  sectionIndex,
  questions,
  sections,
  sectionId,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestionToSection,
  onOptionLogicChange,
  getOptionLogic,
  visibilityCondition,
  onVisibilityChange,
  hiddenQuestions = new Set(),
  onToggleQuestionVisibility,
  expanded,
  onToggleExpanded,
  showTitleError,
  isHighlighted,
  isSectional,
  readonly,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <Motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging ? "opacity-40" : "",
        "relative",
        isHighlighted ? "ring-2 ring-primary/40 rounded-lg transition" : ""
      )}
    >
      <InlineQuestionCard
        question={question}
        index={index}
        sectionIndex={sectionIndex}
        onUpdate={onUpdateQuestion}
        onDelete={() => onDeleteQuestion?.(question.id)}
        onDuplicate={() => onDuplicateQuestion?.(question.id)}
        onMoveToSection={(targetSectionId) =>
          onMoveQuestionToSection?.(question.id, targetSectionId)
        }
        currentSectionId={sectionId}
        sections={sections}
        onOptionLogicChange={onOptionLogicChange}
        getOptionLogic={getOptionLogic}
        allQuestions={questions}
        visibilityCondition={visibilityCondition?.(question.id)}
        onVisibilityChange={(condition) =>
          onVisibilityChange?.(question.id, condition)
        }
        isHidden={hiddenQuestions.has(question.id)}
        onToggleVisibility={() => onToggleQuestionVisibility?.(question.id)}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        showTitleError={showTitleError}
        isSectional={isSectional}
        readonly={readonly}
        dragHandleProps={readonly ? {} : { ...attributes, ...listeners }}
        isDragging={isDragging}
      />

      {/* Visual Drag Indicator */}
      {isDragging && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 pointer-events-none" />
      )}

      {/* Highlight Indicator */}
      {isHighlighted && (
        <div className="absolute inset-0 rounded-xl bg-muted/50 pointer-events-none animate-pulse" />
      )}
    </Motion.div>
  );
}

/**
 * QuestionList
 * Enhanced with visual drag-and-drop reordering within sections
 */
export function QuestionList({
  questions = [],
  sectionId,
  sections = [],
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestionToSection,
  onAddQuestion,
  onReorderQuestions, // New prop for handling question reordering
  onOptionLogicChange,
  getOptionLogic,
  visibilityCondition,
  onVisibilityChange,
  hiddenQuestions = new Set(),
  onToggleQuestionVisibility,
  onUnhideAllInSection,
  expandedStates = {}, // Parent-controlled expansion state
  onToggleExpanded, // Parent-controlled expansion handler
  missingTitleIds = [],
  highlightedQuestionId = null,
  readonly = false,
  isSectional = true,
  sectionIndex = 0, // For question numbering
}) {
  // Track active drag item for overlay
  const [activeId, setActiveId] = useState(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter and sort questions for this section
  const section = sections.find((s) => s.id === sectionId);
  const sectionQuestions = questions
    .filter((q) => section?.questionIds?.includes(q.id))
    .sort((a, b) => {
      const aIndex = section?.questionIds?.indexOf(a.id) ?? 0;
      const bIndex = section?.questionIds?.indexOf(b.id) ?? 0;
      return aIndex - bIndex;
    });

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag end for question reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id && over?.id) {
      const oldIndex = sectionQuestions.findIndex(
        (question) => question.id === active.id
      );
      const newIndex = sectionQuestions.findIndex(
        (question) => question.id === over.id
      );

      const reorderedQuestions = arrayMove(
        sectionQuestions,
        oldIndex,
        newIndex
      );

      // Update question order within the section
      const newQuestionIds = reorderedQuestions.map((q) => q.id);

      // Call parent handler to update section's questionIds order
      onReorderQuestions?.(sectionId, newQuestionIds);
    }

    setActiveId(null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Find active question for overlay
  const activeQuestion = activeId
    ? sectionQuestions.find((q) => q.id === activeId)
    : null;

  if (sectionQuestions.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          icon={FileQuestion}
          title="No questions yet"
          description="Add your first question to this section"
          action={
            !readonly && (
              <QuestionTypeSelector
                onSelect={(type) => onAddQuestion?.(type, sectionId)}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                }
              />
            )
          }
        />
      </div>
    );
  }

  const visibleQuestions = sectionQuestions.filter(
    (q) => !hiddenQuestions.has(q.id)
  );
  const hiddenCount = sectionQuestions.filter((q) =>
    hiddenQuestions.has(q.id)
  ).length;

  return (
    <div className="space-y-1 overflow-x-hidden">
      {hiddenCount > 0 && (
        <div className="flex items-center gap-3 text-xs text-amber-700">
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
            <EyeOff className="w-3 h-3" />
            {hiddenCount} hidden
          </span>
          {!readonly && (
            <Button
              size="xs"
              variant="ghost"
              className="px-2 h-7"
              onClick={() => onUnhideAllInSection?.(sectionId)}
            >
              Unhide all
            </Button>
          )}
        </div>
      )}
      {/* Drag and Drop Context for Questions */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        disabled={readonly}
      >
        <SortableContext
          items={visibleQuestions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {visibleQuestions.map((question, index) => {
              return (
                <React.Fragment key={question.id}>
                  <SortableQuestionCard
                    question={question}
                    index={index}
                    sectionIndex={sectionIndex}
                    questions={questions}
                    sections={sections}
                    sectionId={sectionId}
                    onUpdateQuestion={(updates) =>
                      onUpdateQuestion(question.id, updates)
                    }
                    onDeleteQuestion={onDeleteQuestion}
                    onDuplicateQuestion={onDuplicateQuestion}
                    onMoveQuestionToSection={onMoveQuestionToSection}
                    onOptionLogicChange={onOptionLogicChange}
                    getOptionLogic={getOptionLogic}
                    visibilityCondition={visibilityCondition}
                    onVisibilityChange={onVisibilityChange}
                    hiddenQuestions={hiddenQuestions}
                    onToggleQuestionVisibility={onToggleQuestionVisibility}
                    expanded={expandedStates[question.id] ?? false}
                    onToggleExpanded={() =>
                      onToggleExpanded?.(
                        question.id,
                        !(expandedStates[question.id] ?? false)
                      )
                    }
                    showTitleError={missingTitleIds.includes(question.id)}
                    isHighlighted={highlightedQuestionId === question.id}
                    readonly={readonly}
                    isSectional={isSectional}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag Overlay - Shows dragged question following cursor */}
        <DragOverlay>
          {activeQuestion ? (
            <div className="opacity-90">
              <InlineQuestionCard
                question={activeQuestion}
                index={sectionQuestions.findIndex(
                  (q) => q.id === activeQuestion.id
                )}
                expanded={false}
                onToggleExpanded={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                sections={sections}
                onOptionLogicChange={() => {}}
                getOptionLogic={() => null}
                allQuestions={questions}
                visibilityCondition={null}
                onVisibilityChange={() => {}}
                isHidden={false}
                onToggleVisibility={() => {}}
                isSectional={isSectional}
                readonly={true}
                isDragging={true}
                dragHandleProps={{}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
