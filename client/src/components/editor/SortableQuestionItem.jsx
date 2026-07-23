import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "../../lib/utils";
import { QUESTION_TYPE_LABELS } from "../../lib/constants/questionTypes";

/**
 * Sortable Question Item
 * Draggable question card
 */

export function SortableQuestionItem({ question, index, isSelected, onClick }) {
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
      className={cn(
        "flex items-start gap-2 p-4 rounded-lg border cursor-pointer transition-colors",
        isSelected && "border-blue-500 bg-blue-50",
        !isSelected && "border-gray-200 hover:border-gray-300",
        isDragging && "opacity-50"
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing pt-1"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>

      {/* Question Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-500">
            Q{index + 1}
          </span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
            {QUESTION_TYPE_LABELS[question.type]}
          </span>
          {question.required && (
            <span className="text-xs text-red-600">Required</span>
          )}
        </div>
        <p className="text-sm truncate">
          {question.title || (
            <span className="text-gray-400 italic">Empty question</span>
          )}
        </p>
      </div>
    </div>
  );
}
