import type { Column, Table as TanStackTable } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import type { ComponentProps } from "react";

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

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}

type DataTableColumnHeaderProps<TData, TValue> = ComponentProps<"button"> & {
  column: Column<TData, TValue>;
  title: string;
};

function getColumnLabel<TData, TValue>(column: Column<TData, TValue>) {
  return (
    column.columnDef.meta?.label ??
    column.id
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function getPageItems(pageIndex: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const firstPage = 0;
  const lastPage = pageCount - 1;
  const previousPage = Math.max(pageIndex - 1, firstPage + 1);
  const nextPage = Math.min(pageIndex + 1, lastPage - 1);
  const pages = new Set([
    firstPage,
    previousPage,
    pageIndex,
    nextPage,
    lastPage,
  ]);

  return Array.from(pages)
    .filter((page) => page >= firstPage && page <= lastPage)
    .sort((first, second) => first - second)
    .flatMap((page, index, allPages) => {
      const previous = allPages[index - 1];

      if (index > 0 && page - previous > 1) {
        return ["ellipsis", page] as const;
      }

      return [page] as const;
    });
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          "flex h-8 items-center font-semibold text-muted-foreground text-xs",
          className,
        )}
      >
        {title}
      </div>
    );
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
      {sorted === "asc" ? (
        <ChevronUp aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ChevronUp aria-hidden="true" className="rotate-180" />
      ) : (
        <ChevronsUpDown aria-hidden="true" />
      )}
    </button>
  );
}

type DataTableViewOptionsProps<TData> = ComponentProps<"div"> & {
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
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="flex items-center justify-between gap-3">
            <span>Columns</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => table.resetColumnVisibility()}
            >
              Reset
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(event) => event.preventDefault()}
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

type DataTablePaginationProps<TData> = ComponentProps<"div"> & {
  table: TanStackTable<TData>;
  pageSizeOptions?: number[];
  itemLabel?: string;
};

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [5, 8, 10, 20, 30],
  itemLabel = "rows",
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const rowCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const { pageIndex, pageSize } = table.getState().pagination;
  const firstRow = rowCount ? pageIndex * pageSize + 1 : 0;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rowCount);
  const pageItems = getPageItems(pageIndex, pageCount);

  if (!rowCount) return null;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 border-border border-t px-5 py-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center",
        className,
      )}
      {...props}
    >
      <p className="text-muted-foreground text-sm">
        Showing {firstRow} to {lastRow} of {rowCount} {itemLabel}
      </p>

      <div className="flex items-center justify-center gap-2">
        <Button
          aria-label="Go to first page"
          variant="outline"
          size="icon-sm"
          className="hidden sm:inline-flex"
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

        {pageItems.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex size-8 items-center justify-center text-muted-foreground text-sm"
            >
              ...
            </span>
          ) : (
            <Button
              key={page}
              aria-label={`Go to page ${page + 1}`}
              aria-current={page === pageIndex ? "page" : undefined}
              variant={page === pageIndex ? "default" : "outline"}
              size="icon-sm"
              onClick={() => table.setPageIndex(page)}
            >
              {page + 1}
            </Button>
          ),
        )}

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
          className="hidden sm:inline-flex"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center justify-start gap-2 lg:justify-end">
        <p className="whitespace-nowrap text-muted-foreground text-sm">
          Rows per page
        </p>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="h-8 w-[74px]">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectGroup>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={`${option}`}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
