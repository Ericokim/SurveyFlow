import { ArrowDown, ArrowUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetric } from "@/constants/dashboard";
import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  metric: DashboardMetric;
};

function Sparkline({ values, tone }: { values: number[]; tone: string }) {
  const width = 132;
  const height = 58;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Metric trend sparkline"
      className="h-14 w-28 shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={tone === "primary" ? "var(--primary)" : "var(--chart-1)"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <circle
        cx={width}
        cy={
          height -
          ((values[values.length - 1] - min) / range) * (height - 8) -
          4
        }
        r="3"
        fill={tone === "primary" ? "var(--primary)" : "var(--chart-1)"}
      />
    </svg>
  );
}

export function DashboardMetricCard({ metric }: DashboardMetricCardProps) {
  const Icon = metric.icon;
  const DirectionIcon = metric.direction === "up" ? ArrowUp : ArrowDown;

  return (
    <Card className="gap-0 rounded-xl border-border bg-card py-0 shadow-sm">
      <CardContent className="relative min-h-[138px] p-5">
        <div
          className={cn(
            "absolute top-6 left-5 flex size-16 items-center justify-center rounded-full",
            metric.tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-chart-1/10 text-chart-1",
          )}
        >
          <Icon className="size-7" aria-hidden="true" />
        </div>

        <div className="min-w-0 pl-20">
          <CardHeader className="p-0">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <p className="mt-3 font-bold text-2xl text-foreground tracking-normal">
            {metric.value}
          </p>
        </div>

        <div className="absolute right-5 bottom-7 hidden sm:block">
          <Sparkline values={metric.sparkline} tone={metric.tone} />
        </div>

        <div className="absolute bottom-5 left-5 flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-green-600">
            <DirectionIcon className="size-4" aria-hidden="true" />
            {metric.trend}
          </span>
          <span className="text-muted-foreground">{metric.trendLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
