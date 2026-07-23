import { useMemo } from "react";
import { Layout } from "../../components/layouts/Layout";
import { SurveyList } from "./SurveyList";
import { Button } from "../../components/ui/button";
import { usePermissions } from "../../hooks/usePermissions";
import { useNavigate } from "@tanstack/react-router";
import { useSurveys } from "../../lib/queries";
import { SurveyMetricCard } from "../../components/dashboard/SurveyMetricCard";
import {
  Plus,
  ClipboardList,
  FileText,
  CheckCircle2,
  MessageSquare,
  FilePen,
} from "lucide-react";

/**
 * Dashboard Page
 * Main survey management interface with Odoo-style header
 */

export function DashboardPage() {
  const { canEdit } = usePermissions();
  const navigate = useNavigate();

  // Fetch surveys to calculate metrics.
  //
  // The API defaults to pageSize=10, so calling this with no params made every
  // tile a page-1 sample presented as a portfolio total — correct only while a
  // workspace had 10 or fewer surveys. Request a ceiling well above realistic
  // workspace sizes and take the count from the server's own paging meta, which
  // is exact regardless of what we fetched.
  //
  // The real fix is a company-scoped overview endpoint that aggregates these
  // server-side; until then `truncated` below keeps us honest rather than
  // quietly under-reporting.
  const { data } = useSurveys({ pageSize: 200 });
  const surveys = data?.data || [];
  const reportedTotal = data?.paging?.total;

  // Calculate metrics
  const metrics = useMemo(() => {
    // Prefer the server's count; fall back to what we loaded.
    const total = reportedTotal ?? surveys.length;
    // True when the workspace outgrew the ceiling above, so the status mix and
    // response roll-up describe a subset. Surfaced in the captions rather than
    // presented as portfolio figures.
    const truncated = surveys.length < total;
    const publishedList = surveys.filter((s) => s.status === "published");
    const draftList = surveys.filter((s) => s.status === "draft");
    const closed = surveys.filter((s) => s.status === "closed").length;

    // Total responses (sum across all surveys if available)
    const totalResponses = surveys.reduce(
      (sum, survey) => sum + (survey.responseCount || 0),
      0
    );

    // Responses per recent survey. This is the one metric with genuine variation
    // to show: the list carries no per-response timestamps, so a time series
    // would have to be invented.
    const recentResponses = [...surveys]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8)
      .reverse()
      .map((s) => s.responseCount || 0);

    return {
      total,
      truncated,
      published: publishedList.length,
      draft: draftList.length,
      closed,
      totalResponses,
      recentResponses,
    };
  }, [surveys, reportedTotal]);

  // A plain element, not a nested component: defining a component during render
  // remounts the whole header on every state change, which also restarts the
  // meter transitions.
  const header = (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Brand rail across the top of the whole panel. */}
      <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
      <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/4 to-transparent" />

      <div className="relative px-4 py-5 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <ClipboardList className="size-6" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                Surveys
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Manage your surveys and view responses
              </p>
            </div>
          </div>

          {canEdit && (
            <Button
              variant="default"
              className="w-full shrink-0 sm:w-auto"
              onClick={() =>
                navigate({ to: "/surveys/$id", params: { id: "new" } })
              }
            >
              <Plus className="mr-1 size-4" /> Create Survey
            </Button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SurveyMetricCard
            label="Total surveys"
            value={metrics.total}
            caption="Status mix"
            icon={FileText}
            accent="blue"
            viz={{
              type: "segments",
              label: `${metrics.published} published, ${metrics.draft} draft, ${metrics.closed} closed`,
              parts: [
                { key: "published", value: metrics.published, className: "bg-chart-4" },
                { key: "draft", value: metrics.draft, className: "bg-chart-3" },
                { key: "closed", value: metrics.closed, className: "bg-muted-foreground/40" },
              ],
            }}
          />
          <SurveyMetricCard
            label="Published"
            value={metrics.published}
            caption="Live surveys"
            icon={CheckCircle2}
            accent="green"
            viz={{
              type: "meter",
              value: metrics.published,
              total: metrics.total,
              label: `${metrics.published} of ${metrics.total} surveys are live`,
            }}
          />
          <SurveyMetricCard
            label="Drafts"
            value={metrics.draft}
            caption="Work in progress"
            icon={FilePen}
            accent="amber"
            viz={{
              type: "meter",
              value: metrics.draft,
              total: metrics.total,
              label: `${metrics.draft} of ${metrics.total} surveys are unpublished`,
            }}
          />
          <SurveyMetricCard
            label="Responses"
            value={metrics.totalResponses}
            caption={
              metrics.truncated
                ? `Across the ${metrics.recentResponses.length} most recent surveys`
                : "Total submissions"
            }
            icon={MessageSquare}
            accent="coral"
            viz={{
              type: "bars",
              series: metrics.recentResponses,
              label: "Responses per recent survey",
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen text-sm text-foreground leading-relaxed w-full  space-y-4">
        {header}

        {/* Survey List */}
        <SurveyList />
      </div>
    </Layout>
  );
}
