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
      <CardHeader className="flex flex-col items-start gap-3 p-5 pb-2 sm:flex-row sm:items-center sm:justify-between">
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
      <CardContent className="flex flex-col gap-3 p-5 pt-0">
        {data.map((survey) => (
          <div
            key={survey.rank}
            className="grid min-w-0 grid-cols-[32px_1fr] gap-3"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-semibold text-muted-foreground text-sm">
              {survey.rank}
            </span>
            <div className="flex min-w-0 flex-col gap-2 border-border border-b pb-2 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(120px,220px)_64px_58px] sm:items-center sm:gap-4">
              <p className="truncate font-semibold text-foreground text-sm">
                {survey.title}
              </p>
              <Progress value={survey.responseRate} className="h-1.5" />
              <div className="flex flex-col items-start gap-2 sm:contents">
                <p className="font-bold text-foreground text-sm">
                  {survey.responseRate}%
                </p>
                <span className="inline-flex items-center justify-center gap-1 rounded-md bg-green-50 px-2 py-1 font-semibold text-green-700 text-xs">
                  <ArrowUp className="size-3" aria-hidden="true" />
                  {survey.trend}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
          <Trophy className="size-4 text-primary" aria-hidden="true" />
          Ranked by response rate
        </div>
      </CardContent>
    </Card>
  );
}
