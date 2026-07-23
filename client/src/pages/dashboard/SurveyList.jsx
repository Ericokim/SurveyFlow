import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useSurveys,
  useDeleteSurvey,
  usePublishSurvey,
  useCloseSurvey,
  useDuplicateSurvey,
} from "../../lib/queries";
import { usePagination } from "../../hooks/useHooks";
import { useDataTable } from "../../hooks/useDataTable";
import { DataTable } from "../../components/shared/Table/DataTable";
import { DataTableToolbar } from "../../components/shared/Table/DataTableConfig";
import { DataTableExportOptions } from "../../components/shared/Table/DataTableExportOptions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { CustomDatePicker } from "../../components/shared/CustomDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import * as Pv from "../../components/ui/popover";
import * as Dw from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../../components/ui/tooltip";
import {
  RefreshCw,
  Loader2,
  Eye,
  Share2,
  SquarePen,
  Trash2,
  Ellipsis,
  Copy,
  X,
  ChevronsUpDown,
  Shield,
  Globe,
  CheckCircle2,
  XCircle,
  LayoutList,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { useAlertContext } from "../../app/context/AlertContext";
import { toast } from "sonner";
import { Message } from "../../components/shared/Message";
import TruncatedCell from "../../components/shared/TruncatedCell";
import { format } from "date-fns";
import CustomBadge from "../../components/shared/CustomBadge";
import { clearSelectedRows } from "../../lib/utils";
import { getApiErrorMessage } from "../../lib/utils/apiMessages";
import { ErrorPage } from "../../components/shared/ErrorPage";
import { ShareSurveyModal } from "../../components/distribution/ShareSurveyModal";

const filterFields = [
  {
    label: "Title",
    value: "title",
    placeholder: "Search by title...",
  },
];

const responseCountFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

const exactResponseCountFormatter = new Intl.NumberFormat("en-US");

// Row Actions Component
function SurveyRowActions({
  row,
  handleEdit,
  handlePreview,
  handleShare,
  handleDuplicate,
  handleDelete,
  handlePublish,
  handleClose,
}) {
  const survey = row?.original;
  const canPreview = survey?.status === "published";
  const canShare = !!survey?.publicId && survey?.status === "published";
  const canDelete = survey?.status === "draft"; // Only allow deleting draft surveys
  const questionCount = Number(
    survey?.questionCount ?? survey?.questions?.length ?? 0,
  );
  const canPublish = survey?.status === "draft" && questionCount > 0;
  const canClose = survey?.status === "published";

  const dropdownMenu = useMemo(() => {
    const actions = [
      ...(canPreview
        ? [
            {
              label: "Preview Survey",
              onClick: () => handlePreview(survey),
              Icon: Eye,
              color: "text-green-600",
            },
          ]
        : []),
      {
        label: "Edit Survey",
        onClick: () => handleEdit(survey),
        Icon: SquarePen,
        color: "text-blue-500",
      },
      {
        label: "Duplicate Survey",
        onClick: () => handleDuplicate(survey),
        Icon: Copy,
        color: "text-sky-600",
      },
      ...(canPublish
        ? [
            {
              label: "Publish Survey",
              onClick: () => handlePublish(survey),
              Icon: CheckCircle2,
              color: "text-emerald-600",
            },
          ]
        : []),
      ...(canShare
        ? [
            {
              label: "Share Survey",
              onClick: () => handleShare(survey),
              Icon: Share2,
              color: "text-purple-600",
            },
          ]
        : []),
      ...(canClose
        ? [
            {
              label: "Close Survey",
              onClick: () => handleClose(survey),
              Icon: XCircle,
              color: "text-orange-600",
            },
          ]
        : []),
      ...(canDelete
        ? [
            {
              label: "Delete Survey",
              onClick: () => handleDelete(survey),
              Icon: Trash2,
              color: "text-red-600",
            },
          ]
        : []),
    ];

    return (
      <Dw.DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Dw.DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </Dw.DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Survey actions</p>
          </TooltipContent>
        </Tooltip>
        <Dw.DropdownMenuContent align="start" className="w-44">
          {actions.map((action, idx) => (
            <Dw.DropdownMenuItem
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              title={action.label}
            >
              <action.Icon className={`h-4 w-4 mr-2 ${action.color}`} />
              {action.label}
            </Dw.DropdownMenuItem>
          ))}
        </Dw.DropdownMenuContent>
      </Dw.DropdownMenu>
    );
  }, [
    survey,
    handleEdit,
    handlePreview,
    handleShare,
    handleDuplicate,
    handleDelete,
    handlePublish,
    handleClose,
    canPreview,
    canShare,
    canDelete,
    canPublish,
    canClose,
  ]);

  return <div className="flex items-center gap-x-1">{dropdownMenu}</div>;
}

/**
 * Survey List Toolbar Actions
 * Refresh, Export, and Filters
 */
function DataTableToolbarActions({
  table,
  formState,
  handleChange,
  OnRefresh,
  loading = false,
  handleClearFilters,
}) {
  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original);

  const handleRefresh = useCallback(() => {
    OnRefresh();
    if (selectedRows.length > 0) {
      clearSelectedRows(table);
    }
  }, [OnRefresh, selectedRows.length, table]);

  const activeFiltersCount = [
    formState.selectedStatus !== "all",
    formState.surveyType !== "all",
    !!formState.startDate,
    !!formState.endDate,
  ].filter(Boolean).length;

  const selectedRange = useMemo(() => {
    const from = formState.startDate
      ? new Date(formState.startDate)
      : undefined;
    const to = formState.endDate ? new Date(formState.endDate) : undefined;
    const parsedFrom = from && !Number.isNaN(from.getTime()) ? from : undefined;
    const parsedTo = to && !Number.isNaN(to.getTime()) ? to : undefined;

    if (!parsedFrom && !parsedTo) {
      return undefined;
    }

    return { from: parsedFrom, to: parsedTo };
  }, [formState.endDate, formState.startDate]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Refresh Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="h-8"
            aria-label="Refresh"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 text-green-700 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refresh survey list</p>
        </TooltipContent>
      </Tooltip>

      {/* Export Options */}
      <DataTableExportOptions
        table={table}
        tableKey="surveyList"
        fileName="surveys"
      />

      {/* Filters Popover */}
      <Pv.Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <Pv.PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 relative"
                aria-label="Filter surveys"
              >
                <ChevronsUpDown className="sm:mr-2 size-4 text-gray-600" />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <CustomBadge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground">
                    {activeFiltersCount}
                  </CustomBadge>
                )}
              </Button>
            </Pv.PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filter survey list</p>
          </TooltipContent>
        </Tooltip>
        <Pv.PopoverContent
          className="w-80 p-4"
          align="start"
          onInteractOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-date-range-popover]")
            ) {
              event.preventDefault();
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">Filter Surveys</h4>
              </div>
              {activeFiltersCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      aria-label="Clear filters"
                      className="h-6 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all active filters</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={formState.selectedStatus}
                  onValueChange={(value) =>
                    handleChange({ selectedStatus: value })
                  }
                >
                  <SelectTrigger className="h-8 mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Survey Type</Label>
                <Select
                  value={formState.surveyType}
                  onValueChange={(value) => handleChange({ surveyType: value })}
                >
                  <SelectTrigger className="h-8 mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="closed">Closed-ended</SelectItem>
                    <SelectItem value="open">Open-ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs">Period</Label>
                  <div className="mt-1">
                    <CustomDatePicker
                      value={selectedRange}
                      onChange={(range) => {
                        handleChange({
                          startDate: range?.from
                            ? format(range.from, "yyyy-MM-dd")
                            : "",
                          endDate: range?.to
                            ? format(range.to, "yyyy-MM-dd")
                            : "",
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Pv.PopoverContent>
      </Pv.Popover>
    </div>
  );
}

/**
 * Survey List
 * Displays surveys with filtering and pagination matching Agents.jsx pattern
 */
export function SurveyList() {
  const navigate = useNavigate();
  const { openAlert, closeAlert, setLoading } = useAlertContext();
  const [surveySearchResetSignal, setSurveySearchResetSignal] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSurvey, setShareSurvey] = useState(null);

  const [formState, setFormState] = useState({
    selectedStatus: "all",
    surveyType: "all",
    searchKey: "",
    startDate: "",
    endDate: "",
  });

  const [columnFilters, setColumnFilters] = useState([]);

  const { pageSize, pagination, setPagination } = usePagination({
    initialSize: 10,
  });

  const { data, isLoading, isFetching, error, refetch } = useSurveys({
    page: pagination.pageIndex + 1, // API uses 1-based indexing
    pageSize: pagination.pageSize,
    status:
      formState.selectedStatus === "all" ? undefined : formState.selectedStatus,
    isWhitelistEnabled:
      formState.surveyType === "all"
        ? undefined
        : formState.surveyType === "closed",
    startDate: formState.startDate || undefined,
    endDate: formState.endDate || undefined,
  });

  const { mutate: deleteSurvey } = useDeleteSurvey();
  const { mutate: publishSurvey } = usePublishSurvey();
  const { mutate: closeSurvey } = useCloseSurvey();
  const { mutate: duplicateSurvey } = useDuplicateSurvey();

  const handleChange = (updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleRefresh = useCallback(async () => {
    const hasColumnFilters = columnFilters.length > 0;
    const hasCustomPagination =
      pagination.pageIndex !== 0 || pagination.pageSize !== 10;
    const hasCustomFilters =
      formState.selectedStatus !== "all" ||
      formState.surveyType !== "all" ||
      !!formState.startDate ||
      !!formState.endDate;

    if (hasColumnFilters || hasCustomPagination || hasCustomFilters) {
      setColumnFilters([]);
      setPagination({ pageIndex: 0, pageSize: 10 });
      setFormState({
        searchKey: "",
        selectedStatus: "all",
        surveyType: "all",
        startDate: "",
        endDate: "",
      });
      setSurveySearchResetSignal((prev) => prev + 1);
      return;
    }

    await refetch();
  }, [
    columnFilters.length,
    formState,
    pagination.pageIndex,
    pagination.pageSize,
    refetch,
    setPagination,
  ]);

  const handleClearFilters = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setFormState((prev) => ({
      ...prev,
      selectedStatus: "all",
      surveyType: "all",
      startDate: "",
      endDate: "",
    }));
    setColumnFilters([]);
  }, [setPagination]);

  const handleEdit = useCallback(
    (survey) => {
      navigate({ to: "/surveys/$id", params: { id: survey._id } });
    },
    [navigate],
  );

  const handleOpenResponses = useCallback(
    (survey) => {
      if (!survey?._id) return;
      navigate({
        to: "/surveys/$id",
        params: { id: survey._id },
        search: (prev) => ({ ...prev, tab: "responses" }),
      });
    },
    [navigate],
  );

  const handlePreview = useCallback((survey) => {
    // Check if survey is draft (no publicId or status is draft)
    const isDraft = !survey.publicId || survey.status === "draft";

    if (isDraft) {
      // For draft surveys: save to sessionStorage and open draft preview
      sessionStorage.setItem("draftPreview", JSON.stringify(survey));
      window.open("/preview/draft", "_blank", "noopener,noreferrer");
    } else {
      // For published surveys: use public preview URL
      const previewUrl = `/r/${survey.publicId}`;
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleShare = useCallback((survey) => {
    if (!survey.publicId) {
      toast.error("Survey has no public link");
      return;
    }
    setShareSurvey(survey);
    setIsShareModalOpen(true);
  }, []);

  const shareUrl = shareSurvey?.publicId
    ? `${window.location.origin}/r/${shareSurvey.publicId}`
    : "";

  const handlePublish = useCallback(
    (survey) => {
      openAlert({
        title: "Publish Survey?",
        description:
          "Once published, the survey will be live and accessible. Settings cannot be changed after publishing.",
        actionLabel: "Publish",
        cancelLabel: "Cancel",
        actionStyle: "default",
        onAction: () => {
          publishSurvey(survey._id, {
            onSuccess: () => {
              closeAlert();
              toast.success("Survey published successfully");
            },
            onError: (error) => {
              closeAlert();
              toast.error(
                getApiErrorMessage(error, "Failed to publish survey"),
              );
            },
          });
        },
        onCancel: () => closeAlert(),
      });
    },
    [closeAlert, publishSurvey, openAlert],
  );

  const handleClose = useCallback(
    (survey) => {
      openAlert({
        title: "Close Survey?",
        description:
          "Closing the survey will stop accepting new responses. This action cannot be undone.",
        actionLabel: "Close Survey",
        cancelLabel: "Cancel",
        actionStyle: "destructive",
        onAction: () => {
          closeSurvey(survey._id, {
            onSuccess: () => {
              closeAlert();
              toast.success("Survey closed successfully");
            },
            onError: (error) => {
              closeAlert();
              toast.error(getApiErrorMessage(error, "Failed to close survey"));
            },
          });
        },
        onCancel: () => closeAlert(),
      });
    },
    [closeAlert, closeSurvey, openAlert],
  );

  const handleDelete = useCallback(
    (survey) => {
      openAlert({
        title: "Delete Survey?",
        description:
          "This survey will be moved to trash. You can restore it later if needed.",
        actionLabel: "Delete Survey",
        cancelLabel: "Cancel",
        actionStyle: "destructive",
        onAction: () => {
          deleteSurvey(survey._id, {
            onSuccess: () => {
              closeAlert();
              toast.success("Survey moved to trash");
            },
            onError: (error) => {
              closeAlert();
              toast.error(getApiErrorMessage(error, "Failed to delete survey"));
            },
          });
        },
        onCancel: () => closeAlert(),
      });
    },
    [closeAlert, deleteSurvey, openAlert],
  );

  const handleDuplicate = useCallback(
    (survey) => {
      openAlert({
        title: "Duplicate Survey?",
        description:
          "A draft copy will be created with the same structure, logic, settings, and recipients. Responses are not copied.",
        actionLabel: "Duplicate",
        cancelLabel: "Cancel",
        actionStyle: "default",
        onAction: () => {
          setLoading(true);
          duplicateSurvey(survey._id, {
            onSuccess: () => {
              setLoading(false);
              closeAlert();
              toast.success("Survey duplicated successfully");
            },
            onError: (error) => {
              setLoading(false);
              closeAlert();
              toast.error(
                getApiErrorMessage(error, "Failed to duplicate survey"),
              );
            },
          });
        },
        onCancel: () => closeAlert(),
      });
    },
    [closeAlert, duplicateSurvey, openAlert, setLoading],
  );

  // Column definitions matching Agents.jsx pattern
  const columns = useMemo(() => {
    return [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-0.5 mx-2"
          />
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        tooltip: "Survey title - click to edit",
        cell: ({ row }) => (
          <div
            className="font-medium cursor-pointer hover:text-primary hover:underline min-w-0"
            onClick={() => handleEdit(row.original)}
          >
            <TruncatedCell text={row.getValue("title")} maxWidth={240} />
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        show: false,
        tooltip: "Brief description of the survey's purpose",
        cell: ({ row }) => (
          <TruncatedCell
            text={row.getValue("description") || "No description"}
            maxWidth={260}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        tooltip:
          "Current survey lifecycle status (Draft, Published, or Closed)",
        cell: ({ row }) => {
          const status = row.getValue("status");
          const variant =
            status === "published"
              ? "published"
              : status === "draft"
                ? "draft"
                : status === "closed"
                  ? "closed"
                  : "gray";
          return <CustomBadge variant={variant}>{status}</CustomBadge>;
        },
      },

      {
        accessorKey: "isWhitelistEnabled",
        header: "Survey Type",
        tooltip:
          "Closed-ended: Restricted to pre-approved recipients only. Open-ended: Anyone with the survey link can participate.",
        cell: ({ row }) => {
          const isWhitelisted = row.getValue("isWhitelistEnabled");
          return isWhitelisted ? (
            <CustomBadge variant="warning" className="gap-1.5">
              <Shield className="h-3 w-3" />
              Closed-ended
            </CustomBadge>
          ) : (
            <CustomBadge variant="info" className="gap-1.5">
              <Globe className="h-3 w-3" />
              Open-ended
            </CustomBadge>
          );
        },
      },

      {
        accessorKey: "structure",
        header: "Structure",
        tooltip: "How the survey is organized",
        cell: ({ row }) => {
          const survey = row.original || {};
          const isSectional = survey?.structure
            ? survey.structure === "Sections"
            : (survey?.settings?.isSectional ??
              ((survey?.sectionCount ?? survey?.sections?.length) || 0) > 1);
          return (
            <CustomBadge
              variant={isSectional ? "purple" : "cyan"}
              className="gap-1.5"
            >
              {isSectional ? (
                <LayoutList className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              {isSectional ? "Sections" : "Questions only"}
            </CustomBadge>
          );
        },
      },

      {
        accessorKey: "questionCount",
        header: "Questions",
        tooltip: "Total number of questions in this survey",
        cell: ({ row }) => (
          <div className="text-center">
            {(row.original.questionCount ?? row.original.questions?.length) ||
              0}
          </div>
        ),
      },

      {
        accessorKey: "responseCount",
        header: "Responses",
        tooltip: "Total number of responses received for this survey",
        cell: ({ row }) => {
          const survey = row.original || {};
          const responseCount = Number(survey.responseCount || 0);
          const hasResponses = responseCount > 0;
          const compactResponseCount =
            responseCountFormatter.format(responseCount);
          const exactResponseCount =
            exactResponseCountFormatter.format(responseCount);
          const responseLabel =
            responseCount === 1
              ? "1 response"
              : `${exactResponseCount} responses`;

          return (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    // size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenResponses(survey);
                    }}
                    className={`group h-auto rounded-md px-2.5 py-1 font-medium shadow-none transition-all ${
                      hasResponses
                        ? " text-primary hover:text-primary"
                        : " text-gray-700 hover:text-gray-900"
                    }`}
                    aria-label={`Open responses tab for ${survey.title || "survey"}`}
                  >
                    <span className="decoration-current underline-offset-2 group-hover:underline">
                      <span className="font-semibold tabular-nums">
                        {compactResponseCount}
                      </span>{" "}
                      <span className="font-medium tracking-tight">View</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-[220px]"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      Open responses for {survey.title || "this survey"}
                    </p>
                    <p className="text-background/80">
                      {hasResponses
                        ? `View ${responseLabel} and survey analytics.`
                        : "No responses yet. Open the tab to monitor incoming submissions."}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },

      {
        accessorKey: "createdAt",
        header: "Created At",
        tooltip: "Date and time when the survey was created",
        cell: ({ row }) => {
          const createdAt = row.getValue("createdAt") || new Date();
          return (
            <div className="max-w-125 truncate hover:text-balance">
              {format(new Date(createdAt), "dd-MMM-yyyy hh:mm a")}
            </div>
          );
        },
      },
      {
        header: "Actions",
        accessorKey: "actions",
        enableSorting: false,
        enableHiding: false,
        size: 10,
        tooltip: "View or manage actions for this survey",
        cell: ({ row }) => (
          <SurveyRowActions
            row={row}
            handleEdit={handleEdit}
            handlePreview={handlePreview}
            handleShare={handleShare}
            handleDuplicate={handleDuplicate}
            handleDelete={handleDelete}
            handlePublish={handlePublish}
            handleClose={handleClose}
          />
        ),
      },
    ];
  }, [
    handleEdit,
    handlePreview,
    handleOpenResponses,
    handleShare,
    handleDuplicate,
    handleDelete,
    handlePublish,
    handleClose,
  ]);

  const surveys = useMemo(() => data?.data || [], [data?.data]);

  const { table } = useDataTable({
    columns: columns,
    data: surveys,
    pageCount: data?.paging?.pages || 1,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    manualFiltering: false,
    manualPagination: true, // Enable server-side pagination
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { left: ["select"] },
    },
    getRowId: (originalRow, index) => `${originalRow._id}-${index}`,
  });

  if (error) {
    return (
      <div className="p-6">
        <ErrorPage
          error={error}
          title="Unable to load surveys"
          homeTo="/surveys"
          secondaryLabel="Go to dashboard"
          fullScreen={false}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        <Card className="w-full">
          <CardHeader className="px-4 py-1 space-y-1.5 -mt-2 ml-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap ">
              <div className="flex flex-col mr-6 gap-0.5 md:max-w-[50%] sm:max-w-full">
                <CardTitle className="text-base font-bold tracking-tight">
                  Survey Management
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs capitalize overflow-hidden wrap-break-word whitespace-normal">
                  Create and manage surveys, track responses, and analyze
                  results.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="-mt-4">
            <DataTable
              table={table}
              loading={isLoading}
              message={
                error?.message && (
                  <Message type="error">{error.message}</Message>
                )
              }
            >
              <DataTableToolbar
                table={table}
                tableKey="surveyList"
                Export={false}
                filterFields={filterFields}
                resetSearchSignal={surveySearchResetSignal}
                pageSizeOptions={[10, 20, 30, 40, 50, 100]}
              >
                <DataTableToolbarActions
                  table={table}
                  formState={formState}
                  loading={isFetching}
                  OnRefresh={handleRefresh}
                  handleChange={handleChange}
                  handleClearFilters={handleClearFilters}
                />
              </DataTableToolbar>
            </DataTable>
          </CardContent>
        </Card>
      </div>
      <ShareSurveyModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        surveyTitle={shareSurvey?.title || "Survey"}
        shareUrl={shareUrl}
        preferredLogoUrl={shareSurvey?.logo || ""}
      />
    </TooltipProvider>
  );
}
