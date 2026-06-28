import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingFeatures } from "@/features/landing";
import { MotionBlock, SectionHeader } from "./shared";

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 px-6 py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <SectionHeader
          label="Features"
          title="Everything needed to run controlled survey programs"
          description="SurveyFlow keeps the workflow simple: build, brand, send, restrict, analyze, and export from one focused surface."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <MotionBlock key={feature.title} delay={index * 0.04}>
                <Card className="h-full rounded-lg border-primary/10 shadow-xs transition hover:-translate-y-1 hover:shadow-md">
                  <CardHeader>
                    <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-7">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </MotionBlock>
            );
          })}
        </div>
      </div>
    </section>
  );
}
