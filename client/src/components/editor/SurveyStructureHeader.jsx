import React from "react";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";

export function SurveyStructureHeader({
  sections = [],
  questions = [],
  hiddenSections = new Set(),
  expandedSections = {},
  filterMode = "all", // 'all', 'sections', 'questions'
  onFilterChange,
  onExpandAll,
  onCollapseAll,
  onShowAllSections,
  readonly = false,
}) {
  const visibleSectionsCount = sections.filter(
    (s) => !hiddenSections.has(s.id)
  ).length;
  const totalQuestionsCount = questions.length;
  const expandedCount = Object.values(expandedSections).filter(Boolean).length;
  const allExpanded = expandedCount === sections.length;

  return (
    <div className="bg-card border-b border-border px-3 sm:px-4 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Header Title */}
        <h3 className="text-base font-semibold text-foreground">
          Survey Structure
        </h3>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {!readonly && sections.length > 0 && (
            <>
              {/* Expand/Collapse Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={allExpanded ? onCollapseAll : onExpandAll}
                title={
                  allExpanded ? "Collapse all sections" : "Expand all sections"
                }
              >
                {allExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Expand All
                  </>
                )}
              </Button>

              {/* Show All Hidden */}
              {hiddenSections.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                  onClick={onShowAllSections}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Show All Hidden
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
