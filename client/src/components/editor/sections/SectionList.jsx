import { SectionCard } from "./SectionCard";
import { EmptyState } from "../../ui/empty-state";
import { Button } from "../../ui/button";
import { FileText, Plus } from "lucide-react";

/**
 * SectionList
 * Renders all sections with their questions
 */
export function SectionList({
  sections = [],
  questions = [],
  expandedSections = {},
  onToggleSection,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onSectionLogicClick,
  onAddSection,
  children,
  readonly = false,
}) {
  if (sections.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No sections yet"
        description="Sections help organize your survey into logical groups"
        action={
          !readonly && (
            <Button onClick={onAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Section
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {sections
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            questions={questions}
            isExpanded={expandedSections[section.id]}
            onToggleExpand={() => onToggleSection?.(section.id)}
            onUpdate={onUpdateSection}
            onDelete={() => onDeleteSection?.(section.id)}
            onDuplicate={() => onDuplicateSection?.(section.id)}
            onLogicClick={() => onSectionLogicClick?.(section)}
            readonly={readonly}
          >
            {/* Questions will be rendered here by parent */}
            {children?.(section, index)}
          </SectionCard>
        ))}

      {!readonly && sections.length > 0 && (
        <Button
          onClick={onAddSection}
          variant="outline"
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      )}
    </div>
  );
}
