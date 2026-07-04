import type { Column, Table as TanStackTable } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  EyeOff,
  Settings2,
} from "lucide-react";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type DataTableColumnHeaderProps<TData, TValue> = ComponentProps<"button"> & {
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
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return (
      <div
        className={cn(
          "flex h-8 items-center text-sm font-medium leading-none text-foreground",
          className,
        )}
      >
        <span className="capitalize">{title}</span>
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn("flex h-8 items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={
              sorted === "desc"
                ? "Sorted descending. Click to sort ascending."
                : sorted === "asc"
                  ? "Sorted ascending. Click to sort descending."
                  : "Not sorted. Click to sort ascending."
            }
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-1 px-0 py-0 text-sm font-medium leading-none text-foreground shadow-none hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent"
          >
            <span className="capitalize">{title}</span>
            {column.getCanSort() && sorted === "desc" ? (
              <ArrowDown
                className="size-4 text-foreground/75"
                aria-hidden="true"
              />
            ) : sorted === "asc" ? (
              <ArrowUp
                className="size-4 text-foreground/75"
                aria-hidden="true"
              />
            ) : (
              <ChevronsUpDown
                className="size-4 text-muted-foreground/70"
                aria-hidden="true"
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() && (
            <>
              <DropdownMenuItem
                aria-label="Sort ascending"
                onClick={() => column.toggleSorting(false)}
              >
                <ArrowUp
                  className="mr-2 size-3.5 text-muted-foreground/70"
                  aria-hidden="true"
                />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem
                aria-label="Sort descending"
                onClick={() => column.toggleSorting(true)}
              >
                <ArrowDown
                  className="mr-2 size-3.5 text-muted-foreground/70"
                  aria-hidden="true"
                />
                Desc
              </DropdownMenuItem>
            </>
          )}

          {column.getCanSort() && column.getCanHide() && (
            <DropdownMenuSeparator />
          )}
          {column.getCanHide() && (
            <DropdownMenuItem
              aria-label="Hide column"
              onClick={() => column.toggleVisibility(false)}
            >
              <EyeOff
                className="mr-2 size-3.5 text-muted-foreground/70"
                aria-hidden="true"
              />
              Hide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type DataTableViewOptionsProps<TData> = ComponentProps<"div"> & {
  table: TanStackTable<TData>;
  triggerLabel?: string;
  tableKey?: string;
};

export function DataTableViewOptions<TData>({
  table,
  className,
  triggerLabel = "Columns",
  tableKey = "default",
  ...props
}: DataTableViewOptionsProps<TData>) {
  const allColumns = useMemo(
    () => table.getAllColumns().filter((col) => col.getCanHide()),
    [table],
  );

  const defaultVisibility = useMemo(
    () =>
      Object.fromEntries(table.getAllColumns().map((col) => [col.id, true])),
    [table],
  );

  const storageKey = `columnVisibility-${tableKey}`;

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as Record<string, boolean>;
      }
    } catch {
      // ignore
    }
    return defaultVisibility;
  });

  useEffect(() => {
    table.setColumnVisibility(columnVisibility);
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch {
      // ignore
    }
  }, [columnVisibility, table, storageKey]);

  const updateVisibility = useCallback(
    (updatedVisibility: Record<string, boolean>) => {
      setColumnVisibility(updatedVisibility);
    },
    [],
  );

  const toggleColumn = useCallback(
    (columnId: string, value: boolean) => {
      updateVisibility({ ...columnVisibility, [columnId]: value });
    },
    [columnVisibility, updateVisibility],
  );

  const resetToDefault = useCallback(() => {
    updateVisibility(defaultVisibility);
  }, [defaultVisibility, updateVisibility]);

  if (!allColumns.length) return null;

  return (
    <div className={cn("flex items-center justify-end", className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 aria-hidden="true" data-icon="inline-start" />
            {triggerLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[230px] p-2">
          <div className="flex items-center justify-between space-x-2 mb-2">
            <Label className="text-sm font-medium">Columns</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefault}
              disabled={
                JSON.stringify(columnVisibility) ===
                JSON.stringify(defaultVisibility)
              }
              className="h-6 text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400 lg:flex"
            >
              Reset
            </Button>
          </div>

          <Separator className="my-2" />

          <div className="max-h-[250px] overflow-auto">
            {allColumns.map((column) => (
              <button
                key={column.id}
                type="button"
                className="group mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent focus:outline-none focus-visible:bg-accent"
                onClick={() =>
                  toggleColumn(column.id, columnVisibility[column.id] === false)
                }
              >
                <Checkbox
                  checked={columnVisibility[column.id] !== false}
                  onCheckedChange={(checked) =>
                    toggleColumn(column.id, !!checked)
                  }
                  id={`column-toggle-${column.id}`}
                  aria-label={`Toggle ${column.id}`}
                  className="pointer-events-none transition-colors group-hover:border-primary/45 group-hover:bg-card group-focus-visible:border-primary/45 group-focus-visible:bg-card data-[state=checked]:group-hover:bg-primary data-[state=checked]:group-focus-visible:bg-primary"
                  tabIndex={-1}
                />
                <Label
                  htmlFor={`column-toggle-${column.id}`}
                  className="flex-1 cursor-pointer text-sm capitalize"
                >
                  {getColumnLabel(column)}
                </Label>
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type DataTablePaginationProps<TData> = ComponentProps<"div"> & {
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
