import React, { useState } from "react";
import {
  Type,
  AlignLeft,
  Circle,
  CheckSquare,
  ChevronDown,
  Star,
  Calendar,
  Plus,
} from "lucide-react";
import { QUESTION_TYPES } from "../../lib/constants/questionTypes";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const questionTypes = [
  {
    type: QUESTION_TYPES.SHORT_TEXT,
    label: "Short Text",
    icon: Type,
    category: "Text Input",
  },
  {
    type: QUESTION_TYPES.LONG_TEXT,
    label: "Long Text",
    icon: AlignLeft,
    category: "Text Input",
  },
  {
    type: QUESTION_TYPES.SINGLE_CHOICE,
    label: "Single Choice",
    icon: Circle,
    category: "Choice",
  },
  {
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    label: "Multiple Choice",
    icon: CheckSquare,
    category: "Choice",
  },
  {
    type: QUESTION_TYPES.DROPDOWN,
    label: "Dropdown",
    icon: ChevronDown,
    category: "Choice",
  },
  {
    type: QUESTION_TYPES.RATING,
    label: "Rating Scale",
    icon: Star,
    category: "Rating",
  },
  {
    type: QUESTION_TYPES.DATE,
    label: "Date Picker",
    icon: Calendar,
    category: "Date & Time",
  },
];

// Group questions by category
const questionsByCategory = questionTypes.reduce((acc, qt) => {
  if (!acc[qt.category]) {
    acc[qt.category] = [];
  }
  acc[qt.category].push(qt);
  return acc;
}, {});

/**
 * Simple Question Type Selector - Clean popover interface
 * Stays open until user clicks outside, allowing multiple question additions
 */
export function QuestionTypeSelector({ onSelect, trigger }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (type) => {
    onSelect(type);
    // Keep popover open for multiple selections
    // User can click outside to close
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="p-3">
          <h4 className="font-semibold text-sm mb-3">Question Types</h4>

          {Object.entries(questionsByCategory).map(([category, types], idx) => (
            <div key={category} className={cn(idx > 0 && "mt-4")}>
              <p className="text-xs text-slate-500 font-medium mb-2 px-2">
                {category}
              </p>
              <div className="space-y-1">
                {types.map((qt) => {
                  const Icon = qt.icon;
                  return (
                    <button
                      key={qt.type}
                      onClick={() => handleSelect(qt.type)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 transition-colors text-left"
                    >
                      <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="text-sm">{qt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
