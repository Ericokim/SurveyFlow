import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Plus, FileText, Layout, Eye, EyeOff } from "lucide-react";
import { DocumentStyleSection } from "./DocumentStyleSection";
import { SurveyStructureHeader } from "./SurveyStructureHeader";
import { EmptyState } from "../ui/empty-state";
import { cn } from "../../lib/utils";

/**
 * SortableSectionCard - Individual sortable section wrapper
 */
function SortableSectionCard({
  section,
  index,
  questions,
  sections,
  allSections = sections,
  visibilityRules = [],
  sectionJumpTargetId = "__continue__",
  sectionJumpMap = {},
  sectionJumpSource = null,
  hasConditionalSectionVisibility = false,
  onSectionJumpChange,
  isExpanded,
  isHidden,
  onToggleSection,
  onUpdateSection,
  onSaveSection, // NEW: Section save handler
  onCancelSection,
  sectionDirtyMap = {},
  isSaving = false,
  onDeleteSection,
  onDuplicateSection,
  onMergeSectionWithAbove,
  onToggleVisibility,
  onSectionLogicClick,
  onToggleSectionalMode,
  onAddQuestion,
  expandedQuestions,
  onToggleQuestionExpanded,
  isSectional = true,
  children,
  readonly,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative group",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-full before:transition-colors",
        isDragging && "opacity-40",
        isHidden ? "before:bg-amber-300" : ""
      )}
    >
      {/* Section Card */}
      <div
        className={cn(
          "transition-all duration-200",
          isDragging &&
            "border-2 border-dashed border-border bg-muted/40 rounded-xl"
        )}
      >
        <DocumentStyleSection
          section={section}
          questions={questions}
          sections={allSections}
          visibilityRules={visibilityRules}
          sectionIndex={index}
          sectionJumpTargetId={sectionJumpTargetId}
          sectionJumpMap={sectionJumpMap}
          sectionJumpSource={sectionJumpSource}
          hasConditionalSectionVisibility={hasConditionalSectionVisibility}
          onSectionJumpChange={onSectionJumpChange}
          isExpanded={isExpanded}
          isHidden={isHidden}
          onToggleExpand={onToggleSection}
          onUpdateSection={onUpdateSection}
          onSaveSection={() =>
            onSaveSection?.({
              sectionId: section.id,
              title: section.title,
              description: section.description,
              questions: questions.filter((q) =>
                section.questionIds?.includes(q.id)
              ),
            })
          }
          onCancelSection={() => onCancelSection?.(section.id)}
          isDirty={sectionDirtyMap?.[section.id]}
          isSaving={isSaving}
          onDeleteSection={onDeleteSection}
          onDuplicateSection={onDuplicateSection}
          onMergeSectionWithAbove={onMergeSectionWithAbove}
          onToggleVisibility={onToggleVisibility}
          onLogicClick={onSectionLogicClick}
          onToggleSectionalMode={onToggleSectionalMode}
          onAddQuestion={onAddQuestion}
          expandedSections={expandedQuestions}
          onToggleQuestionExpanded={onToggleQuestionExpanded}
          isSectional={isSectional}
          readonly={readonly}
          dragHandleProps={readonly ? {} : { ...attributes, ...listeners }}
        >
          {children}
        </DocumentStyleSection>
      </div>

      {/* Visual Drag Indicator */}
      {isDragging && (
        <div className="absolute inset-0 ml-4 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 pointer-events-none" />
      )}
    </motion.div>
  );
}

/**
 * DocumentStyleSectionList Component
 * Production-grade visual section cards with clear boundaries
 * Document-style vertical layout with enhanced visual hierarchy and drag-and-drop reordering
 */
export function DocumentStyleSectionList({
  sections = [],
  allSections = sections,
  questions = [],
  visibilityRules = [],
  sectionJumpMap = {},
  sectionJumpSourceMap = {},
  hasConditionalSectionVisibility = false,
  onSectionJumpChange,
  expandedSections = {},
  hiddenSections = new Set(),
  filterMode = "all", // 'all', 'sections', 'questions'
  onToggleSection,
  onUpdateSection,
  onSaveSection, // NEW: Section save handler
  onCancelSection,
  sectionDirtyMap = {},
  savingSectionIds = new Set(),
  onDeleteSection,
  onDuplicateSection,
  onMergeSectionWithAbove,
  onToggleVisibility,
  onSectionLogicClick,
  onToggleSectionalMode,
  onAddSection,
  onAddSectionFromTemplate, // New prop for handling template-based section creation
  onAddQuestion,
  onReorderSections, // New prop for handling section reordering
  onFilterChange, // New prop for filter mode changes
  onExpandAll, // New prop for expand all functionality
  onCollapseAll, // New prop for collapse all functionality
  expandedQuestions = {}, // New prop for question expanded states
  onToggleQuestionExpanded, // New prop for toggling question expansion
  isSectional = true, // Whether to show section headers (false = implicit mode)
  children, // Question list render function: (section) => QuestionList
  readonly = false,
}) {
  // State for drag overlay
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

  // Sort sections by order
  const sortedSections = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  // Find active section for overlay
  const activeSection = activeId
    ? sortedSections.find((s) => s.id === activeId)
    : null;

  const visibleSectionsCount = sections.filter(
    (s) => !hiddenSections.has(s.id)
  ).length;
  const totalQuestionsCount = questions.length;

  // Apply filtering logic
  const getFilteredContent = (section, index) => {
    if (filterMode === "sections") {
      // Show section header only, hide questions
      return null;
    } else if (filterMode === "questions") {
      // Show questions only, minimal section header
      return children?.(section, index);
    } else {
      // Show everything (default)
      return children?.(section, index);
    }
  };

  const shouldShowSection = (section) => {
    if (filterMode === "questions") {
      // In questions-only mode, only show sections that have questions
      const sectionQuestions = questions.filter((q) =>
        section?.questionIds?.includes(q.id)
      );
      return sectionQuestions.length > 0;
    }
    return true;
  };

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedSections.findIndex(
        (section) => section.id === active.id
      );
      const newIndex = sortedSections.findIndex(
        (section) => section.id === over.id
      );

      const reorderedSections = arrayMove(sortedSections, oldIndex, newIndex);

      // Update order values and call parent handler
      const updatedSections = reorderedSections.map((section, index) => ({
        ...section,
        order: index,
      }));

      onReorderSections?.(updatedSections);
    }

    setActiveId(null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
  };

  // If no sections, show getting started state
  if (sections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-linear-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center">
            <Layout className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Loading sections ...
          </h3>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Survey Structure Header */}
      {/* <SurveyStructureHeader
        sections={sections}
        questions={questions}
        hiddenSections={hiddenSections}
        expandedSections={expandedSections}
        filterMode={filterMode}
        onFilterChange={onFilterChange}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        onShowAllSections={() => {
          // Unhide all sections by calling onToggleVisibility for each hidden section
          hiddenSections.forEach((sectionId) => {
            onToggleVisibility?.(sectionId);
          });
        }}
        readonly={readonly}
      /> */}

      {/* Section List with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        disabled={readonly}
      >
        <SortableContext
          items={sortedSections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {sortedSections
              .filter((section) => shouldShowSection(section))
              .map((section, index) => {
                const isExpanded = expandedSections[section.id] ?? true;
                const isHidden = hiddenSections.has(section.id);

                return (
                  <div key={section.id} className="space-y-1">
                    <SortableSectionCard
                      section={section}
                      index={index}
                      questions={questions}
                      sections={sections}
                      allSections={allSections}
                      visibilityRules={visibilityRules}
                      sectionJumpTargetId={
                        sectionJumpMap?.[section.id] || "__continue__"
                      }
                      sectionJumpMap={sectionJumpMap}
                      sectionJumpSource={
                        sectionJumpSourceMap?.[section.id] || null
                      }
                      hasConditionalSectionVisibility={
                        hasConditionalSectionVisibility
                      }
                      onSectionJumpChange={onSectionJumpChange}
                      isExpanded={isExpanded}
                      isHidden={isHidden}
                      onToggleSection={() => onToggleSection?.(section.id)}
                      onUpdateSection={onUpdateSection}
                      onSaveSection={onSaveSection}
                      onCancelSection={onCancelSection}
                      sectionDirtyMap={sectionDirtyMap}
                      isSaving={savingSectionIds.has(section.id)}
                      onDeleteSection={onDeleteSection}
                      onDuplicateSection={onDuplicateSection}
                      onMergeSectionWithAbove={onMergeSectionWithAbove}
                      onToggleVisibility={onToggleVisibility}
                      onSectionLogicClick={onSectionLogicClick}
                      onToggleSectionalMode={onToggleSectionalMode}
                      onAddQuestion={onAddQuestion}
                      expandedQuestions={expandedQuestions}
                      onToggleQuestionExpanded={onToggleQuestionExpanded}
                      isSectional={isSectional}
                      readonly={readonly}
                    >
                      {/* Render filtered content for this section */}
                      {getFilteredContent(section, index)}
                    </SortableSectionCard>

                    {!readonly && isSectional && (
                      <div className="flex justify-center mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors h-8 text-xs"
                          onClick={() => onAddSection?.(section)}
                          data-testid={`add-section-below-btn-${section.id}`}
                        >
                          <Plus className="h-3 w-3" />
                          Add section below
                        </Button>
                      </div>
                    )}

                    {/* Section Separator */}
                    {/* {index < sortedSections.length - 1 && (
                      <div className="ml-4 flex items-center gap-1.5 py-1">
                        <div className="flex-1 h-px bg-slate-100"></div>
                        <div className="text-[9px] text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-100">
                          Section {index + 2}
                        </div>
                        <div className="flex-1 h-px bg-slate-100"></div>
                      </div>
                    )} */}
                  </div>
                );
              })}
          </div>
        </SortableContext>

        {/* Drag Overlay - Shows dragged section following cursor */}
        <DragOverlay>
          {activeSection ? (
            <div className="opacity-90">
              <DocumentStyleSection
                section={activeSection}
                questions={questions}
                sections={allSections}
                visibilityRules={visibilityRules}
                sectionIndex={Math.max(
                  0,
                  sortedSections.findIndex((s) => s.id === activeSection.id)
                )}
                sectionJumpTargetId={
                  sectionJumpMap?.[activeSection.id] || "__continue__"
                }
                sectionJumpMap={sectionJumpMap}
                sectionJumpSource={
                  sectionJumpSourceMap?.[activeSection.id] || null
                }
                hasConditionalSectionVisibility={
                  hasConditionalSectionVisibility
                }
                onSectionJumpChange={onSectionJumpChange}
                isExpanded={expandedSections[activeSection.id] ?? true}
                isHidden={hiddenSections.has(activeSection.id)}
                onToggleExpand={() => {}}
                onUpdateSection={() => {}}
                onSaveSection={() => {}}
                onCancelSection={() => {}}
                isDirty={false}
                isSaving={false}
                onDeleteSection={() => {}}
                onDuplicateSection={() => {}}
                onMergeSectionWithAbove={() => {}}
                onToggleVisibility={() => {}}
                onLogicClick={() => {}}
                onToggleSectionalMode={() => {}}
                onAddQuestion={() => {}}
                expandedSections={{}}
                onToggleQuestionExpanded={() => {}}
                isSectional={isSectional}
                readonly={true}
                dragHandleProps={{}}
                isDragging={true}
              >
                {getFilteredContent(activeSection, 0)}
              </DocumentStyleSection>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Compact Hidden Sections Indicator */}
      <AnimatePresence>
        {hiddenSections.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                <EyeOff className="w-3 h-3 text-amber-700" />
              </div>
              <div>
                <span className="text-sm font-medium text-amber-900">
                  {hiddenSections.size} section
                  {hiddenSections.size !== 1 ? "s" : ""} hidden
                </span>
                <p className="text-xs text-amber-700">
                  Use the eye icon to show/hide sections
                </p>
              </div>
            </div>
            {!readonly && (
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 h-8 px-3"
                onClick={() => {
                  // Unhide all sections
                  hiddenSections.forEach((sectionId) => {
                    onToggleVisibility?.(sectionId);
                  });
                }}
              >
                Show all
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
