import { motion, useReducedMotion } from "framer-motion";
import { Check, Send } from "lucide-react";
import type { ReactNode } from "react";

import { Navbar } from "@/components/shared/Navbar";
import { authPreviewDots, authPreviewRows } from "@/features/auth";
import { cn } from "@/lib/utils";

type AuthPageShellProps = AuthMarketingContent & {
  children: ReactNode;
  formLabel: string;
};

export function AuthPageShell({
  benefits,
  children,
  description,
  formLabel,
  title = (
    <>
      The smarter way
      <br />
      to run surveys
    </>
  ),
}: AuthPageShellProps) {
  const shouldReduceMotion = useReducedMotion();
  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { y: 10 },
        animate: { y: 0 },
        transition: { duration: 0.25, ease: "easeOut" },
      };

  return (
    <main className="min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <Navbar variant="auth" />

      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden lg:h-[calc(100vh-4rem)]">
        <div className="absolute inset-y-0 left-[43%] hidden w-px bg-border/70 lg:block" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_10%_43%,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_27rem)]"
        />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full items-start gap-8 px-6 py-8 md:px-10 lg:h-full lg:min-h-0 lg:grid-cols-2 lg:px-20 lg:pt-10 lg:pb-4 xl:px-28 2xl:px-36">
          <motion.aside
            {...motionProps}
            className="mx-auto flex w-full max-w-[560px] flex-col lg:mx-0 lg:pl-0"
          >
            <p className="font-extrabold text-3xl text-foreground leading-tight tracking-normal xl:text-4xl">
              {title}
            </p>
            <p className="mt-2 max-w-md text-muted-foreground text-sm leading-6">
              {description}
            </p>

            <ProductPreview />
            <BenefitList benefits={benefits} />
          </motion.aside>

          <motion.section
            {...motionProps}
            className="flex w-full justify-center"
            aria-label={formLabel}
          >
            {children}
          </motion.section>
        </div>
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mt-4 hidden w-full max-w-[410px] lg:block"
    >
      <div className="-left-6 absolute top-7 size-20 rounded-full bg-primary/10" />
      <div className="absolute -right-2 top-12 grid grid-cols-5 gap-1.5 opacity-35">
        {authPreviewDots.map((dot) => (
          <span key={dot} className="size-1 rounded-full bg-primary" />
        ))}
      </div>
      <Send className="absolute -right-5 -top-1 size-9 rotate-12 fill-chart-1/30 text-chart-1 drop-shadow-sm" />

      <div className="-rotate-3 relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-xl shadow-foreground/10">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div className="rounded-xl border border-border bg-background p-2.5 shadow-sm">
            <p className="font-bold text-[11px] text-foreground">
              Survey Overview
            </p>
            <p className="mt-1 font-extrabold text-lg text-foreground">4,782</p>
            <p className="font-bold text-[11px] text-chart-3">up 18%</p>
            <svg
              className="mt-1 h-7 w-24 text-primary"
              viewBox="0 0 128 36"
              fill="none"
              role="presentation"
            >
              <path
                d="M2 28C20 12 29 31 43 20C54 11 58 3 73 15C87 26 98 22 126 3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
          </div>

          <div className="flex size-18 items-center justify-center rounded-full border-[7px] border-primary/20 bg-background shadow-sm">
            <div className="text-center">
              <p className="font-extrabold text-base text-foreground">68.4%</p>
              <p className="text-[9px] text-muted-foreground">Response Rate</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-background/80 p-2.5">
          {authPreviewRows.map((row) => (
            <div key={row.title} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg",
                  row.tone,
                )}
              >
                <Check className="size-3.5" />
              </span>
              <span
                className={cn("h-2 rounded-full bg-muted", row.widthClassName)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenefitList({ benefits }: { benefits: readonly AuthBenefit[] }) {
  return (
    <div className="mt-5 flex flex-col gap-3.5">
      {benefits.map((benefit) => {
        const Icon = benefit.icon;

        return (
          <div key={benefit.title} className="flex gap-3.5">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm",
                benefit.tone,
              )}
            >
              <Icon className="size-4.5" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="font-extrabold text-[15px] text-foreground leading-tight">
                {benefit.title}
              </h2>
              <p className="max-w-sm text-muted-foreground text-[13px] leading-5">
                {benefit.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-5 items-center justify-center rounded-full font-extrabold text-primary"
    >
      G
    </span>
  );
}
