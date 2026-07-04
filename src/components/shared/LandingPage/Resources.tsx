import { Link } from "@tanstack/react-router";
import { ArrowUpRight, PlusIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingFaqs, landingResources } from "@/constants/landing";
import { cn } from "@/lib/utils";
import { MotionBlock, SectionHeader } from "./shared";

export function ResourcesSection() {
  return (
    <section id="resources" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeader
            align="left"
            label="Resources"
            title="Guidance for better feedback operations"
            description="Give teams the playbooks they need to launch reliable survey workflows and prepare for deeper integrations."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {landingResources.map((resource, index) => {
              const Icon = resource.icon;

              return (
                <MotionBlock key={resource.title} delay={index * 0.04}>
                  <Card className="group h-full rounded-2xl border bg-card shadow-xs transition hover:-translate-y-1 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </div>
                        <ArrowUpRight
                          className="size-5 text-muted-foreground transition group-hover:rotate-45 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <CardTitle className="font-medium text-xl">
                        {resource.title}
                      </CardTitle>
                      <CardDescription className="leading-6">
                        {resource.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </MotionBlock>
              );
            })}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <SectionHeader
            align="left"
            label="FAQs"
            title="Got questions? We have answers ready"
            description="Short answers for teams evaluating SurveyFlow for controlled, branded feedback programs."
          />

          <MotionBlock>
            <Accordion
              type="single"
              collapsible
              className="flex flex-col gap-5"
            >
              {landingFaqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={faq.question}
                  className={cn(
                    "group/item flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-xs transition-colors data-[state=open]:bg-accent/40",
                    index === 0 && "motion-safe:animate-in motion-safe:fade-in",
                  )}
                >
                  <AccordionTrigger className="cursor-pointer p-0 text-left font-medium text-xl hover:no-underline [&>svg]:hidden">
                    <span>{faq.question}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-foreground transition-transform group-data-[state=open]/item:rotate-45">
                      <PlusIcon className="size-4" aria-hidden="true" />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 text-base text-muted-foreground leading-7">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </MotionBlock>
        </div>

        <MotionBlock>
          <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-16 shadow-xs sm:px-12 lg:px-16 lg:py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_45%,color-mix(in_srgb,var(--chart-1)_16%,transparent),transparent_32%),radial-gradient(circle_at_82%_40%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_34%)]" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <h2 className="font-medium text-3xl text-foreground tracking-normal md:text-5xl">
                  Ready to launch better survey workflows?
                </h2>
                <p className="max-w-2xl text-muted-foreground leading-7">
                  Build branded surveys, invite the right audience, and turn
                  responses into decisions from one focused workspace.
                </p>
              </div>
              <Button
                asChild
                className="group relative h-12 w-fit cursor-pointer overflow-hidden rounded-full p-1 ps-6 pe-14 font-medium text-sm transition-all duration-500 hover:ps-14 hover:pe-6"
              >
                <Link to="/auth/register">
                  <span className="relative z-10 transition-all duration-500">
                    Get started
                  </span>
                  <span className="absolute right-1 flex size-10 items-center justify-center rounded-full bg-background text-foreground transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
