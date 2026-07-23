import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * DataTablePagination Component
 * Reusable pagination controls for data tables
 * Matches Artist.jsx layout with results counter and navigation
 */
export function DataTablePagination({
  table,
  totalRows,
  pageSizeOptions = [10, 20, 30, 40, 50, 100],
  showRowsPerPage = true,
  showPageInfo = true,
  showResultsCount = true,
  showSelectionCount = false,
}) {
  const selectedRows = table.getFilteredSelectedRowModel().rows.length;
  const totalCount =
    typeof totalRows === "number"
      ? totalRows
      : table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
      {/* Left side: Results/Selection counter */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showSelectionCount && selectedRows > 0 ? (
          <div>
            {selectedRows} of {totalCount} row(s) selected
          </div>
        ) : (
          showResultsCount &&
          totalCount > 0 && (
            <div className="hidden sm:block">
              Showing{" "}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{" "}
              to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                totalCount,
              )}{" "}
              of {totalCount} entries
            </div>
          )
        )}
      </div>

      {/* Right side: Page navigation and size selector */}
      <div className="flex items-center gap-2">
        {/* Page info text */}
        {showPageInfo && (
          <div className="flex items-center gap-1 text-sm">
            <span className="hidden sm:inline text-muted-foreground">Page</span>
            <strong>{table.getState().pagination.pageIndex + 1}</strong>
            <span className="hidden sm:inline text-muted-foreground">
              of {table.getPageCount()}
            </span>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Rows per page selector */}
        {showRowsPerPage && (
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-fit">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
