import React, { useState, useEffect, useRef } from "react";
import { motion as Motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { FileText, ArrowRight, X } from "lucide-react";

/* =========================================================
   Survey Structure (LOCAL – replaces lib/surveyStructure)
========================================================= */

const SURVEY_STRUCTURE_KEY = "surveyStructureChoice";

const STRUCTURE_TYPES = {
  QUESTION: "question",
  SECTION: "section",
};

function setSurveyStructurePreference(structureType) {
  if (!Object.values(STRUCTURE_TYPES).includes(structureType)) return false;
  try {
    localStorage.setItem(SURVEY_STRUCTURE_KEY, structureType);
    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   Preview primitives (LOCAL)
========================================================= */

const PREVIEW_TIMING = {
  CYCLE_MS: 3000,
  PULSE_MS: 300,
};

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PreviewFrame({ children }) {
  return (
    <div className="relative h-full w-full rounded-xl border border-border bg-muted-foreground/10 overflow-hidden">
      {/* Live Preview pill */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
        <span className="text-[10px] sm:text-xs font-medium rounded-md bg-background px-1.5 py-0.5 sm:px-2 sm:py-1 border shadow">
          <span className="text-primary">●</span> Live Preview
        </span>
      </div>

      <div className="h-full w-full overflow-auto p-3 pt-9 sm:p-6 sm:pt-12">
        {children}
      </div>
    </div>
  );
}

function FakeProgressPill({ label }) {
  return (
    <span className="text-[9px] sm:text-[11px] rounded-full border px-1.5 sm:px-2 py-0.5 text-muted-foreground whitespace-nowrap">
      {label}
    </span>
  );
}

function FakeNextButton({ isPulsing }) {
  return (
    <Motion.div
      animate={isPulsing ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
      className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium"
    >
      Next →
    </Motion.div>
  );
}

/* =========================================================
   Question Preview Data
========================================================= */

const QUESTIONS = [
  { id: 1, title: "What is your name?", type: "Short text", value: "John Doe" },
  { id: 2, title: "Rate our service", type: "Rating scale", value: 4 },
  {
    id: 3,
    title: "Any feedback?",
    type: "Long text",
    value: "Great experience overall. The team was very responsive.",
  },
  {
    id: 4,
    title: "Would you recommend?",
    type: "Single choice",
    value: "Yes",
  },
  {
    id: 5,
    title: "Your email address",
    type: "Short text",
    value: "john@email.com",
  },
];

const TOTAL_STEPS = QUESTIONS.length;

/* =========================================================
   QuestionStackPreview (INLINE)
========================================================= */

function QuestionStackPreview({ isActive }) {
  const prefersReduced = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (!isActive || prefersReduced) return;

    const timer = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), PREVIEW_TIMING.PULSE_MS);
      setActiveStep((p) => (p + 1) % TOTAL_STEPS);
    }, PREVIEW_TIMING.CYCLE_MS);

    return () => clearInterval(timer);
  }, [isActive, prefersReduced]);

  useEffect(() => {
    const el = itemRefs.current[activeStep];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeStep]);

  return (
    <PreviewFrame>
      <div className="p-1.5 sm:p-3">
        {/* Inner survey card */}
        <div className="relative rounded-lg border bg-background px-2 sm:px-3 pb-2 sm:pb-3 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Single-page survey (preview)
            </span>
            <FakeProgressPill label={`${TOTAL_STEPS} questions`} />
          </div>

          {/* Questions */}
          <div className="space-y-2">
            {QUESTIONS.map((q, idx) => {
              const isFocused = idx === activeStep;

              return (
                <Motion.div
                  key={q.id}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  animate={{
                    opacity: isFocused ? 1 : 0.65,
                    scale: isFocused ? 1 : 0.985,
                  }}
                  transition={{ duration: 0.25 }}
                  className={[
                    "rounded-md border p-2 sm:p-2.5 bg-background",
                    isFocused ? "border-primary/40 shadow-sm" : "border-border",
                  ].join(" ")}
                >
                  <div className="mb-0.5 sm:mb-1 flex justify-between text-[9px] sm:text-[11px] text-muted-foreground">
                    <span>Q{idx + 1}</span>
                    <span>{q.type}</span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium">{q.title}</p>

                  <div className="mt-1 sm:mt-1.5">
                    {q.type === "Short text" && (
                      <div className="h-6 sm:h-7 px-1.5 sm:px-2 flex items-center rounded-md border bg-muted/20 text-[10px] sm:text-xs text-muted-foreground">
                        {q.value}
                      </div>
                    )}

                    {q.type === "Long text" && (
                      <div className="h-10 sm:h-12 px-1.5 sm:px-2 py-1 rounded-md border bg-muted/20 text-[10px] sm:text-xs text-muted-foreground">
                        {q.value}
                      </div>
                    )}

                    {q.type === "Rating scale" && (
                      <div className="flex gap-0.5 sm:gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={[
                              "h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border",
                              i < q.value
                                ? "bg-primary border-primary"
                                : "bg-muted/40 border-border",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                    )}

                    {q.type === "Single choice" && (
                      <div className="mt-1 text-[10px] sm:text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md border px-1.5 sm:px-2 py-0.5 bg-muted/20">
                          ● {q.value}
                        </span>
                      </div>
                    )}
                  </div>
                </Motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-1 sm:pt-2 flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] text-muted-foreground">
              Auto-scrolling preview
            </span>
            <FakeNextButton isPulsing={isPulsing} />
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

/* =========================================================
   QuestionStructureModal
========================================================= */

export function QuestionStructureModal({ isOpen, onClose, onConfirm }) {
  const handleConfirm = () => {
    setSurveyStructurePreference(STRUCTURE_TYPES.QUESTION);
    onConfirm?.(STRUCTURE_TYPES.QUESTION);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden max-h-[95vh] sm:max-h-[92vh] flex flex-col">
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-xl">
                    Question-based Survey
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
                    Quick, linear, and focused
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto min-h-0 flex-1">
            <div className="h-[280px] sm:h-[360px] md:h-[420px]">
              <QuestionStackPreview isActive={isOpen} />
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Each question appears one at a time in a clean, focused flow.
              Respondents move step-by-step, seeing only what matters.
            </p>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-3 sm:pt-4 border-t bg-muted/50 shrink-0">
            <div className="flex gap-2 sm:gap-3 w-full">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 text-sm sm:text-base"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 gap-1.5 sm:gap-2 text-sm sm:text-base"
              >
                Start with Questions
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </DialogFooter>
        </Motion.div>
      </DialogContent>
    </Dialog>
  );
}
