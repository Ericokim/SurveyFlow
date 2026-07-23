"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // Neutral track, not bg-primary/20: on a survey with a pale brand colour
      // a 20% tint of that same hue left fill-vs-track under the 3:1 that
      // WCAG 1.4.11 requires for a meaningful graphic.
      className={cn(
        "bg-muted relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 motion-safe:transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  );
}

export { Progress }
