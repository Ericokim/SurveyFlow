import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import Navbar from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import {
  dashboardMetrics,
  recentSurveys,
  responsePoints,
  topSurveys,
} from "@/constants/dashboard";
import { DashboardMetricCard } from "@/features/dashboard/dashboard-metric-card";
import { RecentSurveysTable } from "@/features/dashboard/recent-surveys-table";
import { ResponsesOverTimeChart } from "@/features/dashboard/responses-over-time-chart";
import { TopPerformingSurveys } from "@/features/dashboard/top-performing-surveys";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <main className="mx-auto flex max-w-[1440px] min-w-0 flex-col gap-5 overflow-x-hidden px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-bold text-4xl text-foreground tracking-normal">
              Dashboard
            </h1>
            <p className="mt-2 max-w-[21rem] text-muted-foreground sm:max-w-none">
              Monitor activity, response trends, and recent surveys.
            </p>
          </div>

          <Button
            size="sm"
            className="h-9 w-full gap-1.5 rounded-lg px-3.5 font-semibold sm:w-auto"
          >
            <Plus className="size-4" aria-hidden="true" />
            New Survey
          </Button>
        </div>

        <section
          aria-label="Dashboard metrics"
          className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0"
        >
          {dashboardMetrics.map((metric) => (
            <DashboardMetricCard key={metric.title} metric={metric} />
          ))}
        </section>

        <section className="grid min-w-0 gap-5 xl:grid-cols-2 [&>*]:min-w-0">
          <RecentSurveysTable data={recentSurveys} />
          <TopPerformingSurveys data={topSurveys} />
        </section>

        <section className="min-w-0">
          <ResponsesOverTimeChart data={responsePoints} />
        </section>
      </main>
    </div>
  );
}
