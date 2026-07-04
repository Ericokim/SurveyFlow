import { ArrowUpRight, LayoutTemplate } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingTemplates } from "@/constants/landing";
import { MotionBlock, SectionHeader } from "./shared";

export function TemplatesSection() {
  return (
    <section id="templates" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-12 shadow-xs sm:px-10 lg:px-16 lg:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,color-mix(in_srgb,var(--chart-1)_12%,transparent),transparent_28%),radial-gradient(circle_at_90%_12%,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_30%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionHeader
              align="left"
              label="Templates"
              title="Start with the right survey shape"
              description="Use practical templates for common feedback moments, then tailor branding, questions, and distribution to each audience."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {landingTemplates.map((template, index) => (
                <MotionBlock key={template.title} delay={index * 0.04}>
                  <Card className="group h-full rounded-2xl border bg-background/80 shadow-xs backdrop-blur transition hover:-translate-y-1 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <LayoutTemplate
                            className="size-5"
                            aria-hidden="true"
                          />
                        </div>
                        <ArrowUpRight
                          className="size-5 text-muted-foreground transition group-hover:rotate-45 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <CardTitle className="text-xl font-medium">
                        {template.title}
                      </CardTitle>
                      <CardDescription className="leading-6">
                        {template.description}
                      </CardDescription>
                      <Badge
                        variant="outline"
                        className="mt-2 border-border bg-card text-muted-foreground"
                      >
                        Ready to brand
                      </Badge>
                    </CardHeader>
                  </Card>
                </MotionBlock>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
