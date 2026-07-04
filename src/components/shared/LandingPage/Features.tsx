import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingFeatures } from "@/constants/landing";
import { cn } from "@/lib/utils";
import { MotionBlock } from "./shared";

const featureHighlights = landingFeatures.slice(0, 3);
const featureImages = [
  {
    src: "/brand/auth/survey-overview.png",
    alt: "SurveyFlow survey overview screen",
  },
  {
    src: "/brand/auth/respondent-access.png",
    alt: "SurveyFlow respondent access screen",
  },
  {
    src: "/brand/auth/analytics-insights.png",
    alt: "SurveyFlow analytics insights screen",
  },
] as const;

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
            <div className="grid gap-4 sm:grid-cols-2">
              {featureImages.map((image, index) => (
                <div
                  key={image.src}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-background shadow-xl shadow-primary/5",
                    index === 0 && "sm:col-span-2",
                  )}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className={cn(
                      "w-full object-cover object-left-top",
                      index === 0 ? "aspect-[16/9]" : "aspect-[4/3]",
                    )}
                  />
                </div>
              ))}
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
