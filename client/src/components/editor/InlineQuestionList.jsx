import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import { ChevronsDown, ChevronsUp, Trash2, PlusIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { InlineQuestionCard } from "./InlineQuestionCard";
import { QUESTION_TYPES } from "../../lib/constants/questionTypes";
import { getDefaultQuestion } from "../../lib/schemas/surveySchemas";
import { useAlertContext } from "../../app/context/AlertContext";
import { QuestionTypeSelector } from "./QuestionTypeSelector";

/**
 * SortableQuestionCard - Individual sortable question wrapper
 */
function SortableQuestionCard(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-40" : ""}
    >
      <InlineQuestionCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

/**
 * InlineQuestionList
 * Renders questions as inline editable cards with drag-and-drop.
 */
export function InlineQuestionList({
  questions,
  sections = [],
  activeSectionId = null,
  navigationRules = [],
  onChange,
  onOptionLogicChange,
  getOptionLogic,
  onAssignSection,
  visibilityCondition,
  onVisibilityChange,
  hiddenQuestions = new Set(),
  onToggleQuestionVisibility,
  readonly = false,
  missingTitleIds = [],
  isSectional = false,
}) {
  const [expandedStates, setExpandedStates] = useState({});
  const [lastAddedId, setLastAddedId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const questionRefs = useRef({});
  const { openAlert, closeAlert } = useAlertContext();

  const visibleQuestions =
    activeSectionId && sections.length > 0
      ? questions.filter(
          (q) =>
            sections
              .find((s) => s.id === activeSectionId)
              ?.questionIds?.includes(q.id) && !hiddenQuestions.has(q.id)
        )
      : questions.filter((q) => !hiddenQuestions.has(q.id));

  const hiddenQuestionList = questions.filter((q) => hiddenQuestions.has(q.id));

  // Find active question for overlay
  const activeQuestion = activeId
    ? questions.find((q) => q.id === activeId)
    : null;

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

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleReorder = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const currentList = activeSectionId ? visibleQuestions : questions;
    const ids = currentList.map((q) => q.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    const reorderedVisible = arrayMove(currentList, oldIndex, newIndex);
    const visibleIdSet = new Set(ids);

    const firstIndex = questions.findIndex((q) => visibleIdSet.has(q.id));
    if (firstIndex === -1) {
      setActiveId(null);
      return;
    }

    const others = questions.filter((q) => !visibleIdSet.has(q.id));
    const merged = [
      ...others.slice(0, firstIndex),
      ...reorderedVisible,
      ...others.slice(firstIndex),
    ].map((q, idx) => ({ ...q, order: idx + 1 }));

    onChange(merged);
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const addQuestion = (type) => {
    const newQuestion = {
      ...getDefaultQuestion(type),
      order: questions.length + 1,
    };
    setExpandedStates((prev) => ({ ...prev, [newQuestion.id]: false }));
    setLastAddedId(newQuestion.id);
    setHighlightId(newQuestion.id);
    onChange([...questions, newQuestion]);
  };

  const duplicateQuestion = (index) => {
    const q = questions[index];
    const copy = {
      ...q,
      id: `${q.id}-copy-${Date.now()}`,
      title: `${q.title || "Untitled"} (copy)`,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, copy);
    onChange(updated.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const updateQuestion = (index, updates) => {
    if (!updates || typeof updates !== "object") {
      console.warn("updateQuestion called with invalid updates:", updates);
      return;
    }
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const deleteQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    onChange(updated.map((q, idx) => ({ ...q, order: idx + 1 })));
  };

  const deleteAllQuestions = () => {
    openAlert({
      title: "Delete all questions?",
      description:
        "This will remove every question in this survey. This action cannot be undone.",
      actionLabel: "Delete all",
      cancelLabel: "Cancel",
      actionStyle: "destructive",
      onAction: () => {
        onChange([]);
        setExpandedStates({});
        closeAlert();
      },
      onCancel: () => closeAlert(),
    });
  };

  useEffect(() => {
    if (!lastAddedId) return;
    const el = questionRefs.current[lastAddedId];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = setTimeout(() => setHighlightId(null), 1200);
    return () => clearTimeout(timer);
  }, [lastAddedId]);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="sticky top-16 z-20 bg-card border-b border-border px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle className="text-base font-semibold">Questions</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {questions.length > 0 && !readonly && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const anyExpanded = questions.some(
                    (q) => expandedStates[q.id]
                  );
                  const targetExpanded = !anyExpanded;
                  const newState = {};
                  questions.forEach((q) => {
                    newState[q.id] = targetExpanded;
                  });
                  setExpandedStates(newState);
                }}
              >
                {questions.some((q) => expandedStates[q.id]) ? (
                  <>
                    <ChevronsUp className="h-3 w-3 mr-1" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronsDown className="h-3 w-3 mr-1" />
                    Expand All
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={deleteAllQuestions}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete All
              </Button>
            </>
          )}
          {hiddenQuestionList.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
              <span>{hiddenQuestionList.length} hidden</span>
              {!readonly && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    hiddenQuestionList.forEach((q) =>
                      onToggleQuestionVisibility?.(q.id)
                    )
                  }
                >
                  Unhide all
                </Button>
              )}
            </div>
          )}
          {!readonly && (
            <QuestionTypeSelector
              onSelect={(type) => addQuestion(type)}
              trigger={
                <Button size="sm" className="h-7 px-2 text-xs">
                  <PlusIcon className="h-3 w-3 mr-1" />
                  Add Question
                </Button>
              }
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {visibleQuestions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {questions.length === 0
              ? "No questions yet. Use “Add Question” to start."
              : "No questions in this section yet. Assign or add one here."}
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={readonly ? undefined : handleReorder}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={visibleQuestions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
            disabled={readonly}
          >
            <div className="space-y-2">
              {visibleQuestions.map((question) => {
                const masterIndex = questions.findIndex(
                  (q) => q.id === question.id
                );
                return (
                  <div
                    key={question.id}
                    ref={(node) => {
                      if (node) questionRefs.current[question.id] = node;
                    }}
                    className={
                      highlightId === question.id
                        ? "ring-2 ring-primary/40 rounded-lg transition"
                        : ""
                    }
                  >
                    <SortableQuestionCard
                      question={question}
                      index={masterIndex}
                      expanded={expandedStates[question.id]}
                      onToggleExpanded={() =>
                        setExpandedStates((prev) => ({
                          ...prev,
                          [question.id]: !prev[question.id],
                        }))
                      }
                      onUpdate={(updates) =>
                        updateQuestion(masterIndex, updates)
                      }
                      onDelete={() => deleteQuestion(masterIndex)}
                      onDuplicate={() => duplicateQuestion(masterIndex)}
                      sections={sections}
                      onAssignSection={onAssignSection}
                      showTitleError={missingTitleIds.includes(question.id)}
                      onOptionLogicChange={onOptionLogicChange}
                      getOptionLogic={getOptionLogic}
                      allQuestions={questions}
                      visibilityCondition={visibilityCondition?.(question.id)}
                      onVisibilityChange={(condition) =>
                        onVisibilityChange?.(question.id, condition)
                      }
                      isHidden={hiddenQuestions.has(question.id)}
                      onToggleVisibility={() =>
                        onToggleQuestionVisibility?.(question.id)
                      }
                      isSectional={isSectional}
                      readonly={readonly}
                    />
                  </div>
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
                  index={questions.findIndex((q) => q.id === activeQuestion.id)}
                  expanded={false}
                  onToggleExpanded={() => {}}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                  onDuplicate={() => {}}
                  sections={sections}
                  onAssignSection={() => {}}
                  showTitleError={false}
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

        {!readonly && (
          <div className="flex justify-end pt-2 border-t">
            <QuestionTypeSelector
              onSelect={(type) => addQuestion(type)}
              trigger={<Button>+ Add Question</Button>}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
