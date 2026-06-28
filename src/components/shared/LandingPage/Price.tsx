import { Link } from "@tanstack/react-router";
import { Check, Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { landingPricingPlans } from "@/features/landing";
import { cn } from "@/lib/utils";
import { MotionBlock, SectionHeader } from "./shared";

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12">
        <SectionHeader
          label="Pricing"
          title="Pick the plan that fits your survey program"
          description="The landing page is ready for launch without inventing final prices before the business model is locked."
        />
        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {landingPricingPlans.map((plan, index) => (
            <MotionBlock key={plan.name} delay={index * 0.06}>
              <div
                className={cn(
                  "relative h-full rounded-2xl",
                  plan.featured &&
                    "bg-linear-to-br from-primary via-chart-1 to-chart-3 p-px lg:scale-[1.02]",
                )}
              >
                <Card className="relative flex h-full flex-col gap-8 rounded-2xl border bg-card p-8 shadow-xs">
                  <CardHeader className="p-0">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="font-medium text-2xl">
                          {plan.name}
                        </CardTitle>
                        {plan.featured ? (
                          <Badge className="h-7 gap-1.5 px-3 text-sm">
                            <Flame className="size-4" aria-hidden="true" />
                            Recommend
                          </Badge>
                        ) : null}
                      </div>
                      <CardDescription className="text-base leading-7">
                        {plan.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-8 p-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-4xl text-foreground sm:text-5xl">
                        {plan.price}
                      </span>
                      {plan.price !== "Coming soon" ? (
                        <span className="text-muted-foreground">/month</span>
                      ) : null}
                    </div>

                    <div className="h-px bg-border" />

                    <ul className="flex flex-1 flex-col gap-4">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-3 text-muted-foreground"
                        >
                          <Check
                            className="size-4 shrink-0 text-foreground"
                            aria-hidden="true"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-0">
                    <Button
                      asChild
                      variant={plan.featured ? "default" : "outline"}
                      className="h-12 w-full rounded-md"
                    >
                      <Link to="/auth/register">Join the waitlist</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
