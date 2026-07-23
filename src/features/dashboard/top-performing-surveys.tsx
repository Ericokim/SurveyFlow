import { ArrowUp, ChevronRight, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TopSurvey } from "@/constants/dashboard";

export function TopPerformingSurveys({ data }: { data: TopSurvey[] }) {
  return (
    <Card className="gap-0 rounded-xl border-border bg-card py-0 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-3 p-5 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-bold text-foreground text-lg">
          Top Performing Surveys
        </CardTitle>
        <CardAction className="col-auto row-auto justify-self-start sm:justify-self-end">
          <Button variant="ghost" size="sm">
            View full report
            <ChevronRight aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0">
        {data.map((survey) => (
          <div
            key={survey.rank}
            className="flex min-w-0 items-center gap-3 border-border border-t px-5 py-3.5"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-muted-foreground text-xs">
              {survey.rank}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="truncate font-semibold text-foreground text-sm">
                  {survey.title}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold text-foreground text-sm tabular-nums">
                    {survey.responseRate}%
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-green-50 px-1.5 py-0.5 font-semibold text-green-700 text-xs tabular-nums">
                    <ArrowUp className="size-3" aria-hidden="true" />
                    {survey.trend}
                  </span>
                </div>
              </div>
              <Progress value={survey.responseRate} className="h-1.5" />
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 border-border border-t px-5 py-3.5 text-muted-foreground text-sm">
          <Trophy className="size-4 text-primary" aria-hidden="true" />
          Ranked by response rate
        </div>
      </CardContent>
    </Card>
  );
}
