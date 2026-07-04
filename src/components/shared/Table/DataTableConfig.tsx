import type { Column, Table as TanStackTable } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DataTableColumnHeaderProps<TData, TValue> =
  React.ComponentProps<"button"> & {
    column: Column<TData, TValue>;
    title: string;
  };

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}

function getColumnLabel<TData, TValue>(column: Column<TData, TValue>) {
  return (
    column.columnDef.meta?.label ??
    column.id
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();
  const sortLabel =
    sorted === "asc"
      ? `Sort ${title} descending`
      : sorted === "desc"
        ? `Clear ${title} sorting`
        : `Sort ${title} ascending`;

  function handleSort() {
    if (sorted === "asc") {
      column.toggleSorting(true);
      return;
    }

    if (sorted === "desc") {
      column.clearSorting();
      return;
    }

    column.toggleSorting(false);
  }

  return (
    <button
      type="button"
      className={cn(
        "-ml-2 inline-flex h-8 items-center gap-1 rounded-md px-2 py-1.5 font-semibold text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      aria-label={sortLabel}
      data-sort={sorted || "none"}
      onClick={handleSort}
      {...props}
    >
      <span>{title}</span>
      {sorted === "desc" ? (
        <ChevronDown aria-hidden="true" />
      ) : sorted === "asc" ? (
        <ChevronUp aria-hidden="true" />
      ) : (
        <ChevronsUpDown aria-hidden="true" />
      )}
    </button>
  );
}

type DataTableViewOptionsProps<TData> = React.ComponentProps<"div"> & {
  table: TanStackTable<TData>;
  triggerLabel?: string;
};

export function DataTableViewOptions<TData>({
  table,
  className,
  triggerLabel = "Columns",
  ...props
}: DataTableViewOptionsProps<TData>) {
  const columns = table.getAllColumns().filter((column) => column.getCanHide());

  if (!columns.length) return null;

  return (
    <div className={cn("flex items-center justify-end", className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 aria-hidden="true" data-icon="inline-start" />
            {triggerLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(event) => event.preventDefault()}
                className="capitalize"
              >
                {getColumnLabel(column)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type DataTablePaginationProps<TData> = React.ComponentProps<"div"> & {
  table: TanStackTable<TData>;
  pageSizeOptions?: number[];
};

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [5, 10, 20, 30],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const rowCount = table.getFilteredRowModel().rows.length;

  if (rowCount <= table.getState().pagination.pageSize) return null;

  return (
    <div
      className={cn(
        "flex w-full flex-col-reverse items-center justify-between gap-4 pt-3 sm:flex-row",
        className,
      )}
      {...props}
    >
      <p className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        {table.getFilteredSelectedRowModel().rows.length} of {rowCount} row(s)
        selected.
      </p>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-2 md:flex">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[74px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <p className="whitespace-nowrap font-medium text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </p>

        <div className="flex items-center gap-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft aria-hidden="true" />
          </Button>
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon-sm"
            className="hidden lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
