import * as React from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/Table/DataTableConfig";
import { Checkbox } from "@/components/ui/checkbox";
import { useSorting } from "./useHooks";

const columnHelper = createColumnHelper();

export function useDataTable({
  data,
  columns,
  // rowCount,
  pageCount,
  columnFilters = [],
  setColumnFilters,
  pagination,
  setPagination,
  manualFiltering = false,
  manualPagination = true,
  enableExpanding = false,
  onExpandedChange,
  expanded: controlledExpanded,
  ...props
}) {
  // Memoize column definitions for performance
  const cols = React.useMemo(() => createColumnDefinitions(columns), [columns]);

  // Sorting state management
  const { sorting, setSorting } = useSorting();

  // Row selection state
  const [rowSelection, setRowSelection] = React.useState({});

  // Row expansion state
  const [expanded, setExpanded] = React.useState({});

  // Keep internal expanded state in sync with a controlled value if provided
  React.useEffect(() => {
    if (controlledExpanded) {
      setExpanded(controlledExpanded);
    }
  }, [controlledExpanded]);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = React.useState(
    getInitialColumnVisibility(cols)
  );

  // Handle expanded state changes
  const handleExpandedChange = React.useCallback(
    (updater) => {
      setExpanded(updater);
      if (onExpandedChange) {
        const newExpanded =
          typeof updater === "function" ? updater(expanded) : updater;
        onExpandedChange(newExpanded);
      }
    },
    [expanded, onExpandedChange]
  );

  // Create the table instance
  const table = useReactTable({
    data,
    columns: cols,
    pageCount: manualPagination ? pageCount || -1 : undefined,
    state: {
      sorting,
      pagination,
      columnVisibility,
      rowSelection,
      columnFilters,
      expanded: controlledExpanded ?? expanded,
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: handleExpandedChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualFiltering,
    enableRowSelection: true,
    manualPagination,
    ...props,
  });

  return { table };
}

// Helper function to create column definitions
const createColumnDefinitions = (columns) => {
  return columns.map(
    ({ id, header, accessorKey, show = true, cell, ...rest }) => {
      // Build the base column config
      const baseConfig = {
        header: ({ column, table }) =>
          renderColumnHeader(id || accessorKey, column, table, header),
        cell: cell,
        ...rest,
      };

      // For columns with accessorKey, use accessor; otherwise use display column
      if (accessorKey) {
        return {
          ...columnHelper.accessor(accessorKey, {
            ...baseConfig,
            id: id || accessorKey,
          }),
          show,
        };
      } else {
        return {
          ...columnHelper.display({
            ...baseConfig,
            id: id,
          }),
          show,
        };
      }
    }
  );
};

// Render column header with a checkbox for select
const renderColumnHeader = (id, column, table, header) => {
  if (id === "select") {
    return (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px] mx-2"
      />
    );
  }
  return <DataTableColumnHeader column={column} title={header} />;
};

// Helper function to get initial column visibility
const getInitialColumnVisibility = (cols) => {
  return cols.reduce((visibility, col) => {
    const columnId = col.id || col.accessorKey;
    visibility[columnId] = col.show !== false; // Default to visible unless explicitly hidden
    return visibility;
  }, {});
};
