import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingFeatures } from "@/features/landing";
import { MotionBlock } from "./shared";

const featureHighlights = landingFeatures.slice(0, 3);

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[1440px] rounded-3xl border bg-card px-6 py-12 shadow-xs sm:px-10 lg:px-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <MotionBlock className="flex flex-col items-start gap-8">
            <div className="flex flex-col gap-5">
              <span className="rounded-full px-3 py-1 text-primary text-sm outline outline-border">
                Features
              </span>
              <h2 className="max-w-2xl font-medium text-4xl text-foreground tracking-normal sm:text-5xl">
                Everything needed to run controlled survey programs
              </h2>
              <p className="max-w-2xl text-base text-muted-foreground leading-7 sm:text-lg">
                SurveyFlow keeps the workflow simple: build, brand, send,
                restrict, analyze, and export from one focused surface.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {featureHighlights.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="flex items-start gap-4 text-muted-foreground"
                  >
                    <Icon
                      className="mt-1 size-5 shrink-0 text-foreground"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-foreground">
                        {feature.title}
                      </p>
                      <p className="max-w-xl text-sm leading-6">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button asChild variant="outline" className="h-11 rounded-md px-5">
              <Link to="/auth/register">
                Learn more
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </MotionBlock>

          <MotionBlock delay={0.12}>
            <div className="relative overflow-hidden rounded-2xl border bg-background shadow-xl shadow-primary/5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--chart-1)_18%,transparent),transparent_32%),radial-gradient(circle_at_80%_20%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_34%)]" />
              <img
                src="/brand/illustrations/landing-dashboard-preview.svg"
                alt="SurveyFlow analytics dashboard preview"
                className="relative aspect-[4/3] w-full object-cover object-left-top sm:aspect-[16/11]"
              />
            </div>
          </MotionBlock>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {landingFeatures.slice(3).map((feature, index) => {
            const Icon = feature.icon;

            return (
              <MotionBlock key={feature.title} delay={index * 0.04}>
                <div className="flex h-full flex-col gap-3 rounded-2xl border bg-background/80 p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-md">
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium text-xl text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-7">
                    {feature.description}
                  </p>
                </div>
              </MotionBlock>
            );
          })}
        </div>
      </div>
    </section>
  );
}
