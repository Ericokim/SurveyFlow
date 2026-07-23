import { useMemo } from "react";
import { Layout } from "../../components/layouts/Layout";
import { SurveyList } from "./SurveyList";
import { Button } from "../../components/ui/button";
import { usePermissions } from "../../hooks/usePermissions";
import { useNavigate } from "@tanstack/react-router";
import { useSurveys } from "../../lib/queries";
import MetricCard from "../../components/shared/MetricCard";
import {
  Plus,
  ClipboardList,
  FileText,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

/**
 * Dashboard Page
 * Main survey management interface with Odoo-style header
 */

export function DashboardPage() {
  const { canEdit } = usePermissions();
  const navigate = useNavigate();

  // Fetch surveys to calculate metrics
  const { data } = useSurveys({});
  const surveys = data?.data || [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = surveys.length;
    const published = surveys.filter((s) => s.status === "published").length;
    const draft = surveys.filter((s) => s.status === "draft").length;
    const closed = surveys.filter((s) => s.status === "closed").length;

    // Total responses (sum across all surveys if available)
    const totalResponses = surveys.reduce(
      (sum, survey) => sum + (survey.responseCount || 0),
      0
    );

    return { total, published, draft, closed, totalResponses };
  }, [surveys]);

  // Odoo-Style Header Component
  const Header = () => (
    <div className="border bg-card rounded-lg">
      <div className="px-4 md:px-6 py-4 md:py-5">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 xl:gap-6">
          {/* Icon + Title Section */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary/5 border border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
                <ClipboardList className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold leading-tight">
                  Surveys
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-muted-foreground text-sm">
                <p className="text-sm text-muted-foreground">
                  Manage your surveys and view responses
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="default"
                onClick={() =>
                  navigate({ to: "/surveys/$id", params: { id: "new" } })
                }
              >
                <Plus className="size-4 mr-1" /> Create Survey
              </Button>
            </div>
          )}
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
          {[
            {
              title: "TOTAL SURVEYS",
              value: metrics.total,
              description: <>All surveys</>,
              icon: FileText,
              badge: { variant: "outline", text: "Total" },
            },
            {
              title: "PUBLISHED",
              value: metrics.published,
              description: <>Live surveys</>,
              icon: CheckCircle2,
              badge: { variant: "outline", text: "Active" },
            },
            {
              title: "DRAFTS",
              value: metrics.draft,
              description: <>Work in progress</>,
              icon: FileText,
              badge: { variant: "outline", text: "Pending" },
            },
            {
              title: "RESPONSES",
              value: metrics.totalResponses,
              description: <>Total submissions</>,
              icon: MessageSquare,
              badge: { variant: "outline", text: "Engagement" },
            },
          ].map((kpi, i) => (
            <MetricCard key={i} {...kpi} className="-py-4 shadow-none" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen text-sm text-foreground leading-relaxed w-full  space-y-4">
        <Header />

        {/* Survey List */}
        <SurveyList />
      </div>
    </Layout>
  );
}
