import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { LandingSectionId } from "@/features/landing";
import { cn } from "@/lib/utils";

export function requestSectionScroll(sectionId: LandingSectionId) {
  window.dispatchEvent(
    new CustomEvent("surveyflow:scroll-to-section", {
      detail: { sectionId },
    }),
  );
}

export function MotionBlock({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({
  label,
  title,
  description,
  align = "center",
}: {
  label: string;
  title: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <MotionBlock
      className={cn(
        "flex max-w-3xl flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
      )}
    >
      <Badge
        variant="outline"
        className="h-auto border-0 px-3 py-1 font-normal text-primary text-sm outline outline-border"
      >
        {label}
      </Badge>
      <h2 className="font-medium text-4xl text-foreground tracking-normal sm:text-5xl">
        {title}
      </h2>
      <p className="text-base text-muted-foreground leading-7 sm:text-lg">
        {description}
      </p>
    </MotionBlock>
  );
}
