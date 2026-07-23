import { useCallback, useMemo, useState } from "react";
import {
  useRecipients,
  useRecipientStats,
  useDeleteRecipient,
  useToggleRecipientBlacklist,
  useSendInvite,
  useRecipientResponses,
} from "../../lib/queries/recipients";
import { recipientsApi } from "../../lib/api/recipients";
import { Button } from "../ui/button";
import CustomBadge from "../shared/CustomBadge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { SurveyMetricCard } from "../dashboard/SurveyMetricCard";
import { Skeleton } from "../ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Users,
  Mail,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  Trash2,
  Eye,
  Plus,
  Upload,
  Download,
  FileText,
  RefreshCw,
  MapPin,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import { useAlertContext } from "../../app/context/AlertContext";
import { useQueryClient } from "@tanstack/react-query";
import { usePagination } from "../../hooks/useHooks";
import { useDataTable } from "../../hooks/useDataTable";
import { DataTable } from "../shared/Table/DataTable";
import { DataTableToolbar } from "../shared/Table/DataTableConfig";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Progress } from "../ui/progress";
import { clearSelectedRows } from "../../lib/utils";
import { queryKeys } from "../../lib/queries/queryKeys";
import { toast } from "sonner";
import {
  ResponseDetailsAnswerItem,
  ResponseDetailsSubmissionCard,
  ResponseDetailsSummaryCard,
} from "../shared/ResponseDetailsBlocks";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "pending",
    icon: Clock,
  },
  invited: {
    label: "Invited",
    variant: "info",
    icon: Mail,
  },
  in_progress: {
    label: "In Progress",
    variant: "processing",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    variant: "completed",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    variant: "failed",
    icon: XCircle,
  },
};

const filterFields = [
  {
    label: "Name",
    value: "name",
    placeholder: "Search by name, email, or phone...",
  },
];

const toCsvLine = (values = []) =>
  values
    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
    .join(",");

const downloadCsv = (rows, filename) => {
  const csv = rows.map((row) => toCsvLine(row)).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const sanitizeFilePart = (value = "recipient") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "recipient";

const formatQuestionTypeLabel = (questionType) =>
  String(questionType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildRecipientExportDataset = (data, surveyTitle = "") => {
  const responses = Array.isArray(data?.responses) ? data.responses : [];
  const recipient = data?.recipient || {};
  const baseSurveyTitle = surveyTitle || "Survey";

  const rows = [];
  let totalQuestions = 0;
  let answeredCount = 0;
  const completionTimes = [];

  responses.forEach((response, responseIndex) => {
    if (Number.isFinite(response?.completionTime)) {
      completionTimes.push(response.completionTime);
    }
    const answers = Array.isArray(response?.answers) ? response.answers : [];

    if (answers.length === 0) {
      rows.push({
        surveyTitle: baseSurveyTitle,
        recipientName: recipient?.name || "Anonymous",
        recipientEmail: recipient?.email || "—",
        recipientPhone: recipient?.phone || "—",
        submission: `Submission #${responseIndex + 1}`,
        submittedAt: response?.submittedAt
          ? format(new Date(response.submittedAt), "MMM d, yyyy h:mm a")
          : "",
        questionTitle: "No answers",
        questionType: "",
        sectionTitle: "—",
        answer: "No answer",
      });
      return;
    }

    answers.forEach((answer) => {
      totalQuestions += 1;
      const formattedAnswer = renderAnswerValue(answer?.answer);
      if (formattedAnswer !== "No answer") answeredCount += 1;

      rows.push({
        surveyTitle: baseSurveyTitle,
        recipientName: recipient?.name || "Anonymous",
        recipientEmail: recipient?.email || "—",
        recipientPhone: recipient?.phone || "—",
        submission: `Submission #${responseIndex + 1}`,
        submittedAt: response?.submittedAt
          ? format(new Date(response.submittedAt), "MMM d, yyyy h:mm a")
          : "",
        questionTitle: answer?.questionTitle || "",
        questionType: formatQuestionTypeLabel(answer?.questionType),
        sectionTitle: answer?.sectionTitle || "—",
        answer: formattedAnswer,
      });
    });
  });

  const avgCompletionSec =
    completionTimes.length > 0
      ? completionTimes.reduce((sum, value) => sum + value, 0) /
        completionTimes.length
      : null;

  return {
    rows,
    meta: {
      surveyTitle: baseSurveyTitle,
      recipientName: recipient?.name || "Anonymous",
      recipientEmail: recipient?.email || "—",
      recipientPhone: recipient?.phone || "—",
      totalResponses: responses.length,
      totalQuestions,
      answeredCount,
      skippedCount: Math.max(totalQuestions - answeredCount, 0),
      avgCompletionSec,
    },
  };
};

const getRecipientActionState = (recipient) => {
  const normalizedStatus = String(recipient?.status || "").toLowerCase();
  const isCompleted = normalizedStatus === "completed";
  return {
    canBlacklist: !isCompleted,
    blacklistLabel: recipient?.isBlacklisted ? "Whitelist" : "Blacklist",
    canViewResponses: isCompleted,
    canExportResponses: isCompleted,
  };
};

export function RecipientsList({
  surveyId,
  onAddRecipient,
  onUploadCSV,
  surveyTitle,
  surveyPublicId,
  stats: providedStats,
}) {
  const queryClient = useQueryClient();
  const {
    page: pageIndex,
    pageSize,
    pagination,
    setPagination,
  } = usePagination({ initialSize: 10 });
  const [columnFilters, setColumnFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [recipientSearchResetSignal, setRecipientSearchResetSignal] =
    useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteRecipient, setInviteRecipient] = useState(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseRecipient, setResponseRecipient] = useState(null);
  const [exportingRecipientKey, setExportingRecipientKey] = useState(null);
  const { openAlert } = useAlertContext();

  const {
    data: fetchedStats,
    isLoading: statsLoading,
  } = useRecipientStats(surveyId, {
    enabled: !providedStats,
  });
  const stats = providedStats || fetchedStats;
  const {
    data: recipientsData,
    isLoading: listLoading,
    isFetching: listFetching,
    refetch: refetchRecipients,
  } = useRecipients(surveyId, {
    page: pageIndex + 1,
    limit: pageSize,
    search: searchTerm?.trim() || undefined,
  });
  const { mutate: deleteRecipient } = useDeleteRecipient();
  const { mutate: toggleBlacklist } = useToggleRecipientBlacklist();
  const { mutate: sendInvite, isPending: isSendingInvite } = useSendInvite();
  const {
    data: recipientResponseData,
    isLoading: isLoadingRecipientResponses,
  } = useRecipientResponses(surveyId, responseRecipient?._id, {
    enabled: !!responseRecipient?._id && responseDialogOpen,
  });

  const defaultInviteTemplate = useMemo(
    () =>
      "Hi {name},\n\nYou're invited to complete our survey.\nClick here to start: {url}\n\nThank you!",
    []
  );

  const buildInviteLink = useCallback(
    (recipient) => {
      if (!surveyPublicId || !recipient?._id) return "";
      const envBaseUrl =
        import.meta.env.VITE_PUBLIC_APP_URL ||
        import.meta.env.VITE_APP_URL ||
        import.meta.env.VITE_FRONTEND_URL ||
        "";
      const baseUrl = envBaseUrl.trim()
        ? envBaseUrl.replace(/\/$/, "")
        : window.location.origin;
      return `${baseUrl}/r/${surveyPublicId}?rid=${recipient._id}`;
    },
    [surveyPublicId]
  );

  const resolveInviteMessage = useCallback(
    (template, recipient) => {
      const safeName = recipient?.name?.trim() || "there";
      const link = buildInviteLink(recipient);
      const surveyName = surveyTitle || "our survey";
      return (template || defaultInviteTemplate)
        .replace(/\{name\}/gi, safeName)
        .replace(/\{url\}/gi, link)
        .replace(/\{survey\}/gi, surveyName);
    },
    [buildInviteLink, defaultInviteTemplate, surveyTitle]
  );

  const previewMessage = useMemo(
    () => resolveInviteMessage(inviteMessage, inviteRecipient),
    [inviteMessage, inviteRecipient, resolveInviteMessage]
  );

  const renderPreviewMessage = useCallback((message) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return message.split(urlRegex).map((part, index) => {
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <a
            key={`url-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline break-words"
          >
            {part}
          </a>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  }, []);

  const recipients = recipientsData?.recipients || [];
  const totalPages = recipientsData?.totalPages || 1;
  const totalRecipients = recipientsData?.totalRecipients || 0;

  const handleDelete = useCallback(
    (recipient) => {
      openAlert({
        title: "Delete Recipient",
        message: `Are you sure you want to delete ${recipient.name}? This action cannot be undone.`,
        actionLabel: "Delete",
        actionStyle: "destructive",
        onAction: () => {
          deleteRecipient({ surveyId, recipientId: recipient._id });
        },
      });
    },
    [deleteRecipient, openAlert, surveyId]
  );

  const handleInviteSubmit = () => {
    if (!inviteRecipient) return;
    sendInvite({
      surveyId,
      recipientId: inviteRecipient._id,
      message: inviteMessage,
    });
    setInviteDialogOpen(false);
    setInviteRecipient(null);
  };

  const handleViewResponses = useCallback((recipient) => {
    setResponseRecipient(recipient);
    setResponseDialogOpen(true);
  }, []);

  const handleToggleBlacklist = useCallback(
    (recipient) => {
      if (!getRecipientActionState(recipient).canBlacklist) return;
      toggleBlacklist({ surveyId, recipientId: recipient._id });
    },
    [surveyId, toggleBlacklist]
  );

  const fetchRecipientResponsePayload = useCallback(
    async (recipient) => {
      const actionState = getRecipientActionState(recipient);
      if (!actionState.canExportResponses || !recipient?._id) return;
      if (recipientResponseData?.recipient?._id === recipient._id) {
        return recipientResponseData;
      }
      return queryClient.fetchQuery({
        queryKey: queryKeys.recipients.responses(surveyId, recipient._id),
        queryFn: () => recipientsApi.getRecipientResponses(surveyId, recipient._id),
      });
    },
    [queryClient, recipientResponseData, surveyId]
  );

  const exportRecipientAsCsv = useCallback((dataset) => {
    if (!dataset?.rows?.length) {
      toast.error("No response details found for this recipient yet.");
      return;
    }

    const rows = [
      [
        "Survey Title",
        "Recipient Name",
        "Recipient Email",
        "Recipient Phone",
        "Submission",
        "Submitted At",
        "Question Title",
        "Question Type",
        "Section Title",
        "Answer",
      ],
      ...dataset.rows.map((row) => [
        row.surveyTitle,
        row.recipientName,
        row.recipientEmail,
        row.recipientPhone,
        row.submission,
        row.submittedAt,
        row.questionTitle,
        row.questionType,
        row.sectionTitle,
        row.answer,
      ]),
    ];

    const filename = `survey-${sanitizeFilePart(dataset.meta.surveyTitle)}-recipient-${sanitizeFilePart(dataset.meta.recipientName)}-responses.csv`;
    downloadCsv(rows, filename);
  }, []);

  const exportRecipientAsPdf = useCallback(async (dataset) => {
    if (!dataset?.rows?.length) {
      toast.error("No response details found for this recipient yet.");
      return;
    }

    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable =
      autoTableModule?.default || autoTableModule?.autoTable || null;
    if (!autoTable) throw new Error("Failed to initialize PDF export");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const marginX = 36;
    const reportTitle = `${dataset.meta.surveyTitle} - Recipient Responses`;
    doc.setFontSize(15);
    doc.text(reportTitle, marginX, 36);
    doc.setFontSize(10);
    doc.text(`Recipient: ${dataset.meta.recipientName}`, marginX, 54);
    doc.text(`Email: ${dataset.meta.recipientEmail}`, marginX, 68);
    doc.text(`Phone: ${dataset.meta.recipientPhone}`, marginX, 82);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, marginX, 96);

    autoTable(doc, {
      startY: 112,
      head: [[
        "Submission",
        "Submitted At",
        "Question Title",
        "Question Type",
        "Section Title",
        "Answer",
      ]],
      body: dataset.rows.map((row) => [
        row.submission,
        row.submittedAt,
        row.questionTitle,
        row.questionType,
        row.sectionTitle,
        row.answer,
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [34, 197, 94] },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { cellWidth: 95 },
        2: { cellWidth: 170 },
        3: { cellWidth: 90 },
        4: { cellWidth: 90 },
        5: { cellWidth: 220 },
      },
    });

    doc.addPage("a4", "landscape");
    doc.setFontSize(15);
    doc.text(`${dataset.meta.surveyTitle} - Insights`, marginX, 36);
    doc.setFontSize(11);
    doc.text(dataset.meta.recipientName, marginX, 56);
    doc.setFontSize(10);
    doc.text(`Total Submissions: ${dataset.meta.totalResponses}`, marginX, 84);
    doc.text(`Answered: ${dataset.meta.answeredCount}`, marginX, 102);
    doc.text(`Skipped: ${dataset.meta.skippedCount}`, marginX, 120);
    doc.text(
      `Avg Completion Time: ${formatDuration(dataset.meta.avgCompletionSec)}`,
      marginX,
      138
    );

    const filename = `survey-${sanitizeFilePart(dataset.meta.surveyTitle)}-recipient-${sanitizeFilePart(dataset.meta.recipientName)}-responses.pdf`;
    doc.save(filename);
  }, []);

  const handleRecipientExport = useCallback(
    async (recipient, formatType) => {
      const actionState = getRecipientActionState(recipient);
      if (!actionState.canExportResponses || !recipient?._id) return;
      const key = `${recipient._id}:${formatType}`;

      try {
        setExportingRecipientKey(key);
        const payload = await fetchRecipientResponsePayload(recipient);
        const dataset = buildRecipientExportDataset(payload, surveyTitle);
        if (!dataset.rows.length) {
          toast.error("No response details found for this recipient yet.");
          return;
        }

        if (formatType === "pdf") {
          await exportRecipientAsPdf(dataset);
        } else {
          exportRecipientAsCsv(dataset);
        }
      } catch {
        toast.error(`Failed to export recipient responses as ${formatType.toUpperCase()}`);
      } finally {
        setExportingRecipientKey(null);
      }
    },
    [exportRecipientAsCsv, exportRecipientAsPdf, fetchRecipientResponsePayload, surveyTitle]
  );

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
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium truncate max-w-125">
            {row.getValue("name") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <div className="text-muted-foreground max-w-75 truncate">
            {row.getValue("phone") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="text-muted-foreground max-w-125 truncate">
            {row.getValue("email") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const statusConfig =
            STATUS_CONFIG[row.getValue("status")] || STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          return (
            <CustomBadge
              variant={statusConfig.variant}
              className="flex items-center gap-1 w-fit"
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </CustomBadge>
          );
        },
      },
      // {
      //   id: "journey",
      //   header: "Journey",
      //   cell: ({ row }) => {
      //     const journey = row.original?.journey;
      //     const isCompleted = journey?.state === "completed";
      //     if (!journey) {
      //       return (
      //         <div className="text-sm text-muted-foreground">Not started</div>
      //       );
      //     }

      //     return (
      //       <div className="min-w-[210px] space-y-2">
      //         {journey.label ? (
      //           <div className="text-sm font-medium text-foreground">
      //             {journey.label}
      //           </div>
      //         ) : null}
      //         <div className="flex items-center justify-between gap-3">
      //           <div className="text-xs font-normal text-foreground">
      //             {journey.answeredLabel}
      //           </div>
      //           <span className="text-xs text-primary font-semibold">
      //             {`${journey.percentComplete || 0}%`}
      //           </span>
      //         </div>

      //         {!isCompleted && (
      //           <Progress
      //             value={Math.max(
      //               0,
      //               Math.min(100, journey.percentComplete || 0),
      //             )}
      //             className="h-2"
      //           />
      //         )}

      //         <div className="space-y-0.5 text-xs text-muted-foreground">
      //           <div>
      //             {isCompleted
      //               ? journey.submittedAt
      //                 ? `Submitted, ${format(new Date(journey.submittedAt), "MMM d, yyyy h:mm a")}`
      //                 : "Submission recorded"
      //               : journey.lastSavedAt
      //                 ? `Last saved, ${format(new Date(journey.lastSavedAt), "MMM d, yyyy h:mm a")}`
      //                 : "Last saved unavailable"}
      //           </div>
      //         </div>
      //       </div>
      //     );
      //   },
      // },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {format(new Date(row.getValue("createdAt")), "MMM d, yyyy")}
          </div>
        ),
      },
      {
        id: "access",
        header: "Access",
        cell: ({ row }) => (
          <CustomBadge
            variant={row.original?.isBlacklisted ? "inactive" : "active"}
          >
            {row.original?.isBlacklisted ? "Blacklisted" : "Active"}
          </CustomBadge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        cell: ({ row }) => {
          const recipient = row.original;
          const actionState = getRecipientActionState(recipient);
          const exportCsvKey = `${recipient?._id}:csv`;
          const exportPdfKey = `${recipient?._id}:pdf`;
          const isExportingCsv = exportingRecipientKey === exportCsvKey;
          const isExportingPdf = exportingRecipientKey === exportPdfKey;
          const isAnyExporting = isExportingCsv || isExportingPdf;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!actionState.canBlacklist) return;
                          handleToggleBlacklist(recipient);
                        }}
                        disabled={!actionState.canBlacklist}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {actionState.blacklistLabel}
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  {!actionState.canBlacklist && (
                    <TooltipContent>Not allowed after completion</TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!actionState.canViewResponses) return;
                          handleViewResponses(recipient);
                        }}
                        disabled={!actionState.canViewResponses}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Responses
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  {!actionState.canViewResponses && (
                    <TooltipContent>Available after completion</TooltipContent>
                  )}
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                          className={
                            !actionState.canExportResponses
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export Responses
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            onClick={() => {
                              if (!actionState.canExportResponses || isAnyExporting)
                                return;
                              handleRecipientExport(recipient, "csv");
                            }}
                            disabled={!actionState.canExportResponses || isAnyExporting}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {isExportingCsv ? "Exporting CSV..." : "Export CSV"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (!actionState.canExportResponses || isAnyExporting)
                                return;
                              handleRecipientExport(recipient, "pdf");
                            }}
                            disabled={!actionState.canExportResponses || isAnyExporting}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {isExportingPdf ? "Exporting PDF..." : "Export PDF"}
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </div>
                  </TooltipTrigger>
                  {!actionState.canExportResponses && (
                    <TooltipContent>Available after completion</TooltipContent>
                  )}
                </Tooltip>

                {(recipient.status === "invited" || recipient.status === "pending") && (
                  <>
                    {/* <DropdownMenuItem
                      onClick={() => handleSendInvite(recipient)}
                      // disabled={surveyStatus === "published"}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {recipient.status === "invited"
                        ? "Resend Invite"
                        : "Send Invite"}
                    </DropdownMenuItem> */}

                    <DropdownMenuItem
                      onClick={() => handleDelete(recipient)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}

                {/* <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(recipient, "pending")}
                      disabled={recipient.status === "pending"}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(recipient, "failed")}
                      disabled={recipient.status === "failed"}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Failed
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub> */}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
  }, [
    handleDelete,
    handleRecipientExport,
    handleToggleBlacklist,
    handleViewResponses,
    exportingRecipientKey,
  ]);

  const { table } = useDataTable({
    columns,
    data: recipients,
    pageCount: totalPages,
    columnFilters,
    setColumnFilters,
    pagination,
    setPagination,
    manualFiltering: true,
    manualPagination: true,
  });

  const handleRefresh = async () => {
    const hasSearch = searchTerm.trim().length > 0;
    const hasCustomPagination = pageIndex !== 0 || pageSize !== 10;
    const hasColumnFilters = columnFilters.length > 0;

    if (hasSearch || hasCustomPagination || hasColumnFilters) {
      setSearchTerm("");
      setColumnFilters([]);
      setPagination({ pageIndex: 0, pageSize: 10 });
      setRecipientSearchResetSignal((prev) => prev + 1);
      clearSelectedRows(table);
      return;
    }

    await refetchRecipients();
    clearSelectedRows(table);
  };

  return (
    <div className="space-y-6">
      <Dialog
        open={responseDialogOpen}
        onOpenChange={(open) => {
          setResponseDialogOpen(open);
          if (!open) setResponseRecipient(null);
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0 border border-border/70 bg-card">
          <DialogHeader className="px-3 py-2.5 border-b border-border/70 bg-muted/20">
            <DialogTitle>Response Details</DialogTitle>
            <DialogDescription>
              {responseRecipient?.name || "Recipient"} response history and
              answer details.
            </DialogDescription>
          </DialogHeader>
          <div className="px-3 pb-3 pt-2 overflow-y-auto max-h-[calc(90vh-78px)] space-y-2 bg-background/40">
            {isLoadingRecipientResponses ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : recipientResponseData?.responses?.length ? (
              <>
                <ResponseDetailsSummaryCard
                  name={recipientResponseData.recipient?.name || "-"}
                  email={recipientResponseData.recipient?.email || "-"}
                  phone={recipientResponseData.recipient?.phone || "-"}
                  responses={recipientResponseData.summary?.totalResponses || 0}
                />

                {recipientResponseData.responses.map(
                  (response, responseIndex) => (
                    <ResponseDetailsSubmissionCard
                      key={response._id}
                      submissionLabel={`Submission #${responseIndex + 1}`}
                      versionLabel={``}
                      submittedAtLabel={
                        response.submittedAt
                          ? format(
                              new Date(response.submittedAt),
                              "MMM d, yyyy h:mm a"
                            )
                          : "-"
                      }
                      completionTimeLabel={formatDuration(response.completionTime)}
                      deviceLabel={response.device || "-"}
                    >
                      {response.answers.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No answers were stored for this response.
                        </div>
                      ) : (
                        response.answers.map((answer, index) => (
                          <ResponseDetailsAnswerItem
                            key={`${response._id}-${answer.questionId}`}
                            index={index + 1}
                            title={answer.questionTitle}
                            questionType={answer.questionType}
                            sectionTitle={answer.sectionTitle}
                            required={answer.required}
                            answerText={renderAnswerValue(answer.answer)}
                            className="cursor-pointer"
                          />
                        ))
                      )}
                    </ResponseDetailsSubmissionCard>
                  )
                )}
              </>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No response details found for this recipient yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Invite</DialogTitle>
            <DialogDescription>
              Review and edit the message before sending.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Tokens: <span className="">{`{name}`}</span>,{" "}
              <span className="">{`{url}`}</span>,{" "}
              <span className="">{`{survey}`}</span>
            </div>
            <Textarea
              rows={6}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
            />
            <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground shadow-none">
              <p className="font-medium text-foreground mb-1">Preview</p>
              <p className="whitespace-pre-wrap">
                {renderPreviewMessage(previewMessage)}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={isSendingInvite}
            >
              Cancel
            </Button>
            <Button onClick={handleInviteSubmit} disabled={isSendingInvite}>
              {isSendingInvite ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
        {statsLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <SurveyMetricCard
              label="Total recipients"
              value={stats?.total || 0}
              caption="Invite funnel"
              icon={Users}
              accent="blue"
              viz={{
                type: "segments",
                label: `${stats?.pending || 0} pending, ${stats?.invited || 0} invited, ${stats?.in_progress || 0} in progress, ${stats?.completed || 0} completed`,
                parts: [
                  { key: "pending", value: stats?.pending || 0, className: "bg-chart-3" },
                  { key: "invited", value: stats?.invited || 0, className: "bg-chart-5" },
                  { key: "in_progress", value: stats?.in_progress || 0, className: "bg-chart-2" },
                  { key: "completed", value: stats?.completed || 0, className: "bg-chart-4" },
                ],
              }}
            />
            <SurveyMetricCard
              label="Pending"
              value={stats?.pending || 0}
              caption="Awaiting invite"
              icon={Clock}
              accent="amber"
              viz={{
                type: "meter",
                value: stats?.pending || 0,
                total: stats?.total || 0,
                label: `${stats?.pending || 0} of ${stats?.total || 0} recipients await an invite`,
              }}
            />
            <SurveyMetricCard
              label="Invited"
              value={stats?.invited || 0}
              caption="Sent invitations"
              icon={Mail}
              accent="violet"
              viz={{
                type: "meter",
                value: stats?.invited || 0,
                total: stats?.total || 0,
                label: `${stats?.invited || 0} of ${stats?.total || 0} recipients invited`,
              }}
            />
            <SurveyMetricCard
              label="In progress"
              value={stats?.in_progress || 0}
              caption="Saved drafts"
              icon={Clock}
              accent="coral"
              viz={{
                type: "meter",
                value: stats?.in_progress || 0,
                total: stats?.total || 0,
                label: `${stats?.in_progress || 0} of ${stats?.total || 0} recipients started`,
              }}
            />
            <SurveyMetricCard
              label="Completed"
              value={stats?.completed || 0}
              caption="Finished surveys"
              icon={CheckCircle2}
              accent="green"
              viz={{
                type: "meter",
                value: stats?.completed || 0,
                total: stats?.total || 0,
                label: `${stats?.completed || 0} of ${stats?.total || 0} recipients finished`,
              }}
            />
          </>
        )}
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients ({totalRecipients})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            table={table}
            loading={listLoading}
            totalRows={totalRecipients}
            emptyMessage="No recipients found."
          >
            <DataTableToolbar
              table={table}
              tableKey="recipients"
              exportOptions={{
                tableKey: "recipients",
                fileName: "recipients",
              }}
              filterFields={filterFields}
              searchOnEnter={true}
              resetSearchSignal={recipientSearchResetSignal}
              onSearch={(value) => {
                setSearchTerm(value || "");
                setPagination((prev) => ({
                  ...prev,
                  pageIndex: 0,
                }));
              }}
            >
              <div className="flex w-full sm:w-auto items-center gap-2 flex-nowrap">
                {onAddRecipient && (
                  <Button
                    onClick={onAddRecipient}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 sm:px-3"
                  >
                    <Plus className="h-4 w-4 sm:mr-1" />
                    <span className="sr-only sm:not-sr-only">Add Recipient</span>
                  </Button>
                )}
                {onUploadCSV && (
                  <Button
                    onClick={onUploadCSV}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 sm:px-3"
                  >
                    <Upload className="h-4 w-4 sm:mr-1" />
                    <span className="sr-only sm:not-sr-only">Upload CSV</span>
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Refresh"
                      disabled={listFetching}
                    >
                      <RefreshCw
                        className={`h-4 w-4 text-green-700 ${
                          listFetching ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh recipients</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </DataTableToolbar>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}

function renderAnswerValue(value) {
  if (value === null || value === undefined) return "No answer";
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "No answer";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "No answer";
  }
  return String(value);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
