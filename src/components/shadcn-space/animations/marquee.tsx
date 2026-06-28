import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
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
        "group flex gap-[var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        vertical ? "flex-col" : "flex-row",
        pauseOnHover &&
          "hover:[&_.marquee-track]:[animation-play-state:paused]",
        className,
      )}
    >
      {copyIds.map((copyId) => (
        <div
          key={copyId}
          className={cn(
            "marquee-track flex shrink-0 justify-around gap-[var(--gap)] motion-safe:[animation:marquee_var(--duration)_linear_infinite]",
            vertical &&
              "flex-col motion-safe:[animation-name:marquee-vertical]",
            !vertical && "flex-row",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
