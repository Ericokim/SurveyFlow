import { useState } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Collapsible, CollapsibleContent } from "../../ui/collapsible";
import { cn } from "../../../lib/utils";

/**
 * SectionHeader
 * Header row for a section card with inline title editing, metadata, and actions
 */
function SectionHeader({
  title,
  questionCount,
  hasLogic,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onDuplicate,
  onLogicClick,
  dragHandleProps,
  readonly = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  return (
    <CardHeader className="p-4 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        {!readonly && (
          <div
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
        )}

        {/* Expand/collapse */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0 h-auto hover:bg-transparent"
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          )}
        </Button>

        {/* Section icon */}
        <Layers className="h-5 w-5 text-indigo-500" />

        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="h-8 text-base font-semibold"
              autoFocus
              disabled={readonly}
            />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!readonly) setIsEditing(true);
              }}
              className="text-left text-base font-semibold text-gray-900 hover:text-indigo-600 transition truncate w-full"
              disabled={readonly}
            >
              {title || "Untitled Section"}
            </button>
          )}
        </div>

        {/* Metadata badges */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {questionCount} {questionCount === 1 ? "question" : "questions"}
          </Badge>
          {hasLogic && (
            <Badge
              variant="outline"
              className="text-xs text-indigo-600 border-indigo-200"
            >
              Logic
            </Badge>
          )}
        </div>

        {/* Actions menu */}
        {!readonly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onLogicClick}>
                Section Logic
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </CardHeader>
  );
}

/**
 * SectionCard
 * A collapsible container for section questions with prominent header
 */
export function SectionCard({
  section,
  questions = [],
  isExpanded: controlledExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
  onLogicClick,
  dragHandleProps,
  children,
  readonly = false,
}) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const handleToggle =
    onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  const questionCount = questions.filter((q) =>
    section.questionIds?.includes(q.id)
  ).length;

  const hasLogic =
    section.visibilityRules?.length > 0 || section.navigationRules?.length > 0;

  return (
    <Card
      className={cn(
        "mb-4 border border-slate-200 transition-all",
        isExpanded && "shadow-sm"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={handleToggle}>
        <SectionHeader
          title={section.title}
          questionCount={questionCount}
          hasLogic={hasLogic}
          isExpanded={isExpanded}
          onToggleExpand={handleToggle}
          onEdit={(title) => onUpdate({ ...section, title })}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onLogicClick={onLogicClick}
          dragHandleProps={dragHandleProps}
          readonly={readonly}
        />

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
