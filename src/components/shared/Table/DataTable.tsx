import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import type { ComponentProps, ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./DataTableConfig";

type DataTableProps<TData> = ComponentProps<"div"> & {
  table: TanStackTable<TData>;
  actionBar?: ReactNode;
  containerClassName?: string;
  emptyMessage?: string;
  itemLabel?: string;
  paginationClassName?: string;
  pageSizeOptions?: number[];
  showPagination?: boolean;
};

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  containerClassName,
  emptyMessage = "No results.",
  itemLabel,
  paginationClassName,
  pageSizeOptions,
  showPagination = true,
  ...props
}: DataTableProps<TData>) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)} {...props}>
      {children}
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card",
          containerClassName,
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="whitespace-nowrap"
                    style={{ minWidth: header.getSize() }}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : header.column.getCanSort()
                            ? "none"
                            : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ minWidth: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination ? (
        <DataTablePagination
          className={paginationClassName}
          itemLabel={itemLabel}
          pageSizeOptions={pageSizeOptions}
          table={table}
        />
      ) : null}
      {actionBar && table.getFilteredSelectedRowModel().rows.length > 0
        ? actionBar
        : null}
    </div>
  );
}
