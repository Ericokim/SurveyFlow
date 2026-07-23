import React, { useState } from "react";
import { Layout, FileText, Layers, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { QuestionStructureModal } from "./modals/QuestionStructureModal";
import { SectionStructureModal } from "./modals/SectionStructureModal";

/**
 * EmptySectionState
 * Theme-aligned structure chooser (Question vs Section)
 */
export function EmptySectionState({
  onAddSection,
  onAddQuestionDirectly,
  className,
  readonly = false,
}) {
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  const handleConfirmChoice = (structureType) => {
    if (structureType === "question") {
      onAddQuestionDirectly?.();
    } else {
      onAddSection();
    }
    setIsQuestionModalOpen(false);
    setIsSectionModalOpen(false);
  };

  if (readonly) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Layout className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No sections yet</h3>
          <p className="text-sm text-muted-foreground">
            Sections will appear here once they are added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-full max-w-full overflow-hidden">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
            {/* Icon */}
            <div className="w-14 h-14 sm:w-17 sm:h-17 rounded-full bg-primary/10 flex items-center justify-center">
              <Layout className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>

            {/* Text */}
            <div>
              <h3 className="text-lg sm:text-xl font-semibold">
                Start building your survey
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Choose how you want to structure your survey
              </p>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {/* Question-based */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsQuestionModalOpen(true)}
                className={cn(
                  "group h-auto min-h-14 sm:min-h-16 relative w-full rounded-xl border border-border bg-background",
                  "p-2.5 sm:p-3 text-left transition-all",
                  "hover:border-primary/40 hover:shadow-sm hover:bg-muted/30",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30"
                )}
              >
                <div className="flex items-start gap-2 w-full min-w-0">
                  {/* Icon */}
                  <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 sm:p-2">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex w-full items-center justify-between gap-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Questions
                      </h4>

                      {/* Arrow */}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
                    </div>

                    <p className="mt-0.5 sm:mt-1 text-xs text-muted-foreground">
                      One continuous list of questions
                    </p>
                  </div>
                </div>
              </Button>

              {/* Section-based */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsSectionModalOpen(true)}
                className={cn(
                  "group h-auto min-h-14 sm:min-h-16 relative w-full rounded-xl border border-border bg-background",
                  "p-2.5 sm:p-3 text-left transition-all",
                  "hover:border-primary/40 hover:shadow-sm hover:bg-muted/30",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30"
                )}
              >
                <div className="flex items-start gap-2 w-full min-w-0">
                  {/* Icon */}
                  <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 sm:p-2">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex w-full items-center justify-between gap-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Sections
                      </h4>
                      {/* Arrow */}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
                    </div>

                    <p className="mt-0.5 sm:mt-1 text-xs text-muted-foreground">
                      Organize questions by section
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuestionStructureModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onConfirm={handleConfirmChoice}
      />

      <SectionStructureModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        onConfirm={handleConfirmChoice}
      />
    </div>
  );
}
