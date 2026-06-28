import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

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
    <section id="pricing" className="scroll-mt-24 px-6 py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <SectionHeader
          label="Pricing"
          title="Simple packaging while the product matures"
          description="The landing page is ready for launch without inventing final prices before the business model is locked."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {landingPricingPlans.map((plan, index) => (
            <MotionBlock key={plan.name} delay={index * 0.06}>
              <Card
                className={cn(
                  "h-full rounded-lg",
                  plan.featured && "border-primary shadow-lg shadow-primary/10",
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.featured ? <Badge>Popular</Badge> : null}
                  </div>
                  <p className="font-bold text-3xl text-foreground">
                    {plan.price}
                  </p>
                  <CardDescription className="text-base leading-7">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-3 text-sm text-muted-foreground"
                      >
                        <Check
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    variant={plan.featured ? "default" : "outline"}
                    className="w-full"
                  >
                    <Link to="/auth/register">Join the waitlist</Link>
                  </Button>
                </CardFooter>
              </Card>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
