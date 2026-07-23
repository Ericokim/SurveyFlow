import React from "react";
import { Plus } from "lucide-react";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/**
 * SimpleAddQuestionButton - Clean, minimal add question button
 * Appears between questions and expands to show question type selector
 */
export function SimpleAddQuestionButton({
  onAddQuestion,
  className,
  variant = "default", // "default" | "minimal"
}) {
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center py-2", className)}>
        <QuestionTypeSelector
          onSelect={(type) => onAddQuestion?.(type)}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0 hover:bg-indigo-100 hover:text-indigo-600 transition-all group"
            >
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-3", className)}>
      <QuestionTypeSelector
        onSelect={(type) => onAddQuestion?.(type)}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-dashed hover:border-solid hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Question
          </Button>
        }
      />
    </div>
  );
}

/**
 * SimpleAddQuestionCard - Full-width card for adding first question
 * Used when there are no questions yet
 */
export function SimpleAddQuestionCard({ onAddQuestion, className }) {
  return (
    <div
      className={cn(
        "border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <Plus className="h-6 w-6 text-slate-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">
            Add your first question
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Choose a question type to get started
          </p>
        </div>
        <QuestionTypeSelector
          onSelect={(type) => onAddQuestion?.(type)}
          trigger={
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          }
        />
      </div>
    </div>
  );
}
