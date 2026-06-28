import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type MarqueeProps = ComponentPropsWithoutRef<"div"> & {
  reverse?: boolean;
  pauseOnHover?: boolean;
  repeat?: number;
};

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  repeat = 3,
  children,
  ...props
}: MarqueeProps) {
  const copyIds = Array.from(
    { length: repeat },
    (_, copyNumber) => `marquee-copy-${copyNumber + 1}`,
  );

  return (
    <div
      {...props}
      className={cn(
        "group flex gap-[var(--gap)] overflow-hidden [--duration:26s] [--gap:1.25rem]",
        pauseOnHover &&
          "hover:[&_.marquee-track]:[animation-play-state:paused]",
        className,
      )}
    >
      {copyIds.map((copyId) => (
        <div
          key={copyId}
          className={cn(
            "marquee-track flex shrink-0 items-center justify-around gap-[var(--gap)] motion-safe:[animation:marquee_var(--duration)_linear_infinite]",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
