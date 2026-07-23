import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { InlineQuestionCard } from "./InlineQuestionCard";
import { Button } from "../ui/button";
import { Plus, FileQuestion } from "lucide-react";
import {
  SimpleAddQuestionButton,
  SimpleAddQuestionCard,
} from "./SimpleAddQuestionButton";
import { cn } from "../../lib/utils";

/**
 * SortableQuestionCard - Individual sortable question wrapper
 */
function SortableQuestionCard({
  question,
  index,
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onOptionLogicChange,
  getOptionLogic,
  visibilityCondition,
  onVisibilityChange,
  isHidden,
  onToggleVisibility,
  expanded,
  onToggleExpanded,
  showTitleError,
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "z-50 opacity-75")}
    >
      <InlineQuestionCard
        question={question}
        index={index}
        onUpdate={(updates) => onUpdateQuestion(question.id, updates)}
        onDelete={() => onDeleteQuestion(question.id)}
        onDuplicate={() => onDuplicateQuestion(question.id)}
        sections={[]} // No sections in standalone mode
        onOptionLogicChange={onOptionLogicChange}
        getOptionLogic={getOptionLogic}
        allQuestions={questions}
        visibilityCondition={visibilityCondition?.(question.id)}
        onVisibilityChange={(condition) =>
          onVisibilityChange?.(question.id, condition)
        }
        isHidden={isHidden}
        onToggleVisibility={() => onToggleVisibility?.(question.id)}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        isSectional={false}
        readonly={readonly}
        dragHandleProps={readonly ? {} : { ...attributes, ...listeners }}
        isDragging={isDragging}
      />

      {/* Visual Drag Indicator */}
      {isDragging && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/20 pointer-events-none" />
      )}
    </div>
  );
}

/**
 * StandaloneQuestionList - Question list without sections
 * Simple flat list with drag-drop reordering
 */
export function StandaloneQuestionList({
  questions = [],
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onAddQuestion,
  onReorderQuestions,
  onOptionLogicChange,
  getOptionLogic,
  visibilityCondition,
  onVisibilityChange,
  onAddSection,
  onAddSectionFromTemplate,
  hiddenQuestions = new Set(),
  onToggleQuestionVisibility,
  expandedStates = {}, // Receive from parent
  onToggleExpanded, // Receive from parent
  missingTitleIds = [],
  readonly = false,
}) {
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

  // Sort questions by order
  const sortedQuestions = [...questions].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const visibleQuestions = sortedQuestions.filter(
    (q) => !hiddenQuestions.has(q.id)
  );
  const hiddenList = sortedQuestions.filter((q) => hiddenQuestions.has(q.id));

  // Handle drag end for question reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedQuestions.findIndex((q) => q.id === active.id);
      const newIndex = sortedQuestions.findIndex((q) => q.id === over.id);

      const reorderedQuestions = arrayMove(sortedQuestions, oldIndex, newIndex);

      // Update order values and call parent handler
      const updatedQuestions = reorderedQuestions.map((question, index) => ({
        ...question,
        order: index,
      }));

      onReorderQuestions?.(updatedQuestions);
    }
  };

  if (sortedQuestions.length === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {!readonly && <SimpleAddQuestionCard onAddQuestion={onAddQuestion} />}
          {readonly && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <FileQuestion className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No questions yet
              </h3>
              <p className="text-slate-600 text-sm">
                Questions will appear here once they are added.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Question List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Questions</h3>
          <p className="text-xs text-slate-600">
            {sortedQuestions.length} question
            {sortedQuestions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        disabled={readonly}
      >
        <SortableContext
          items={sortedQuestions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {visibleQuestions.map((question, index) => (
              <React.Fragment key={question.id}>
                <SortableQuestionCard
                  question={question}
                  index={index}
                  questions={questions}
                  onUpdateQuestion={onUpdateQuestion}
                  onDeleteQuestion={onDeleteQuestion}
                  onDuplicateQuestion={onDuplicateQuestion}
                  onOptionLogicChange={onOptionLogicChange}
                  getOptionLogic={getOptionLogic}
                  visibilityCondition={visibilityCondition}
                  onVisibilityChange={onVisibilityChange}
                  isHidden={hiddenQuestions.has(question.id)}
                  onToggleVisibility={onToggleQuestionVisibility}
                  expanded={expandedStates[question.id]}
                  onToggleExpanded={() => onToggleExpanded?.(question.id)}
                  showTitleError={missingTitleIds.includes(question.id)}
                  readonly={readonly}
                />
                {/* Add Question Button After Each Question */}
                {!readonly && (
                  <SimpleAddQuestionButton
                    onAddQuestion={onAddQuestion}
                    variant="minimal"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hidden Questions Alert */}
      {!readonly && hiddenList.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-xs text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg">
          <span className="font-medium">
            {hiddenList.length} hidden question
            {hiddenList.length !== 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            onClick={() =>
              hiddenList.forEach((q) => onToggleQuestionVisibility?.(q.id))
            }
          >
            Unhide all
          </Button>
        </div>
      )}
    </div>
  );
}
