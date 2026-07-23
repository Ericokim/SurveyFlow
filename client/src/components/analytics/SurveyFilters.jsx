import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent } from "../ui/card";
import {
  SURVEY_STATUS,
  SURVEY_STATUS_LABELS,
} from "../../lib/constants/surveyStatus";

/**
 * Survey Filters
 * Filter surveys by status
 */

export function SurveyFilters({ filters, onFilterChange }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFilterChange("status", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.values(SURVEY_STATUS).map((value) => (
                  <SelectItem key={value} value={value}>
                    {SURVEY_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            {filters.status && (
              <span>
                Showing {SURVEY_STATUS_LABELS[filters.status]} surveys
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
