import { createFileRoute } from "@tanstack/react-router";
import { CirclePlus, Info } from "lucide-react";
import { useMemo, useState } from "react";

import Navbar from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import {
  surveyAccessFilters,
  surveyDateRangeFilters,
  surveyOwnerFilters,
  surveyStatusFilters,
  surveys,
} from "@/constants/surveys";
import {
  type SurveyFiltersState,
  SurveysFilters,
} from "@/features/surveys/surveys-filters";
import { SurveysTable } from "@/features/surveys/surveys-table";

export const Route = createFileRoute("/app/surveys")({
  component: SurveysPage,
});

const initialFilters: SurveyFiltersState = {
  search: "",
  status: "all",
  owner: "all",
  access: "all",
  dateRange: "90",
};

function SurveysPage() {
  const [filters, setFilters] = useState<SurveyFiltersState>(initialFilters);

  const filteredSurveys = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return surveys.filter((survey) => {
      const matchesSearch =
        query === "" ||
        survey.name.toLowerCase().includes(query) ||
        survey.category.toLowerCase().includes(query);
      const matchesStatus =
        filters.status === "all" || survey.status === filters.status;
      const matchesOwner =
        filters.owner === "all" || survey.owner.name === filters.owner;
      const matchesAccess =
        filters.access === "all" || survey.access === filters.access;

      return matchesSearch && matchesStatus && matchesOwner && matchesAccess;
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <main className="mx-auto flex max-w-[1440px] min-w-0 flex-col gap-4 overflow-x-hidden px-4 py-6 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-bold text-3xl text-foreground tracking-normal">
              Surveys
            </h1>
            <p className="mt-1.5 max-w-md text-muted-foreground">
              Create, manage, and analyze surveys across your organization.
            </p>
          </div>

          <Button className="h-9 w-full gap-1.5 rounded-lg px-3.5 font-semibold sm:w-auto">
            <CirclePlus className="size-4" aria-hidden="true" />
            New Survey
          </Button>
        </div>

        <SurveysFilters
          value={filters}
          onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
          onReset={() => setFilters(initialFilters)}
          statusOptions={surveyStatusFilters}
          ownerOptions={surveyOwnerFilters}
          accessOptions={surveyAccessFilters}
          dateRangeOptions={surveyDateRangeFilters}
        />

        <SurveysTable data={filteredSurveys} />

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-5 py-4 text-sm shadow-sm sm:flex-row sm:items-center sm:gap-3">
          <span className="flex items-start gap-3 text-muted-foreground sm:items-center">
            <Info
              className="mt-0.5 size-4 shrink-0 text-chart-1 sm:mt-0"
              aria-hidden="true"
            />
            Surveys are specific to the Acme Health workspace. Switch workspaces
            to view other surveys.
          </span>
          <button
            type="button"
            className="rounded-sm text-left font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:ml-auto"
          >
            Manage Workspaces
          </button>
        </div>
      </main>
    </div>
  );
}
