import React from "react";
import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTablePagination } from "./DataTablePagination";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * DataTable Component
 * Matches Agents.jsx pattern - receives table instance as prop
 * Displays table with toolbar, bulk actions, and pagination
 */
export function DataTable({
  table,
  loading,
  message,
  children, // DataTableToolbar component
  totalRows,
  className,
  emptyMessage = "No data available.",
}) {
  if (!table) {
    return <div>Table instance is required</div>;
  }

  // Check if loading is a boolean or a component
  const isLoadingBoolean = typeof loading === "boolean";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar - passed as children */}
      {children}

      {/* Loading State (if it's a custom component) */}
      {!isLoadingBoolean && loading}

      {/* Error Message */}
      {message}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const tooltip = header.column.columnDef.tooltip;
                  const fallbackTooltipContent =
                    {
                      select: "Selects all rows on this page",
                      actions: "Available actions for the row",
                    }[header.id] || null;

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : tooltip ||
                        fallbackTooltipContent ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tooltip || fallbackTooltipContent}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && isLoadingBoolean ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        table={table}
        totalRows={totalRows}
        showSelectionCount={true}
      />
    </div>
  );
}
