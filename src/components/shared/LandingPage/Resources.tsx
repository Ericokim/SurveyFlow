import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingFaqs, landingResources } from "@/features/landing";
import { MotionBlock, SectionHeader } from "./shared";

export function ResourcesSection() {
  return (
    <section id="resources" className="scroll-mt-24 px-6 py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col gap-10">
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
                  <Card className="rounded-lg">
                    <CardHeader>
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-lg">
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

        <MotionBlock>
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Frequently asked questions</CardTitle>
              <CardDescription>
                Short answers for the landing page MVP.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {landingFaqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index + 1}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-7">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </MotionBlock>
      </div>
    </section>
  );
}
