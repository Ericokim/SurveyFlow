import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  BarChart3,
  CirclePause,
  Copy,
  Download,
  Eye,
  Link2,
  Lock,
  Monitor,
  MoreVertical,
  Settings,
  Share2,
  SquarePen,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo } from "react";

import { DataTable, DataTableColumnHeader } from "@/components/shared/Table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type {
  SurveyAccess,
  SurveyRow,
  SurveyStatus,
} from "@/constants/surveys";
import { useDataTable } from "@/hooks/useDataTable";
import { cn } from "@/lib/utils";

const statusLabel: Record<SurveyStatus, string> = {
  published: "Published",
  draft: "Draft",
  closed: "Closed",
};

const statusClassName: Record<SurveyStatus, string> = {
  published: "border-green-200 bg-green-50 text-green-700",
  draft: "border-border bg-secondary text-secondary-foreground",
  closed: "border-amber-200 bg-amber-50 text-amber-700",
};

const accessIcon: Record<SurveyAccess, typeof Link2> = {
  "Open Link": Link2,
  "Whitelist Only": Lock,
};

function formatNumber(value: number | null) {
  return value === null ? null : new Intl.NumberFormat("en-US").format(value);
}

function SurveyActions({ name }: { name: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Open actions for ${name}`}
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Eye aria-hidden="true" />
            Overview
          </DropdownMenuItem>
          <DropdownMenuItem>
            <SquarePen aria-hidden="true" />
            Build
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Monitor aria-hidden="true" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2 aria-hidden="true" />
            Share &amp; Distribute
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Users aria-hidden="true" />
            Responses
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BarChart3 aria-hidden="true" />
            Analytics
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings aria-hidden="true" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Copy aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download aria-hidden="true" />
            Export Responses
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <CirclePause aria-hidden="true" />
          Close Survey
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SurveysTable({ data }: { data: SurveyRow[] }) {
  const columns = useMemo<ColumnDef<SurveyRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all surveys"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 44,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Survey" />
        ),
        cell: ({ row }) => {
          const Icon = row.original.icon;

          return (
            <div className="flex w-[230px] items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground text-sm">
                  {row.original.name}
                </p>
                <p className="truncate text-muted-foreground text-xs">
                  {row.original.category}
                </p>
              </div>
            </div>
          );
        },
        meta: { label: "Survey" },
        enableHiding: false,
        size: 258,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn("rounded-md", statusClassName[row.original.status])}
          >
            {statusLabel[row.original.status]}
          </Badge>
        ),
        meta: { label: "Status" },
        size: 112,
      },
      {
        accessorKey: "responses",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Responses" />
        ),
        cell: ({ row }) => {
          const value = formatNumber(row.original.responses);

          return value === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-semibold text-foreground text-sm tabular-nums">
              {value}
            </span>
          );
        },
        meta: { label: "Responses" },
        size: 108,
      },
      {
        accessorKey: "completionRate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Completion Rate" />
        ),
        cell: ({ row }) => {
          const value = row.original.completionRate;

          if (value === null) {
            return <span className="text-muted-foreground">—</span>;
          }

          return (
            <div className="w-[112px]">
              <span className="font-medium text-foreground text-sm tabular-nums">
                {value}%
              </span>
              <Progress value={value} className="mt-1.5 h-1.5 bg-secondary" />
            </div>
          );
        },
        meta: { label: "Completion Rate" },
        size: 148,
      },
      {
        accessorKey: "access",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Access Mode" />
        ),
        cell: ({ row }) => {
          const Icon = accessIcon[row.original.access];

          return (
            <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {row.original.access}
            </span>
          );
        },
        meta: { label: "Access Mode" },
        size: 150,
      },
      {
        accessorKey: "lastResponseDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Last Response" />
        ),
        cell: ({ row }) =>
          row.original.lastResponseDate ? (
            <div className="w-[104px] text-sm">
              <p className="font-medium text-foreground">
                {row.original.lastResponseDate}
              </p>
              <p className="text-muted-foreground text-xs">
                {row.original.lastResponseTime}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: { label: "Last Response" },
        size: 136,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Updated" />
        ),
        cell: ({ row }) => (
          <div className="w-[104px] text-sm">
            <p className="font-medium text-foreground">
              {row.original.updatedAt}
            </p>
            <p className="text-muted-foreground text-xs">
              {row.original.updatedTime}
            </p>
          </div>
        ),
        meta: { label: "Updated" },
        size: 136,
      },
      {
        id: "actions",
        header: () => (
          <span className="font-semibold text-muted-foreground text-xs">
            Actions
          </span>
        ),
        cell: ({ row }) => <SurveyActions name={row.original.name} />,
        enableSorting: false,
        enableHiding: false,
        size: 72,
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data,
    columns,
    initialPageSize: 100,
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const rowCount = table.getFilteredRowModel().rows.length;
  const firstRow = rowCount ? 1 : 0;

  return (
    <section
      aria-label="Surveys"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-border border-b p-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all surveys"
            />
            <span
              aria-live="polite"
              className="font-medium text-foreground text-sm tabular-nums"
            >
              {selectedCount} selected
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={selectedCount === 0}>
              <Download aria-hidden="true" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" disabled={selectedCount === 0}>
              <Archive aria-hidden="true" />
              Archive
            </Button>
          </div>
        </div>

        <p className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
          Showing {firstRow}–{rowCount} of {rowCount}
        </p>
      </div>

      {/* Table */}
      <DataTable
        table={table}
        showPagination={false}
        emptyMessage="No surveys match your filters."
        containerClassName="rounded-none border-0 bg-transparent"
        className="gap-0 [&_[data-slot=table-head]]:h-10 [&_[data-slot=table-row][data-state=selected]]:bg-primary/[0.05] [&_td]:py-2.5 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4"
      />
    </section>
  );
}
