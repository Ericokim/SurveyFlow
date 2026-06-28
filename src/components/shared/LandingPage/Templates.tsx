import { LayoutTemplate } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingTemplates } from "@/features/landing";
import { MotionBlock, SectionHeader } from "./shared";

export function TemplatesSection() {
  return (
    <section id="templates" className="scroll-mt-24 px-6 py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <SectionHeader
          align="left"
          label="Templates"
          title="Start with the right survey shape"
          description="Use practical templates for common feedback moments, then tailor branding, questions, and distribution to each audience."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {landingTemplates.map((template, index) => (
            <MotionBlock key={template.title} delay={index * 0.04}>
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <LayoutTemplate
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                    {template.title}
                  </CardTitle>
                  <CardDescription className="leading-6">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
