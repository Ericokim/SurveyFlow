import { CalendarDays, type LucideIcon, RotateCcw, Search } from "lucide-react";

import { CustomFormField } from "@/components/shared/inputs/custom-form-field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SurveyFilterOption } from "@/constants/surveys";

export type SurveyFiltersState = {
  search: string;
  status: string;
  owner: string;
  access: string;
  dateRange: string;
};

type SurveyFiltersProps = {
  value: SurveyFiltersState;
  onChange: (next: Partial<SurveyFiltersState>) => void;
  onReset: () => void;
  statusOptions: SurveyFilterOption[];
  ownerOptions: SurveyFilterOption[];
  accessOptions: SurveyFilterOption[];
  dateRangeOptions: SurveyFilterOption[];
};

type FilterSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SurveyFilterOption[];
  icon?: LucideIcon;
};

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  icon: Icon,
}: FilterSelectProps) {
  return (
    <div className="flex h-12 min-w-0 flex-col justify-center gap-1 rounded-xl border border-border bg-card px-3 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
      <span className="font-medium text-[11px] text-muted-foreground leading-none">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          size="sm"
          aria-label={label}
          className="h-4 w-full gap-2 border-0 bg-transparent p-0 font-semibold text-foreground text-sm leading-none shadow-none focus-visible:ring-0 dark:bg-transparent [&>svg]:size-4 [&>svg]:opacity-60"
        >
          {Icon ? (
            <Icon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          ) : null}
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function SurveysFilters({
  value,
  onChange,
  onReset,
  statusOptions,
  ownerOptions,
  accessOptions,
  dateRangeOptions,
}: SurveyFiltersProps) {
  return (
    <section
      aria-label="Filter surveys"
      className="rounded-xl border border-border bg-card p-3 shadow-sm md:p-4"
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] xl:items-center">
        <CustomFormField
          icon={Search}
          type="search"
          placeholder="Search surveys..."
          aria-label="Search surveys"
          value={value.search}
          onChange={(event) => onChange({ search: event.target.value })}
          controlClassName="h-12 rounded-xl"
        />

        <FilterSelect
          label="Status"
          value={value.status}
          onValueChange={(status) => onChange({ status })}
          options={statusOptions}
        />
        <FilterSelect
          label="Owner"
          value={value.owner}
          onValueChange={(owner) => onChange({ owner })}
          options={ownerOptions}
        />
        <FilterSelect
          label="Access Mode"
          value={value.access}
          onValueChange={(access) => onChange({ access })}
          options={accessOptions}
        />
        <FilterSelect
          label="Date Range"
          value={value.dateRange}
          onValueChange={(dateRange) => onChange({ dateRange })}
          options={dateRangeOptions}
          icon={CalendarDays}
        />

        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-10 gap-2 justify-self-stretch sm:col-span-2 xl:col-auto xl:justify-self-center"
        >
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
      </div>
    </section>
  );
}
