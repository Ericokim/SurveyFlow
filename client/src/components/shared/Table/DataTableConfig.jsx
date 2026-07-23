import {
  Search,
  X,
  Download,
  Settings2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import * as React from "react";
import { cn } from "@/lib/utils";
import { DataTableExportOptions } from "./DataTableExportOptions";

/**
 * DataTableColumnHeader Component
 * Sortable column header with indicators
 */
export function DataTableColumnHeader({ column, title, className }) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}

/**
 * DataTableToolbar Component
 * Matches Agents.jsx pattern exactly
 * Provides search, filters, page size, export, and view options
 */
export function DataTableToolbar({
  table,
  tableKey,
  Export = false,
  exportOptions = null,
  onSearch,
  searchOnEnter = false,
  resetSearchSignal = 0,
  filterFields = [],
  pageSizeOptions = [10, 20, 30, 40, 50],
  children, // DataTableToolbarActions
}) {
  const [searchValue, setSearchValue] = React.useState("");
  const defaultVisibilityRef = React.useRef(table.getState().columnVisibility);

  React.useEffect(() => {
    setSearchValue("");
    if (filterFields.length > 0) {
      const field = filterFields[0];
      table.getColumn(field.value)?.setFilterValue("");
    }
  }, [resetSearchSignal]);

  const handleSearchChange = (value) => {
    setSearchValue(value);
    if (!searchOnEnter && filterFields.length > 0) {
      const field = filterFields[0];
      table.getColumn(field.value)?.setFilterValue(value);
    }
  };

  const handleSearchSubmit = () => {
    const nextValue = searchValue || "";
    if (searchOnEnter && filterFields.length > 0) {
      const field = filterFields[0];
      table.getColumn(field.value)?.setFilterValue(nextValue);
    }
    if (onSearch) {
      onSearch(nextValue);
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    if (filterFields.length > 0) {
      const field = filterFields[0];
      table.getColumn(field.value)?.setFilterValue("");
    }
    if (onSearch) {
      onSearch("");
    }
  };

  const getColumnLabel = (column) => {
    const header = column.columnDef?.header;
    if (typeof header === "string" && header.trim().length > 0) {
      return header;
    }

    return String(column.id || "")
      .replace(/Label$/i, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (char) => char.toUpperCase());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const viewColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => column.accessorFn && column.getCanHide()),
    [table],
  );

  const currentVisibility = table.getState().columnVisibility || {};

  const resetToDefaultVisibility = React.useCallback(() => {
    table.setColumnVisibility(defaultVisibilityRef.current || {});
  }, [table]);

  const isDefaultVisibility = React.useMemo(() => {
    return (
      JSON.stringify(currentVisibility || {}) ===
      JSON.stringify(defaultVisibilityRef.current || {})
    );
  }, [currentVisibility]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Page size and Search */}
      <div className="flex w-full flex-1 items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Page Size Selector */}
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="h-9 w-fit shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search Input */}
        {filterFields.length > 0 && (
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={filterFields[0]?.placeholder || "Search..."}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 pl-9 pr-9"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Right side: Custom actions, Export, View options */}
      <div className="flex w-full sm:w-auto items-center gap-2 flex-nowrap sm:justify-end overflow-x-auto">
        {/* Custom toolbar actions (passed as children) */}
        {children}

        {/* Export Button */}
        {exportOptions ? (
          <DataTableExportOptions
            table={table}
            tableKey={exportOptions.tableKey || tableKey}
            fileName={exportOptions.fileName || "export"}
            transformedData={exportOptions.transformedData}
            extraActions={exportOptions.extraActions || []}
          />
        ) : (
          Export && (
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Export</span>
            </Button>
          )
        )}

        {/* View/Column visibility toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Settings2 className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">View</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[230px] p-2">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">
                Columns
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-sm text-primary hover:text-primary"
                onClick={resetToDefaultVisibility}
                disabled={isDefaultVisibility}
              >
                Reset
              </Button>
            </div>

            <Separator className="my-2" />

            <ScrollArea className="max-h-[250px] overflow-auto">
              {viewColumns.length > 0 ? (
                viewColumns.map((column) => (
                  <div
                    key={column.id}
                    className="group mb-1 flex items-center space-x-2 rounded-md px-1.5 py-1 text-foreground transition-colors hover:bg-primary/15 hover:text-primary focus-within:bg-primary/15 focus-within:text-primary"
                  >
                    <Checkbox
                      id={`column-toggle-${tableKey}-${column.id}`}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) =>
                        column.toggleVisibility(!!checked)
                      }
                      aria-label={`Toggle ${getColumnLabel(column)}`}
                    />
                    <Label
                      htmlFor={`column-toggle-${tableKey}-${column.id}`}
                      className="cursor-pointer text-sm capitalize transition-colors group-hover:text-primary group-focus-within:text-primary"
                    >
                      {getColumnLabel(column)}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No columns</p>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
