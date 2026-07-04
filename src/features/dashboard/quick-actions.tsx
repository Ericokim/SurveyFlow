import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuickAction } from "@/constants/dashboard";
import { cn } from "@/lib/utils";

export function QuickActions({ data }: { data: QuickAction[] }) {
  return (
    <Card className="gap-0 rounded-xl border-border bg-card py-0 shadow-sm">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="font-bold text-foreground text-lg">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              className="flex min-h-[188px] flex-col items-center justify-between rounded-lg border border-border bg-card p-4 text-center shadow-xs transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-full",
                  action.tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-chart-1/10 text-chart-1",
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-2">
                <span className="font-bold text-foreground">
                  {action.title}
                </span>
                <span className="text-muted-foreground text-sm leading-5">
                  {action.description}
                </span>
              </span>
              <ArrowRight
                className={cn(
                  "size-5",
                  action.tone === "primary" ? "text-primary" : "text-chart-1",
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
