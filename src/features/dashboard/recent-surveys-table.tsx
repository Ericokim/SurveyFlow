import type { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Download,
  Edit3,
  Eye,
  MoreVertical,
  Share2,
  Square,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  DataTableViewOptions,
} from "@/components/shared/Table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { RecentSurvey, SurveyStatus } from "@/constants/dashboard";
import { useDataTable } from "@/hooks/useDataTable";
import { cn } from "@/lib/utils";

const statusLabel: Record<SurveyStatus, string> = {
  active: "Active",
  draft: "Draft",
  closed: "Closed",
};

const statusClassName: Record<SurveyStatus, string> = {
  active: "border-green-200 bg-green-50 text-green-700",
  draft: "border-border bg-secondary text-secondary-foreground",
  closed: "border-border bg-muted text-muted-foreground",
};

function formatNumber(value: number | null) {
  return value === null ? "-" : new Intl.NumberFormat("en-US").format(value);
}

function SurveyIcon({ survey }: { survey: RecentSurvey }) {
  const Icon = survey.icon;

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md",
        survey.tone === "primary"
          ? "bg-primary/10 text-primary"
          : "bg-chart-1/10 text-chart-1",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function SurveyActions({ title }: { title: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Open actions for ${title}`}
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Eye aria-hidden="true" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit3 aria-hidden="true" />
            Edit survey
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy aria-hidden="true" />
            Duplicate survey
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share2 aria-hidden="true" />
            Share survey
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Square aria-hidden="true" />
            View responses
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download aria-hidden="true" />
            Export CSV
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <XCircle aria-hidden="true" />
          Close survey
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RecentSurveysTable({ data }: { data: RecentSurvey[] }) {
  const columns = useMemo<ColumnDef<RecentSurvey>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Survey" />
        ),
        cell: ({ row }) => (
          <div className="flex w-[250px] items-center gap-3">
            <SurveyIcon survey={row.original} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground text-sm">
                {row.original.title}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {row.original.category}
              </p>
            </div>
          </div>
        ),
        meta: {
          label: "Survey",
        },
        enableHiding: false,
        size: 282,
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
        meta: {
          label: "Status",
        },
        size: 82,
      },
      {
        accessorKey: "responses",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Responses" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-foreground text-sm">
            {formatNumber(row.original.responses)}
          </span>
        ),
        meta: {
          label: "Responses",
        },
        size: 92,
      },
      {
        accessorKey: "responseRate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Response Rate" />
        ),
        cell: ({ row }) => {
          const value = row.original.responseRate;

          if (value === null) {
            return <span className="text-muted-foreground">-</span>;
          }

          return (
            <div className="w-[104px]">
              <span className="text-foreground text-sm">{value}%</span>
              <Progress value={value} className="mt-2 h-1.5 bg-secondary" />
            </div>
          );
        },
        meta: {
          label: "Response Rate",
        },
        size: 120,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Updated" />
        ),
        cell: ({ row }) => (
          <div className="w-[108px] text-sm">
            <p className="font-medium text-foreground">
              {row.original.updatedAt}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              {row.original.updatedTime}
            </p>
          </div>
        ),
        meta: {
          label: "Updated",
        },
        size: 124,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <SurveyActions title={row.original.title} />,
        enableSorting: false,
        enableHiding: false,
        meta: {
          label: "Actions",
        },
        size: 60,
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data,
    columns,
    initialPageSize: 5,
  });

  return (
    <Card className="gap-0 rounded-xl border-border bg-card py-0 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-3 p-5 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-bold text-foreground text-lg">
          Recent Surveys
        </CardTitle>
        <CardAction className="col-auto row-auto flex items-center gap-2 justify-self-start sm:justify-self-end">
          <DataTableViewOptions table={table} />
          <Button variant="outline" size="sm">
            View all surveys
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          table={table}
          showPagination={false}
          emptyMessage="No recent surveys found."
          containerClassName="rounded-none border-x-0 border-b-0"
          className="[&_[data-slot=table-container]]:overflow-x-auto [&_[data-slot=table-head]]:h-10 [&_[data-slot=table-row]]:last:border-b-0 [&_table]:min-w-[760px] [&_table]:table-fixed [&_td]:h-[57px] [&_th:first-child]:pl-5 [&_td:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:last-child]:pr-5"
        />
      </CardContent>
    </Card>
  );
}
