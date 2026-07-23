import React, { useState, useEffect, useCallback } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Layers, ArrowRight, X, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { STRUCTURE_TYPES } from "../../../lib/surveyStructure";

/* =========================================================
   Preview primitives (LOCAL)
========================================================= */

const PREVIEW_TIMING = {
  CYCLE_MS: 3800,
  TRANSITION: 0.35,
};

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PreviewFrame({ children, onHover }) {
  return (
    <div
      onMouseEnter={onHover}
      onClick={onHover}
      className="relative rounded-xl border border-border bg-muted-foreground/10 overflow-hidden h-[280px] sm:h-[360px] md:h-[440px]"
    >
      {/* Live Preview */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-background px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border text-[10px] sm:text-xs font-medium">
        <span className="text-primary">●</span> Live Preview
      </div>

      <div className="h-full overflow-auto p-3 pt-9 sm:p-4 sm:pt-12">
        {children}
      </div>
    </div>
  );
}

function FakeProgressPill({ label }) {
  return (
    <span className="text-[9px] sm:text-[11px] rounded-full border px-1.5 sm:px-2 py-0.5 text-muted-foreground bg-background whitespace-nowrap">
      {label}
    </span>
  );
}

function FakeSectionHeader({ title, count, isActive }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-t-md border text-[10px] sm:text-xs font-medium transition-colors duration-300",
        isActive
          ? "bg-muted-foreground/10 border-primary/30"
          : "bg-background border-border opacity-70"
      )}
    >
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
      <span className="truncate">{title}</span>
      <div className="flex-1" />
      <span className="opacity-60 whitespace-nowrap">{count} questions</span>
      <ChevronRight
        className={cn("w-3 h-3 transition-transform", isActive && "rotate-90")}
      />
    </div>
  );
}

/* =========================================================
   Data
========================================================= */

const SECTIONS = [
  {
    id: 1,
    title: "Personal Information",
    questions: [
      { id: 1, title: "Full name", value: "John Doe" },
      { id: 2, title: "Email address", value: "john@email.com" },
    ],
  },
  {
    id: 2,
    title: "Feedback",
    questions: [
      { id: 3, title: "Service rating", value: 4 },
      {
        id: 4,
        title: "Additional comments",
        value: "Great experience overall. Very responsive team.",
      },
    ],
  },
];

/* =========================================================
   Section Preview (WRAPPED LIKE QUESTION PREVIEW)
========================================================= */

function SectionStackPreview({ isActive }) {
  const prefersReduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!isActive || prefersReduced) return;
    const t = setInterval(
      () => setActive((p) => (p + 1) % SECTIONS.length),
      PREVIEW_TIMING.CYCLE_MS
    );
    return () => clearInterval(t);
  }, [isActive, prefersReduced]);

  const handleHover = useCallback(() => {
    if (!prefersReduced) {
      setActive((p) => (p + 1) % SECTIONS.length);
    }
  }, [prefersReduced]);

  return (
    <PreviewFrame onHover={handleHover}>
      {/* OUTER PADDING */}
      <div className="p-1.5 sm:p-3">
        {/* INNER SURVEY CARD (same as Question preview) */}
        <div className="relative rounded-lg border bg-background px-2 sm:px-3 pb-2 sm:pb-3 pt-3 sm:pt-4 space-y-2 sm:space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Sectioned survey (preview)
            </span>
            <FakeProgressPill
              label={`Section ${active + 1} of ${SECTIONS.length}`}
            />
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {SECTIONS.map((section, idx) => {
              const isOpen = idx === active;

              return (
                <Motion.div
                  key={section.id}
                  initial={false}
                  animate={{
                    opacity: isOpen ? 1 : 0.6,
                    scale: isOpen ? 1 : 0.985,
                  }}
                  transition={{
                    duration: PREVIEW_TIMING.TRANSITION,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className={[
                    "rounded-md border bg-background overflow-hidden",
                    isOpen ? "border-primary/40 shadow-sm" : "border-border",
                  ].join(" ")}
                >
                  <FakeSectionHeader
                    title={section.title}
                    count={section.questions.length}
                    isActive={isOpen}
                  />

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <Motion.div
                        key={`section-content-${section.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: {
                            duration: 0.35,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          },
                          opacity: { duration: 0.25, ease: "easeInOut" },
                        }}
                        className="overflow-hidden"
                      >
                        <div className="px-2 sm:px-3 pb-2 sm:pb-3 space-y-1.5 sm:space-y-2">
                          {section.questions.map((q) => (
                            <div
                              key={q.id}
                              className="rounded-md border bg-muted/20 p-1.5 sm:p-2"
                            >
                              <p className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1">
                                {q.title}
                              </p>

                              {typeof q.value === "number" ? (
                                <div className="flex gap-0.5 sm:gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border",
                                        i < q.value
                                          ? "bg-primary border-primary"
                                          : "bg-muted/40"
                                      )}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] sm:text-xs text-muted-foreground border rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 bg-background">
                                  {q.value}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </Motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-1 flex justify-between text-[9px] sm:text-[11px] text-muted-foreground">
            <span>Auto-advancing section focus</span>
            <span>Scroll enabled</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

/* =========================================================
   Modal
========================================================= */

export function SectionStructureModal({ isOpen, onClose, onConfirm }) {
  const handleConfirm = () => {
    localStorage.setItem("surveyStructureChoice", STRUCTURE_TYPES.SECTION);
    onConfirm(STRUCTURE_TYPES.SECTION);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden max-h-[95vh] sm:max-h-[92vh] flex flex-col">
        <Motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b">
            <div className="flex justify-between">
              <div className="flex gap-2 sm:gap-3 items-center">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-xl">
                    Section-based Survey
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
                    Grouped, scalable, and organized
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto min-h-0 flex-1">
            <SectionStackPreview isActive={isOpen} />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Group related questions into logical sections. Ideal for longer,
              more complex surveys that benefit from structure and clarity.
            </p>
          </div>

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
                Start with Sections <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </DialogFooter>
        </Motion.div>
      </DialogContent>
    </Dialog>
  );
}
