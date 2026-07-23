import React, { useMemo, useRef, useState } from "react";
import {
  useSurveyAnalytics,
  useQuestionAnalytics,
  useExportResponses,
  useExportRespondents,
} from "../../lib/queries";
import { useSurveyResponses, useResponse } from "../../lib/queries/responses";
import { responsesApi } from "../../lib/api/responses";
import { usePagination } from "../../hooks/useHooks";
import { useDataTable } from "../../hooks/useDataTable";
import { DataTable } from "../shared/Table/DataTable";
import { DataTableToolbar } from "../shared/Table/DataTableConfig";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "../ui/empty-state";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Badge } from "../ui/badge";
import CustomBadge from "../shared/CustomBadge";
import {
  Users,
  MessageSquare,
  Clock,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  Monitor,
  Eye,
  RefreshCw,
  MoreHorizontal,
  Download,
  BarChart2,
  List,
  Calendar,
  Copy,
  ChevronDown,
  Check,
  X,
  FileText,
  Star,
  Layers,
} from "lucide-react";
import MetricCard from "../shared/MetricCard";
import { Input } from "../ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import {
  computeUnifiedSurveyInsights,
  formatDurationLabel,
} from "../../lib/utils/unifiedSurveyInsights";
import { copyElementAsPngToClipboard } from "../../lib/utils/copyChart";
import { format } from "date-fns";
import {
  ResponseDetailsAnswerItem,
  ResponseDetailsSubmissionCard,
  ResponseDetailsSummaryCard,
} from "../shared/ResponseDetailsBlocks";

// Chart palette mapped to theme tokens.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const ANALYTICS_CHART_COLOR = "var(--chart-2, oklch(0.631 0.101 183.491))";
const ANALYTICS_CHART_FONT =
  "var(--font-sans, ui-sans-serif, system-ui, -apple-system, sans-serif)";
const EMPTY_CHART_COLOR = "var(--border)";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    if (payload[0]?.payload?.isEmpty) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold">No responses yet</p>
        </div>
      );
    }
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} ({payload[0].payload.percentage || 0}%)
        </p>
      </div>
    );
  }
  return null;
};

const PIE_LABEL_MAX_CHARS = 14;

const renderPieSliceLabel = ({ name, percent, value, x, y, cx }) => {
  if (!value) return null;
  const fullName = String(name || "");
  const shortName =
    fullName.length > PIE_LABEL_MAX_CHARS
      ? `${fullName.slice(0, PIE_LABEL_MAX_CHARS)}...`
      : fullName;
  const label = `${shortName}: ${Math.round((percent || 0) * 100)}% (${value})`;
  const textAnchor = Number(x) < Number(cx) ? "end" : "start";

  return (
    <g>
      <title>{`${fullName}: ${Math.round((percent || 0) * 100)}% (${value})`}</title>
      <text
        x={x}
        y={y}
        fill="var(--foreground)"
        textAnchor={textAnchor}
        dominantBaseline="central"
        fontSize={12}
        fontFamily={ANALYTICS_CHART_FONT}
      >
        {label}
      </text>
    </g>
  );
};

const formatAnswerValue = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "No answer";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const sanitizeFilePart = (value = "question") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "question";

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

const normalizeCsvValue = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const EXPORT_HEADERS = [
  "Question Title",
  "Question Type",
  "Section Title",
  "Answer",
  "Respondent Name",
  "Respondent Email",
  "Submitted At",
];

const formatQuestionTypeLabel = (questionType) =>
  String(questionType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ANSWER_FORMAT_LABELS = {
  numeric: "Numbers",
  integer: "Numbers",
  email: "Email",
  phone: "Phone",
  url: "URL",
  alphanumeric: "A-Z + 0-9",
};

const getMedian = (values = []) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 10) / 10;
  }
  return sorted[middle];
};

const summarizeTextAnswers = (rows = [], topN = 5) => {
  const counter = new Map();
  rows.forEach((row) => {
    const answer = String(row.answer || "").trim();
    if (!answer || answer === "No answer") return;
    const normalized = answer.toLowerCase();
    const existing = counter.get(normalized) || { label: answer, count: 0 };
    existing.count += 1;
    counter.set(normalized, existing);
  });
  return [...counter.values()].sort((a, b) => b.count - a.count).slice(0, topN);
};

const groupDateAnswersByDay = (rows = [], topN = 8) => {
  const counts = new Map();
  rows.forEach((row) => {
    const raw = String(row.answer || "").trim();
    if (!raw || raw === "No answer") return;
    const parsedDate = new Date(raw);
    if (Number.isNaN(parsedDate.getTime())) return;
    const key = format(parsedDate, "MMM d, yyyy");
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
};

// ---------------------------------------------------------------------------
// Custom SVG Pie Chart – no external dep, no artifact lines
// ---------------------------------------------------------------------------
const LABEL_LINE_LENGTH = 18;
const LABEL_H_STUB = 8;
const SVG_PIE_MAX_CHARS = 14;
const PIE_HOVER_OFFSET = 16;

function buildSliceD(cx, cy, r, sa, ea) {
  // Full circle special case
  if (Math.abs(ea - sa - 2 * Math.PI) < 1e-6 || ea - sa >= 2 * Math.PI - 1e-6) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r}`,
      "Z",
    ].join(" ");
  }
  const x1 = cx + r * Math.cos(sa);
  const y1 = cy + r * Math.sin(sa);
  const x2 = cx + r * Math.cos(ea);
  const y2 = cy + r * Math.sin(ea);
  const large = ea - sa > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function CustomSvgPie({ data, colors, isEmpty }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const W = 360;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;
  const r = 85;
  const TOOLTIP_W = 220;
  const TOOLTIP_PAD = 10;
  const TOOLTIP_LINE_H = 18;

  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return null;

  const isSingle =
    data.length === 1 || data.filter((d) => d.value > 0).length === 1;

  // Build slices
  let cursor = -Math.PI / 2;
  const slices = (data || []).map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const sa = cursor;
    const ea = cursor + angle;
    const mid = cursor + angle / 2;
    cursor = ea;
    return { ...d, sa, ea, mid, i };
  });

  // Tooltip for hovered slice
  const hovered = hoveredIdx !== null ? slices[hoveredIdx] : null;
  let tooltipX = 0,
    tooltipY = 0,
    tooltipLines = [],
    tooltipColor = "",
    dynamicTooltipW = 220;
  if (hovered) {
    const isEmptySlice = isEmpty || hovered.isEmpty;
    tooltipColor = isEmptySlice
      ? EMPTY_CHART_COLOR
      : colors[hovered.i % colors.length];
    if (isEmptySlice) {
      tooltipLines = ["No responses yet"];
    } else {
      const fullName = String(hovered.name || "");
      const pct = Math.round((hovered.value / total) * 100);
      tooltipLines = [
        fullName,
        `${pct}%  ·  ${hovered.value} response${hovered.value !== 1 ? "s" : ""}`,
      ];
    }
    // Compute width to fit the longest line (≈7 px per char at 12px font).
    const longestLine = tooltipLines.reduce(
      (a, b) => (a.length >= b.length ? a : b),
      "",
    );
    dynamicTooltipW = Math.min(
      Math.max(180, longestLine.length * 7 + TOOLTIP_PAD * 2 + 14),
      320,
    );
    const bx = cx + (r + 40) * Math.cos(hovered.mid);
    const by = cy + (r + 40) * Math.sin(hovered.mid);
    const tooltipH = TOOLTIP_LINE_H * tooltipLines.length + TOOLTIP_PAD * 2;
    tooltipX = Math.min(
      Math.max(4, bx - dynamicTooltipW / 2),
      W - dynamicTooltipW - 4,
    );
    tooltipY = Math.min(Math.max(4, by - tooltipH / 2), H - tooltipH - 4);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxHeight: 300, overflow: "visible" }}
      aria-label="Pie chart"
      onMouseLeave={() => setHoveredIdx(null)}
    >
      {/* Slices */}
      {slices.map(({ sa, ea, i, value, isEmpty: sliceEmpty }) => {
        if (!value && !isEmpty) return null;
        const color =
          sliceEmpty || isEmpty ? EMPTY_CHART_COLOR : colors[i % colors.length];
        return (
          <path
            key={i}
            d={buildSliceD(cx, cy, r, sa, ea)}
            fill={color}
            stroke={color}
            strokeWidth={1}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        );
      })}

      {/* White separation lines between slices */}
      {!isSingle &&
        !isEmpty &&
        slices.map(({ sa, i, value }) => {
          if (!value) return null;
          return (
            <line
              key={`sep-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + r * Math.cos(sa)}
              y2={cy + r * Math.sin(sa)}
              stroke="white"
              strokeWidth={2}
              style={{ pointerEvents: "none" }}
            />
          );
        })}

      {/* Labels + connector lines */}
      {!isEmpty &&
        slices.map(({ mid, value, name, i }) => {
          if (!value) return null;
          const percent = value / total;
          const pctLabel = `${Math.round(percent * 100)}%`;
          const fullName = String(name || "");
          const shortName =
            fullName.length > SVG_PIE_MAX_CHARS
              ? `${fullName.slice(0, SVG_PIE_MAX_CHARS)}\u2026`
              : fullName;
          const label = `${shortName}: ${pctLabel} (${value})`;
          const color = colors[i % colors.length];

          const connectorAngle = isSingle ? Math.PI : mid;

          const x1 = cx + r * Math.cos(connectorAngle);
          const y1 = cy + r * Math.sin(connectorAngle);
          const x2 = cx + (r + LABEL_LINE_LENGTH) * Math.cos(connectorAngle);
          const y2 = cy + (r + LABEL_LINE_LENGTH) * Math.sin(connectorAngle);
          const right = x2 >= cx;
          const x3 = x2 + (right ? LABEL_H_STUB : -LABEL_H_STUB);

          return (
            <g key={i} style={{ pointerEvents: "none" }}>
              <title>{`${fullName}: ${pctLabel} (${value})`}</title>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={1.5}
              />
              <line
                x1={x2}
                y1={y2}
                x2={x3}
                y2={y2}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={x3 + (right ? 3 : -3)}
                y={y2}
                fill="var(--foreground)"
                textAnchor={right ? "start" : "end"}
                dominantBaseline="central"
                fontSize={11}
                fontFamily={ANALYTICS_CHART_FONT}
              >
                {label}
              </text>
            </g>
          );
        })}

      {/* Hover tooltip */}
      {hovered &&
        (() => {
          const tooltipH =
            TOOLTIP_LINE_H * tooltipLines.length + TOOLTIP_PAD * 2;
          return (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={dynamicTooltipW}
                height={tooltipH}
                rx={6}
                ry={6}
                fill="var(--popover, #fff)"
                stroke="var(--border)"
                strokeWidth={1}
                style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.12))" }}
              />
              <rect
                x={tooltipX + TOOLTIP_PAD}
                y={tooltipY + TOOLTIP_PAD + 4}
                width={8}
                height={8}
                rx={2}
                fill={tooltipColor}
              />
              {tooltipLines.map((line, li) => (
                <text
                  key={li}
                  x={tooltipX + TOOLTIP_PAD + (li === 0 ? 14 : 0)}
                  y={
                    tooltipY +
                    TOOLTIP_PAD +
                    TOOLTIP_LINE_H * li +
                    TOOLTIP_LINE_H / 2
                  }
                  dominantBaseline="central"
                  fontSize={li === 0 ? 12 : 11}
                  fontWeight={li === 0 ? 600 : 400}
                  fill={
                    li === 0 ? "var(--foreground)" : "var(--muted-foreground)"
                  }
                  fontFamily={ANALYTICS_CHART_FONT}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })()}
    </svg>
  );
}

export function SurveyAnalytics({ surveyId, survey, enabled = true }) {
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionSearchDraft, setQuestionSearchDraft] = useState("");
  const [respondentSearch, setRespondentSearch] = useState("");
  const [selectedResponseId, setSelectedResponseId] = useState(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [expandedQuestionSections, setExpandedQuestionSections] = useState({});
  const [questionViewModes, setQuestionViewModes] = useState({});
  const questionChartRefs = useRef({});
  const [activeTab, setActiveTab] = useState("summary");
  const [timeRange, setTimeRange] = useState("7");
  const [questionTypeFilter, setQuestionTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [exportingQuestion, setExportingQuestion] = useState(null);
  const [respondentSearchResetSignal, setRespondentSearchResetSignal] =
    useState(0);
  const isPublished =
    (survey?.status === "published" || survey?.status === "closed") &&
    survey?.publishedVersion > 0;
  const { data: analytics, isLoading: isLoadingAnalytics } =
    useSurveyAnalytics(surveyId, { enabled: enabled && !!surveyId });
  const {
    page: responsePageIndex,
    pageSize: responsePageSize,
    pagination: responsePagination,
    setPagination: setResponsePagination,
  } = usePagination({ initialSize: 10 });
  const {
    data: responsesData,
    isLoading: isLoadingResponses,
    isFetching: isFetchingResponses,
    refetch: refetchResponses,
  } =
    // Respondent table uses server-side pagination + optional server-side search
    useSurveyResponses(
      surveyId,
      {
        page: responsePageIndex + 1,
        pageSize: responsePageSize,
        search: respondentSearch?.trim() || undefined,
      },
      { enabled: enabled && !!surveyId },
    );
  const questionAnalyticsParams = useMemo(() => {
    const trimmed = questionSearch.trim();
    return {
      search: trimmed.length > 0 ? trimmed : undefined,
      type: questionTypeFilter !== "all" ? questionTypeFilter : undefined,
    };
  }, [questionSearch, questionTypeFilter]);

  const {
    data: questionAnalytics,
    isLoading: isLoadingQuestions,
    isFetching: isFetchingQuestions,
    refetch: refetchQuestionAnalytics,
  } = useQuestionAnalytics(surveyId, questionAnalyticsParams, {
    enabled: enabled && isPublished,
  });
  const { mutate: exportResponses, isPending: exportingResponses } =
    useExportResponses();
  const { mutate: exportRespondents, isPending: exportingRespondents } =
    useExportRespondents();
  const { data: selectedResponse, isLoading: loadingSelectedResponse } =
    useResponse(selectedResponseId, {
      enabled: responseDialogOpen && !!selectedResponseId,
    });

  const responses = useMemo(() => responsesData?.data || [], [responsesData]);
  const normalizedRespondentSearch = respondentSearch?.trim() || "";
  const hasRespondentSearch = normalizedRespondentSearch.length > 0;
  const responseAnswerItems = useMemo(() => {
    if (!selectedResponse) return [];

    if (Array.isArray(selectedResponse.answersDetailed)) {
      return selectedResponse.answersDetailed.map((item) => ({
        key: item.questionId || item.questionTitle || "question",
        label: item.questionTitle || item.questionId || "Question",
        value: item.value,
        questionType: item.questionType || null,
        sectionTitle: item.sectionTitle || null,
        required: !!item.required,
      }));
    }

    return Object.entries(selectedResponse.answers || {}).map(
      ([questionId, value]) => ({
        key: questionId,
        label: questionId,
        value,
        questionType: null,
        sectionTitle: null,
        required: false,
      }),
    );
  }, [selectedResponse]);

  const insights = useMemo(
    () => computeUnifiedSurveyInsights({ analytics, responses }),
    [analytics, responses],
  );

  const filteredDailyResponses = useMemo(() => {
    const allDays = analytics?.dailyResponseCounts || [];
    if (allDays.length === 0) return [];
    if (timeRange === "all") return allDays;
    const days = parseInt(timeRange, 10);
    return allDays.slice(-days);
  }, [analytics, timeRange]);

  const groupedQuestions = useMemo(() => {
    const filtered = (questionAnalytics || []).filter((q) => {
      const typeMatch =
        questionTypeFilter === "all" || q.questionType === questionTypeFilter;
      const query = questionSearch.trim().toLowerCase();
      const searchMatch =
        !query ||
        q.questionTitle?.toLowerCase().includes(query) ||
        q.sectionTitle?.toLowerCase().includes(query);
      return typeMatch && searchMatch;
    });

    return filtered.reduce((acc, q) => {
      const key = q.sectionTitle || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {});
  }, [questionAnalytics, questionTypeFilter, questionSearch]);

  const isQuestionFilterActive =
    questionSearch.trim().length > 0 || questionTypeFilter !== "all";
  const resetQuestionFilters = () => {
    setQuestionSearch("");
    setQuestionSearchDraft("");
    setQuestionTypeFilter("all");
  };

  const handleQuestionSearchSubmit = () => {
    const nextValue = questionSearchDraft.trim();
    if (nextValue === questionSearch) return;
    setQuestionSearch(nextValue);
  };

  const handleRefreshQuestions = async () => {
    const hasSearch =
      questionSearch.trim().length > 0 || questionSearchDraft.trim().length > 0;
    const hasTypeFilter = questionTypeFilter !== "all";

    if (hasSearch || hasTypeFilter) {
      resetQuestionFilters();
      return;
    }

    await refetchQuestionAnalytics();
  };

  const buildQuestionExportDataset = async (question) => {
    const allResponses = [];
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const pageResult = await responsesApi.getResponses(surveyId, {
        page,
        pageSize,
      });
      const pageRows = Array.isArray(pageResult?.data) ? pageResult.data : [];
      allResponses.push(...pageRows);
      totalPages = pageResult?.paging?.pages || 1;
      page += 1;
    }

    const questionRows = [];
    const batchSize = 10;
    for (let index = 0; index < allResponses.length; index += batchSize) {
      const batch = allResponses.slice(index, index + batchSize);
      const detailsBatch = await Promise.all(
        batch.map((response) =>
          response?._id ? responsesApi.getResponse(response._id) : null,
        ),
      );

      detailsBatch.forEach((details) => {
        if (!details) return;
        const answersDetailed = Array.isArray(details.answersDetailed)
          ? details.answersDetailed
          : [];
        const questionAnswer = answersDetailed.find(
          (item) => item?.questionId === question.questionId,
        );

        if (!questionAnswer) return;

        questionRows.push({
          questionTitle:
            questionAnswer.questionTitle || question.questionTitle || "",
          questionType:
            questionAnswer.questionType || question.questionType || "",
          sectionTitle:
            questionAnswer.sectionTitle || question.sectionTitle || "General",
          answer: formatAnswerValue(questionAnswer.value),
          respondentName: details.recipientName || "Anonymous",
          respondentEmail: details.recipientEmail || "",
          submittedAt: details.submittedAt
            ? format(new Date(details.submittedAt), "MMM d, yyyy h:mm a")
            : "",
          completionTimeSec:
            typeof details.completionTime === "number" &&
            Number.isFinite(details.completionTime)
              ? details.completionTime
              : null,
        });
      });
    }

    const completionTimes = questionRows
      .map((row) => row.completionTimeSec)
      .filter((value) => typeof value === "number" && value >= 0);

    const uniqueRespondents = new Set(
      questionRows.map((row, index) => {
        const email = String(row.respondentEmail || "")
          .trim()
          .toLowerCase();
        const name = String(row.respondentName || "")
          .trim()
          .toLowerCase();
        if (!email && (!name || name === "anonymous")) {
          return `anonymous-${index}`;
        }
        return `${name}|${email}`;
      }),
    ).size;

    return {
      rows: questionRows,
      meta: {
        questionTitle: question.questionTitle || "Question",
        questionType: question.questionType || "",
        sectionTitle: question.sectionTitle || "General",
        totalResponses: question.totalResponses || questionRows.length,
        displayedCount: question.displayedCount || questionRows.length,
        answeredCount: question.answeredCount || questionRows.length,
        skippedCount: question.skippedVisibleCount || 0,
        uniqueRespondents,
        avgCompletionSec:
          completionTimes.length > 0
            ? completionTimes.reduce((sum, value) => sum + value, 0) /
              completionTimes.length
            : null,
        medianCompletionSec: getMedian(completionTimes),
      },
    };
  };

  const exportQuestionAsCsv = async (question) => {
    const { rows } = await buildQuestionExportDataset(question);
    if (rows.length === 0) {
      toast.error("No question answers available to export");
      return;
    }

    const csvRows = [
      EXPORT_HEADERS,
      ...rows.map((row) => [
        row.questionTitle,
        row.questionType,
        row.sectionTitle,
        normalizeCsvValue(row.answer),
        row.respondentName,
        row.respondentEmail,
        row.submittedAt,
      ]),
    ];
    const filename = `survey-question-responses-${sanitizeFilePart(
      question.questionTitle || "question",
    )}.csv`;
    downloadCsv(csvRows, filename);
  };

  const exportQuestionAsPdf = async (question) => {
    const { rows, meta } = await buildQuestionExportDataset(question);
    if (rows.length === 0) {
      toast.error("No question answers available to export");
      return;
    }

    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable =
      autoTableModule?.default || autoTableModule?.autoTable || null;
    if (!autoTable) throw new Error("Failed to load PDF table support");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    const marginX = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const reportTitle = `${survey?.title || "Survey"} - Question Responses`;

    // Page 1: Data table
    doc.setFontSize(15);
    doc.text(reportTitle, marginX, 34);
    doc.setFontSize(11);
    doc.text(`${meta.questionTitle}`, marginX, 52);
    doc.setFontSize(9);
    doc.text(
      `Type: ${formatQuestionTypeLabel(meta.questionType)}   Section: ${meta.sectionTitle || "—"}`,
      marginX,
      67,
    );
    doc.text(
      `Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`,
      marginX,
      80,
    );
    doc.text(
      `Responses: ${meta.displayedCount}   Answered: ${meta.answeredCount}   Skipped: ${meta.skippedCount}`,
      marginX,
      93,
    );

    autoTable(doc, {
      startY: 106,
      head: [EXPORT_HEADERS],
      body: rows.map((row) => [
        row.questionTitle,
        formatQuestionTypeLabel(row.questionType),
        row.sectionTitle,
        row.answer,
        row.respondentName,
        row.respondentEmail,
        row.submittedAt,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: { fillColor: [34, 197, 94] },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 80 },
        2: { cellWidth: 80 },
        3: { cellWidth: 180 },
        4: { cellWidth: 100 },
        5: { cellWidth: 130 },
        6: { cellWidth: 95 },
      },
    });

    // Page 2: Analytics dashboard
    doc.addPage("a4", "landscape");
    const page2Top = 34;
    doc.setFontSize(15);
    doc.text(
      `${survey?.title || "Survey"} - Question Analytics`,
      marginX,
      page2Top,
    );
    doc.setFontSize(11);
    doc.text(meta.questionTitle, marginX, page2Top + 18);
    doc.setFontSize(9);
    doc.text(
      `Type: ${formatQuestionTypeLabel(meta.questionType)}   Section: ${meta.sectionTitle || "—"}`,
      marginX,
      page2Top + 31,
    );

    const kpis = [
      { label: "Total Responses", value: String(meta.totalResponses || 0) },
      { label: "Answered", value: String(meta.answeredCount || 0) },
      { label: "Skipped", value: String(meta.skippedCount || 0) },
      {
        label: "Unique Respondents",
        value: String(meta.uniqueRespondents || 0),
      },
    ];
    if (typeof meta.avgCompletionSec === "number") {
      kpis.push({
        label: "Avg Completion",
        value: formatDurationLabel(Math.round(meta.avgCompletionSec)),
      });
    }
    if (typeof meta.medianCompletionSec === "number") {
      kpis.push({
        label: "Median Completion",
        value: formatDurationLabel(Math.round(meta.medianCompletionSec)),
      });
    }

    const cardY = page2Top + 44;
    const cardGap = 10;
    const cardWidth = (pageWidth - marginX * 2 - cardGap * 2) / 3;
    const cardHeight = 48;
    kpis.slice(0, 6).forEach((kpi, index) => {
      const rowIndex = Math.floor(index / 3);
      const colIndex = index % 3;
      const x = marginX + colIndex * (cardWidth + cardGap);
      const y = cardY + rowIndex * (cardHeight + 8);
      doc.setDrawColor(223, 223, 223);
      doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4);
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text(kpi.label, x + 10, y + 16);
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(kpi.value, x + 10, y + 36);
    });

    const chartTop =
      cardY + (kpis.length > 3 ? cardHeight * 2 + 16 : cardHeight + 16);
    const chartLeft = marginX;
    const chartWidth = pageWidth - marginX * 2;
    const chartHeight = 220;

    const drawBarChart = (title, items = [], options = {}) => {
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(title, chartLeft, chartTop);

      const filteredItems = (items || []).slice(0, 8);
      if (filteredItems.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text("No chart data available.", chartLeft, chartTop + 16);
        return;
      }

      const topY = chartTop + 20;
      const labelWidth = 190;
      const barsAreaWidth = chartWidth - labelWidth - 20;
      const rowHeight = Math.min(
        22,
        Math.floor(chartHeight / filteredItems.length),
      );
      const maxCount = Math.max(
        ...filteredItems.map((item) => item.count || 0),
        1,
      );

      filteredItems.forEach((item, index) => {
        const y = topY + index * rowHeight;
        const safeLabel =
          String(item.label || "").length > 44
            ? `${String(item.label).slice(0, 44)}...`
            : String(item.label || "");
        const count = item.count || 0;
        const barLength = Math.max(
          0,
          Math.round((count / maxCount) * barsAreaWidth),
        );
        const percentText =
          typeof item.percentage === "number" ? ` (${item.percentage}%)` : "";

        doc.setFontSize(8);
        doc.setTextColor(55, 55, 55);
        doc.text(safeLabel, chartLeft, y + 12);
        doc.setFillColor(34, 197, 94);
        doc.rect(chartLeft + labelWidth, y + 3, barLength, 10, "F");
        doc.setFontSize(8);
        doc.setTextColor(35, 35, 35);
        doc.text(
          `${count}${percentText}`,
          chartLeft + labelWidth + barLength + 6,
          y + 12,
        );
      });

      if (options.note) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(
          options.note,
          chartLeft,
          topY + filteredItems.length * rowHeight + 16,
        );
      }
    };

    const questionType = meta.questionType;
    if (
      questionType === "single_choice" ||
      questionType === "multiple_choice" ||
      questionType === "dropdown"
    ) {
      const items = (question.choiceDistribution || []).map((choice) => ({
        label: choice.option || "Option",
        count: choice.count || 0,
        percentage: choice.percentage || 0,
      }));
      const topOption = [...items].sort((a, b) => b.count - a.count)[0];
      drawBarChart("Option Distribution", items, {
        note: topOption
          ? `Top option: ${topOption.label} (${topOption.count})${
              questionType === "multiple_choice"
                ? " • Multi-select question"
                : ""
            }`
          : questionType === "multiple_choice"
            ? "Multi-select question"
            : "",
      });
    } else if (questionType === "rating") {
      const ratingItems = Object.entries(question.ratingDistribution || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([rating, count]) => ({
          label: `Rating ${rating}`,
          count,
          percentage:
            meta.answeredCount > 0
              ? Math.round((count / meta.answeredCount) * 100)
              : 0,
        }));
      const note = `Average: ${question.averageRating ?? "—"}   Median: ${question.medianRating ?? "—"}   N: ${meta.answeredCount || 0}`;
      drawBarChart("Rating Distribution", ratingItems, { note });
    } else if (questionType === "short_text" || questionType === "long_text") {
      const topText = summarizeTextAnswers(rows, 8).map((item) => ({
        label: item.label,
        count: item.count,
      }));
      drawBarChart("Most Frequent Text Responses", topText, {
        note: `Answered: ${meta.answeredCount || 0}   Skipped: ${meta.skippedCount || 0}`,
      });
      const sampleRows = rows
        .filter((row) => row.answer && row.answer !== "No answer")
        .slice(0, 6)
        .map((row) => [row.answer]);
      if (sampleRows.length > 0) {
        autoTable(doc, {
          startY: chartTop + 186,
          head: [["Sample Responses"]],
          body: sampleRows,
          styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: pageWidth - marginX * 2 } },
          headStyles: { fillColor: [34, 197, 94] },
        });
      }
    } else if (questionType === "date") {
      const groupedDates = groupDateAnswersByDay(rows, 8);
      drawBarChart("Date Distribution", groupedDates, {
        note: `Answered: ${meta.answeredCount || 0}   Skipped: ${meta.skippedCount || 0}`,
      });
    } else {
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text("Insights", chartLeft, chartTop);
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `Answered: ${meta.answeredCount || 0}   Skipped: ${meta.skippedCount || 0}   Response Rate: ${meta.displayedCount > 0 ? Math.round((meta.answeredCount / meta.displayedCount) * 100) : 0}%`,
        chartLeft,
        chartTop + 20,
      );
    }

    doc.save(
      `survey-question-responses-${sanitizeFilePart(
        question.questionTitle || "question",
      )}.pdf`,
    );
  };

  const exportQuestionData = async (question, formatType) => {
    setExportingQuestion(`${question.questionId}:${formatType}`);
    try {
      if (formatType === "csv") {
        await exportQuestionAsCsv(question);
      } else {
        await exportQuestionAsPdf(question);
      }
      toast.success(
        `Question exported as ${formatType.toUpperCase()} successfully`,
      );
    } catch {
      toast.error(`Failed to export question as ${formatType.toUpperCase()}`);
    } finally {
      setExportingQuestion(null);
    }
  };

  const copyQuestionChart = async (question) => {
    const chartElement = questionChartRefs.current[question.questionId];
    if (!chartElement) {
      toast.error("Chart not found");
      return;
    }

    try {
      const result = await copyElementAsPngToClipboard(chartElement, {
        fileName: `chart-${sanitizeFilePart(question.questionTitle || "question")}.png`,
      });

      if (result.ok) {
        toast.success("Chart copied. Paste into PowerPoint.");
      } else {
        toast.error(result.error || "Couldn't copy chart. Download instead.");
      }
    } catch {
      toast.error("Failed to copy chart");
    }
  };

  const setQuestionChartRef = (questionId) => (element) => {
    if (!questionId) return;
    if (element) {
      questionChartRefs.current[questionId] = element;
    } else {
      delete questionChartRefs.current[questionId];
    }
  };

  const exportCurrentResponseCsv = () => {
    if (!selectedResponse) return;

    const rows = [
      ["Respondent", selectedResponse.recipientName || "Anonymous"],
      ["Email", selectedResponse.recipientEmail || ""],
      ["Phone", selectedResponse.recipientPhone || ""],
      [
        "Submitted",
        selectedResponse.submittedAt
          ? format(
              new Date(selectedResponse.submittedAt),
              "yyyy-MM-dd HH:mm:ss",
            )
          : "",
      ],
      ["Completion Time", formatDurationLabel(selectedResponse.completionTime)],
      ["Device", selectedResponse.device || ""],
      ["Survey Version", selectedResponse.surveyVersion || ""],
      [],
      ["Question", "Type", "Section", "Required", "Answer"],
      ...responseAnswerItems.map((item) => [
        item.label || "",
        item.questionType || "",
        item.sectionTitle || "",
        item.required ? "Yes" : "No",
        normalizeCsvValue(item.value),
      ]),
    ];

    const filename = `response-details-${sanitizeFilePart(
      selectedResponse.recipientName || "respondent",
    )}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;

    try {
      downloadCsv(rows, filename);
      toast.success("Response exported");
    } catch {
      toast.error("Failed to export response");
    }
  };

  const exportAllQuestionsData = () => {
    const allQuestions = Object.values(groupedQuestions).flat();
    if (allQuestions.length === 0) {
      toast.error("No question data available to export");
      return;
    }

    const rows = [
      [
        "Section",
        "Question",
        "Type",
        "Responses",
        "Displayed",
        "Answered",
        "Skipped",
        "Answer/Option",
        "Count",
        "Percentage",
      ],
    ];

    allQuestions.forEach((question) => {
      const base = [
        question.sectionTitle || "General",
        question.questionTitle || "",
        question.questionType || "",
        question.totalResponses || 0,
        question.displayedCount || 0,
        question.answeredCount || 0,
        question.skippedVisibleCount || 0,
      ];

      if (question.choiceDistribution?.length) {
        question.choiceDistribution.forEach((choice) => {
          rows.push([
            ...base,
            choice.option || "",
            choice.count || 0,
            `${choice.percentage || 0}%`,
          ]);
        });
        return;
      }

      if (question.questionType === "rating") {
        const ratingEntries = Object.entries(
          question.ratingDistribution || {},
        ).sort((a, b) => Number(a[0]) - Number(b[0]));
        const total = ratingEntries.reduce((sum, [, count]) => sum + count, 0);
        ratingEntries.forEach(([rating, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          rows.push([...base, rating, count, `${pct}%`]);
        });
        return;
      }

      const answerRows = Array.isArray(question.answerValues)
        ? question.answerValues
        : Array.isArray(question.sampleAnswers)
          ? question.sampleAnswers
          : [];
      if (answerRows.length === 0) {
        rows.push([...base, "No responses", "", ""]);
      } else {
        answerRows.forEach((answer) => rows.push([...base, answer, "", ""]));
      }
    });

    const filename = `questions-answers-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;

    try {
      downloadCsv(rows, filename);
      toast.success("All questions exported");
    } catch {
      toast.error("Failed to export questions");
    }
  };

  const getQuestionAnswers = (question) =>
    Array.isArray(question.textAnswers)
      ? question.textAnswers
      : Array.isArray(question.answerValues)
        ? question.answerValues
        : Array.isArray(question.sampleAnswers)
          ? question.sampleAnswers
          : [];

  const getTextChartData = (question) => {
    const answers = getQuestionAnswers(question)
      .map((answer) => String(answer || "").trim())
      .filter(Boolean);
    const answerCounts = answers.reduce((acc, answer) => {
      const key = answer.toLowerCase();
      const existing = acc.get(key) || { answer, count: 0 };
      existing.count += 1;
      acc.set(key, existing);
      return acc;
    }, new Map());

    return [...answerCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((item) => ({
        label:
          item.answer.length > 36
            ? `${item.answer.slice(0, 36)}...`
            : item.answer,
        count: item.count,
      }));
  };

  const getQuestionViewMode = (questionId, questionType) => {
    if (questionViewModes[questionId]) return questionViewModes[questionId];
    return questionType === "short_text" || questionType === "long_text"
      ? "answers"
      : "chart";
  };

  const setQuestionViewMode = (questionId, mode) => {
    setQuestionViewModes((prev) => ({ ...prev, [questionId]: mode }));
  };

  const isWhitelistSurvey = !!survey?.isWhitelistEnabled;
  const totalRecipientsDisplay = insights.totalRecipients;
  // Completion rate only applies to whitelisted surveys (fixed invite list).
  // The card is hidden entirely for open surveys.
  const completionRateDisplay = `${insights.completionRate}%`;
  const completionRateDescription = `Drop-off ${insights.dropOffRate}%`;

  const responseRows = useMemo(
    () =>
      responses.map((response) => ({
        ...response,
        responseId: response._id,
        respondent:
          response.recipientName ||
          response.recipientEmail ||
          response.recipientPhone ||
          "Anonymous",
        submittedAtLabel: response.submittedAt
          ? format(new Date(response.submittedAt), "MMM d, yyyy h:mm a")
          : "—",
        completionTimeLabel: formatDurationLabel(response.completionTime),
        deviceLabel: response.device || "—",
      })),
    [responses],
  );

  const toggleAnswerExpansion = (answerKey) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [answerKey]: !prev[answerKey],
    }));
  };

  const handleResponseDialogOpenChange = (open) => {
    setResponseDialogOpen(open);
    if (!open) {
      setExpandedAnswers({});
      setSelectedResponseId(null);
    }
  };

  const responseColumns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            className="translate-y-0.5 mx-2"
          />
        ),
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
        accessorKey: "respondent",
        header: "Respondent",
        tooltip: "Survey title - click to edit",
        cell: ({ row }) => (
          <div
            className="flex flex-col"
            onClick={() => {
              setSelectedResponseId(row.original.responseId);
              setResponseDialogOpen(true);
            }}
          >
            <span className="font-medium cursor-pointer hover:text-primary hover:underline min-w-0">
              {row.getValue("respondent")}
            </span>
            {(row.original.recipientEmail || row.original.recipientPhone) && (
              <span className="text-xs text-muted-foreground">
                {row.original.recipientEmail || row.original.recipientPhone}
              </span>
            )}
          </div>
        ),
      },

      {
        accessorKey: "submittedAtLabel",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.getValue("submittedAtLabel")}
          </span>
        ),
      },
      {
        accessorKey: "completionTimeLabel",
        header: "Time",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.getValue("completionTimeLabel")}
          </span>
        ),
      },
      {
        accessorKey: "deviceLabel",
        header: "Device",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.getValue("deviceLabel")}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: () => <CustomBadge variant="blue">completed</CustomBadge>,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedResponseId(row.original.responseId);
                  setResponseDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Response
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  const { table: responsesTable } = useDataTable({
    columns: responseColumns,
    data: responseRows,
    pageCount: responsesData?.paging?.pages || 1,
    pagination: responsePagination,
    setPagination: setResponsePagination,
    manualFiltering: true,
    manualPagination: true,
    initialState: {
      sorting: [{ id: "submittedAtLabel", desc: true }],
      columnPinning: { left: ["select"] },
    },
  });

  const handleRefreshRespondents = async () => {
    const hasActiveSearch = respondentSearch.trim().length > 0;
    const isFirstPage = responsePagination.pageIndex === 0;
    const shouldResetState = hasActiveSearch || !isFirstPage;

    if (shouldResetState) {
      setRespondentSearch("");
      setResponsePagination((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
      setRespondentSearchResetSignal((prev) => prev + 1);
      // Query key changes to default state and TanStack Query fetches fresh data.
      return;
    }

    // Already in default state: perform a single explicit refetch.
    await refetchResponses();
  };

  if (isLoadingAnalytics) {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Analytics Data Available"
        description="Publish this survey and collect responses to see detailed metrics and insights."
      />
    );
  }

  // Show empty state when there are no responses
  if (insights.totalResponses === 0) {
    const isClosed = survey?.status === "closed";
    return (
      <EmptyState
        icon={MessageSquare}
        title={isClosed ? "No Responses Collected" : "Waiting for Responses"}
        description={
          isClosed
            ? "This survey was closed without receiving any responses."
            : "Your survey is published and ready. Share the link with respondents to start collecting responses."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${isWhitelistSurvey ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      >
        <MetricCard
          title="TOTAL RECIPIENTS"
          value={totalRecipientsDisplay}
          description={isWhitelistSurvey ? "Sent surveys" : "Open survey"}
          icon={Users}
          badge={{ variant: "outline", text: "Distribution" }}
          className="-py-4 shadow-none"
        />
        <MetricCard
          title="TOTAL RESPONSES"
          value={insights.totalResponses}
          description="Completed surveys"
          icon={MessageSquare}
          badge={{ variant: "outline", text: "Engagement" }}
          className="-py-4 shadow-none"
        />
        {isWhitelistSurvey && (
          <MetricCard
            title="COMPLETION RATE"
            value={completionRateDisplay}
            description={completionRateDescription}
            icon={TrendingUp}
            badge={{ variant: "outline", text: "Performance" }}
            className="-py-4 shadow-none"
          />
        )}
        <MetricCard
          title="AVG. COMPLETION TIME"
          value={formatDurationLabel(insights.avgCompletionTimeSec)}
          description={
            insights.lastResponseAt
              ? `Last: ${format(new Date(insights.lastResponseAt), "MMM d, yyyy")}`
              : "Average duration"
          }
          icon={Clock}
          badge={{ variant: "outline", text: "Time" }}
          className="-py-4 shadow-none"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* <TabsList className="border w-full md:w-fit flex flex-col sm:flex-row flex-wrap sm:flex-nowrap items-stretch overflow-visible gap-1 md:gap-2 p-1 bg-muted rounded-md group-data-[orientation=horizontal]/tabs:h-auto sm:group-data-[orientation=horizontal]/tabs:h-12">
         */}
        <TabsList className="border w-full grid grid-cols-3 bg-muted rounded-md group-data-[orientation=horizontal]/tabs:h-auto sm:group-data-[orientation=horizontal]/tabs:h-10">
          <TabsTrigger
            value="summary"
            className="border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="questions"
            className="border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            Questions
          </TabsTrigger>
          <TabsTrigger
            value="respondent"
            className="border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
          >
            Respondent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-3">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Response Activity</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Daily response trend
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger className="w-28 h-4 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                    <Tabs value={viewMode} onValueChange={setViewMode}>
                      <TabsList className="h-9 border border-border bg-muted/40 p-1">
                        <TabsTrigger
                          value="list"
                          className="text-xs px-2.5 gap-1.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          List
                        </TabsTrigger>

                        <TabsTrigger
                          value="chart"
                          className="text-xs px-2.5 gap-1.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          Chart
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {viewMode === "chart" ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={
                        filteredDailyResponses.every((d) => d.count === 0)
                          ? []
                          : filteredDailyResponses
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 11,
                          fontFamily: ANALYTICS_CHART_FONT,
                        }}
                        stroke="var(--muted-foreground)"
                        label={{
                          value: "Date",
                          position: "insideBottom",
                          offset: -6,
                          style: {
                            fill: "var(--muted-foreground)",
                            fontSize: 11,
                            fontFamily: ANALYTICS_CHART_FONT,
                          },
                        }}
                      />
                      <YAxis
                        tick={{
                          fontSize: 11,
                          fontFamily: ANALYTICS_CHART_FONT,
                        }}
                        stroke="var(--muted-foreground)"
                        label={{
                          value: "Responses",
                          angle: -90,
                          position: "insideLeft",
                          style: {
                            fill: "var(--muted-foreground)",
                            fontSize: 11,
                            fontFamily: ANALYTICS_CHART_FONT,
                          },
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={{ fontFamily: ANALYTICS_CHART_FONT }}
                        itemStyle={{ fontFamily: ANALYTICS_CHART_FONT }}
                        labelStyle={{ fontFamily: ANALYTICS_CHART_FONT }}
                      />
                      <Legend
                        wrapperStyle={{ fontFamily: ANALYTICS_CHART_FONT }}
                      />
                      {!filteredDailyResponses.every((d) => d.count === 0) && (
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Responses"
                          stroke={ANALYTICS_CHART_COLOR}
                          strokeWidth={2}
                          dot={{ fill: ANALYTICS_CHART_COLOR, r: 3 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : filteredDailyResponses.length === 0 ||
                  filteredDailyResponses.every((d) => d.count === 0) ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <div className="space-y-2 max-h-90 overflow-y-auto">
                    {filteredDailyResponses.map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between text-sm rounded-md border px-3 py-2"
                      >
                        <span>{day.date}</span>
                        <span className="font-semibold text-primary">
                          {day.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Latest Responses</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 max-h-105 overflow-y-auto">
                {(analytics?.recentActivity || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No responses yet.
                  </p>
                ) : (
                  analytics.recentActivity.map((item, idx) => (
                    <div
                      key={`${item.submittedAt}-${idx}`}
                      className="rounded-md border p-3"
                    >
                      <p className="text-sm font-medium">
                        {item.recipientName ||
                          item.recipientEmail ||
                          item.recipientPhone ||
                          "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.submittedAt
                          ? format(
                              new Date(item.submittedAt),
                              "MMM d, yyyy h:mm a",
                            )
                          : "-"}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Monitor className="h-3.5 w-3.5" />
                        <span>{item.device || "Unknown device"}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="mt-3">
          {!isPublished ? (
            <EmptyState
              icon={BarChart3}
              title="Question Analytics Not Available"
              description="Question-level analytics are only available for published or closed surveys. Publish this survey to start collecting and analyzing responses."
            />
          ) : (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search questions..."
                        value={questionSearchDraft}
                        onChange={(e) => setQuestionSearchDraft(e.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleQuestionSearchSubmit();
                          }
                        }}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={handleRefreshQuestions}
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          aria-label="Refresh question analytics"
                          disabled={isFetchingQuestions}
                        >
                          <RefreshCw
                            className={`h-4 w-4 text-green-700 ${
                              isFetchingQuestions ? "animate-spin" : ""
                            }`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Refresh question analytics</p>
                      </TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2"
                        >
                          <Filter className="w-3 h-3" />
                          {questionTypeFilter === "all"
                            ? "All Types"
                            : questionTypeFilter.replace("_", " ")}
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setQuestionTypeFilter("all")}
                          className="flex items-center justify-between"
                        >
                          All Types
                          {questionTypeFilter === "all" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setQuestionTypeFilter("single_choice")}
                          className="flex items-center justify-between"
                        >
                          Single Choice
                          {questionTypeFilter === "single_choice" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            setQuestionTypeFilter("multiple_choice")
                          }
                          className="flex items-center justify-between"
                        >
                          Multiple Choice
                          {questionTypeFilter === "multiple_choice" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setQuestionTypeFilter("dropdown")}
                          className="flex items-center justify-between"
                        >
                          Dropdown
                          {questionTypeFilter === "dropdown" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setQuestionTypeFilter("rating")}
                          className="flex items-center justify-between"
                        >
                          Rating
                          {questionTypeFilter === "rating" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setQuestionTypeFilter("short_text")}
                          className="flex items-center justify-between"
                        >
                          Short Text
                          {questionTypeFilter === "short_text" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setQuestionTypeFilter("long_text")}
                          className="flex items-center justify-between"
                        >
                          Long Text
                          {questionTypeFilter === "long_text" && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>

                        {isQuestionFilterActive && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={resetQuestionFilters}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Clear Filters
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5"
                      onClick={exportAllQuestionsData}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export All Questions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {isLoadingQuestions ? (
                <Card>
                  <CardContent className="p-10">
                    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Loading question analytics...
                    </div>
                  </CardContent>
                </Card>
              ) : Object.keys(groupedQuestions).length === 0 ? (
                isQuestionFilterActive ? (
                  <EmptyState
                    icon={Search}
                    title="No matching questions"
                    description="Try adjusting or clearing your filters to see results."
                    action={{
                      label: "Clear filters",
                      onClick: resetQuestionFilters,
                      variant: "outline",
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title={
                      insights.totalResponses === 0
                        ? "No Responses Yet"
                        : "No Question Analytics"
                    }
                    description={
                      insights.totalResponses === 0
                        ? "Once respondents start completing the survey, question-level analytics will appear here showing response distributions, ratings, and answer patterns."
                        : "Question analytics are not available. This may happen if the survey has no questions or if data is still being processed."
                    }
                  />
                )
              ) : (
                Object.entries(groupedQuestions).map(
                  ([sectionTitle, items]) => {
                    const isSectionExpanded =
                      expandedQuestionSections[sectionTitle] ?? true;
                    const requiredCount = items.filter(
                      (q) => !!q.required,
                    ).length;
                    const questionTypeCounts = items.reduce((acc, q) => {
                      const key = q.questionType || "other";
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {});
                    const topQuestionTypeStats = Object.entries(
                      questionTypeCounts,
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);
                    const formatQuestionTypeLabel = (typeKey) =>
                      String(typeKey || "")
                        .split("_")
                        .filter(Boolean)
                        .map(
                          (part) =>
                            part.charAt(0).toUpperCase() + part.slice(1),
                        )
                        .join(" ");

                    return (
                      <Collapsible
                        key={sectionTitle}
                        open={isSectionExpanded}
                        onOpenChange={(nextOpen) =>
                          setExpandedQuestionSections((prev) => ({
                            ...prev,
                            [sectionTitle]: nextOpen,
                          }))
                        }
                      >
                        <Card className="group border border-border transition-colors shadow-none py-0 hover:border-primary/40">
                          <CollapsibleTrigger asChild>
                            <CardHeader
                              role="button"
                              tabIndex={0}
                              className="p-4 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3 cursor-pointer group-hover:bg-muted/25"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 transition-colors group-hover:bg-primary/20">
                                    <Layers className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 transition-colors group-hover:bg-primary/20">
                                    <ChevronDown
                                      className={`w-4 h-4 text-primary transition-transform duration-200 ${
                                        isSectionExpanded
                                          ? "rotate-0"
                                          : "-rotate-90"
                                      }`}
                                    />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-foreground">
                                    {sectionTitle}
                                  </CardTitle>
                                </div>
                                {!isSectionExpanded && (
                                  <div className="mt-2 space-y-1.5 ml-6">
                                    <div className="flex items-center gap-3 text-sm">
                                      <div className="flex items-center gap-1">
                                        <FileText className="w-3 h-3 text-muted-foreground/80" />
                                        <span className="text-muted-foreground">
                                          {items.length} question
                                          {items.length === 1 ? "" : "s"}
                                        </span>
                                      </div>
                                      {requiredCount > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Star className="w-3 h-3 text-amber-500" />
                                          <span className="text-amber-700 font-semibold">
                                            {requiredCount} required
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {topQuestionTypeStats.map(
                                        ([typeKey, count]) => (
                                          <Badge
                                            key={`${sectionTitle}-${typeKey}`}
                                            variant="secondary"
                                            className="text-xs px-2 py-0 bg-accent/60 text-muted-foreground border-transparent hover:bg-accent/60"
                                          >
                                            {count}x{" "}
                                            {formatQuestionTypeLabel(typeKey)}
                                          </Badge>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex text-xs items-center gap-1">
                                <FileText className="w-3 h-3 text-muted-foreground/80" />
                                <span className="text-muted-foreground">
                                  {items.length} question
                                  {items.length === 1 ? "" : "s"}
                                </span>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="-mt-4">
                            <CardContent className="pt-0 px-4 pb-4">
                              <Accordion type="multiple" className="space-y-2">
                                {items.map((qa, idx) => (
                                  <AccordionItem
                                    key={`${qa.questionId}-${idx}`}
                                    value={`question-${qa.questionId}-${idx}`}
                                    className="group bg-card border border-border/70 rounded-lg transition-colors overflow-hidden hover:border-primary/45 hover:bg-muted/20 last:!border-b"
                                  >
                                    {/* Header */}
                                    <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/40 border-b border-border/60 data-[state=open]:bg-muted/40 cursor-pointer text-left transition-colors duration-150 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:rounded-md [&>svg]:bg-primary/10 [&>svg]:p-1.5 [&>svg]:text-primary [&>svg]:translate-y-0 group-hover:[&>svg]:bg-primary/20">
                                      <div className="flex flex-col items-start text-left flex-1 gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="flex items-center justify-center min-w-7 h-7 bg-primary/10 text-primary font-semibold text-xs rounded-md shrink-0">
                                            {idx + 1}
                                          </div>
                                          <span className="text-sm font-medium text-foreground">
                                            {qa.questionTitle}
                                          </span>

                                          <Badge
                                            variant="outline"
                                            className="text-xs h-6"
                                          >
                                            {qa.questionType?.replace("_", " ")}
                                          </Badge>
                                          {(qa.questionType === "short_text" ||
                                            qa.questionType === "long_text") &&
                                            qa.answerFormat &&
                                            ANSWER_FORMAT_LABELS[
                                              qa.answerFormat
                                            ] && (
                                              <Badge className="text-xs h-6 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                                {
                                                  ANSWER_FORMAT_LABELS[
                                                    qa.answerFormat
                                                  ]
                                                }
                                              </Badge>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                          {qa.totalResponses || 0} responses •
                                          Displayed {qa.displayedCount || 0} •
                                          Answered {qa.answeredCount || 0} •
                                          Skipped {qa.skippedVisibleCount || 0}
                                        </p>
                                      </div>
                                    </AccordionTrigger>

                                    {/* Content */}
                                    <AccordionContent className="px-4 sm:px-6 pb-5 pt-4 space-y-4 bg-card border-0">
                                      {/* Top Controls */}
                                      <div className="flex items-center justify-between gap-2 pb-3 flex-wrap">
                                        <div className="flex items-center gap-3 ">
                                          <Tabs
                                            value={getQuestionViewMode(
                                              qa.questionId,
                                              qa.questionType,
                                            )}
                                            onValueChange={(value) =>
                                              setQuestionViewMode(
                                                qa.questionId,
                                                value,
                                              )
                                            }
                                          >
                                            <TabsList className="h-8 border border-border bg-muted/40 p-1">
                                              <TabsTrigger
                                                value="answers"
                                                className="text-xs px-2.5 gap-1.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                              >
                                                <List className="h-3 w-3" />
                                                Answers
                                              </TabsTrigger>

                                              <TabsTrigger
                                                value="chart"
                                                className="text-xs px-2.5 gap-1.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                              >
                                                <BarChart2 className="h-3 w-3" />
                                                Chart
                                              </TabsTrigger>
                                            </TabsList>
                                          </Tabs>
                                        </div>

                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-8 gap-1.5"
                                              disabled={
                                                exportingQuestion !== null &&
                                                exportingQuestion.startsWith(
                                                  `${qa.questionId}:`,
                                                )
                                              }
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              Export
                                            </Button>
                                          </DropdownMenuTrigger>

                                          <DropdownMenuContent align="end">
                                            {getQuestionViewMode(
                                              qa.questionId,
                                              qa.questionType,
                                            ) === "chart" && (
                                              <DropdownMenuItem
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  event.stopPropagation();
                                                  copyQuestionChart(qa);
                                                }}
                                              >
                                                <Copy className="mr-2 h-3.5 w-3.5" />
                                                Copy Chart
                                              </DropdownMenuItem>
                                            )}

                                            <DropdownMenuItem
                                              onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                exportQuestionData(qa, "csv");
                                              }}
                                            >
                                              <Download className="mr-2 h-3.5 w-3.5" />
                                              Export CSV
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                              onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                exportQuestionData(qa, "pdf");
                                              }}
                                            >
                                              <Download className="mr-2 h-3.5 w-3.5" />
                                              Export PDF
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {/* === CHART + ANSWER RENDERING LOGIC BELOW (UNCHANGED) === */}
                                      {/* Everything below this line remains exactly as you had it */}
                                      {/* I intentionally did NOT modify any chart, answers, or data logic */}

                                      {getQuestionViewMode(
                                        qa.questionId,
                                        qa.questionType,
                                      ) === "chart" &&
                                        qa.choiceDistribution?.length > 0 && (
                                          <div
                                            ref={setQuestionChartRef(
                                              qa.questionId,
                                            )}
                                            className="grid md:grid-cols-2 gap-6"
                                          >
                                            {/* Pie Chart */}
                                            <div className="flex items-center justify-center">
                                              {(() => {
                                                const pieDataSource = (
                                                  qa.choiceDistribution || []
                                                ).map((choice) => ({
                                                  name: choice.option,
                                                  value: choice.count,
                                                  percentage: choice.percentage,
                                                }));
                                                const hasPieData =
                                                  pieDataSource.some(
                                                    (entry) =>
                                                      Number(entry.value) > 0,
                                                  );
                                                const pieData = hasPieData
                                                  ? pieDataSource
                                                  : [
                                                      {
                                                        name: "No responses",
                                                        value: 1,
                                                        percentage: 0,
                                                        isEmpty: true,
                                                      },
                                                    ];

                                                return (
                                                  <CustomSvgPie
                                                    data={pieData}
                                                    colors={CHART_COLORS}
                                                    isEmpty={!hasPieData}
                                                  />
                                                );
                                              })()}
                                            </div>

                                            {/* Legend */}
                                            <div className="rounded-md border border-border/70 bg-card">
                                              <div className="grid grid-cols-12 border-b bg-muted/30 text-xs font-medium">
                                                <div className="col-span-7 px-3 py-2">
                                                  Option
                                                </div>
                                                <div className="col-span-2 px-3 py-2 text-right">
                                                  Count
                                                </div>
                                                <div className="col-span-3 px-3 py-2 text-right">
                                                  %
                                                </div>
                                              </div>
                                              {qa.choiceDistribution.map(
                                                (choice, index) => (
                                                  <div
                                                    key={choice.option}
                                                    className="grid grid-cols-12 border-b last:border-b-0 text-sm"
                                                  >
                                                    <div className="col-span-7 px-3 py-2 flex items-center gap-2">
                                                      <div
                                                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                                        style={{
                                                          backgroundColor:
                                                            CHART_COLORS[
                                                              index %
                                                                CHART_COLORS.length
                                                            ],
                                                        }}
                                                      />
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <span className="truncate block max-w-[220px] cursor-default">
                                                            {choice.option}
                                                          </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                          side="top"
                                                          className="max-w-xs break-words"
                                                        >
                                                          {choice.option}
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </div>
                                                    <div className="col-span-2 px-3 py-2 text-right">
                                                      {choice.count}
                                                    </div>
                                                    <div className="col-span-3 px-3 py-2 text-right">
                                                      {choice.percentage}%
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {getQuestionViewMode(
                                        qa.questionId,
                                        qa.questionType,
                                      ) === "chart" &&
                                        qa.questionType === "rating" && (
                                          <div
                                            ref={setQuestionChartRef(
                                              qa.questionId,
                                            )}
                                            className="space-y-4"
                                          >
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                              <div className="rounded-md bg-muted/40 p-2">
                                                Avg: {qa.averageRating ?? "—"}
                                              </div>
                                              <div className="rounded-md bg-muted/40 p-2">
                                                Median: {qa.medianRating ?? "—"}
                                              </div>
                                              <div className="rounded-md bg-muted/40 p-2">
                                                Min: {qa.minRating ?? "—"}
                                              </div>
                                              <div className="rounded-md bg-muted/40 p-2">
                                                Max: {qa.maxRating ?? "—"}
                                              </div>
                                            </div>

                                            {/* Horizontal Bar Chart for Ratings */}
                                            {(() => {
                                              const barDataSource =
                                                Object.entries(
                                                  qa.ratingDistribution || {},
                                                )
                                                  .sort(
                                                    (a, b) =>
                                                      Number(a[0]) -
                                                      Number(b[0]),
                                                  )
                                                  .map(([rating, count]) => {
                                                    const total = Object.values(
                                                      qa.ratingDistribution ||
                                                        {},
                                                    ).reduce(
                                                      (sum, val) => sum + val,
                                                      0,
                                                    );
                                                    const percentage =
                                                      total > 0
                                                        ? Math.round(
                                                            (count / total) *
                                                              100,
                                                          )
                                                        : 0;
                                                    return {
                                                      rating,
                                                      count,
                                                      percentage,
                                                      label: `${count} (${percentage}%)`,
                                                    };
                                                  });

                                              const hasBarData =
                                                barDataSource.length > 0 &&
                                                barDataSource.some(
                                                  (entry) => entry.count > 0,
                                                );

                                              // Show empty state with a solid muted placeholder bar (mirrors empty pie)
                                              const barData = hasBarData
                                                ? barDataSource
                                                : [
                                                    {
                                                      rating: "No responses",
                                                      count: 1,
                                                      percentage: 0,
                                                      label: "",
                                                      isEmpty: true,
                                                    },
                                                  ];

                                              return (
                                                <ResponsiveContainer
                                                  width="100%"
                                                  height={Math.max(
                                                    200,
                                                    barData.length * 40,
                                                  )}
                                                >
                                                  <BarChart
                                                    data={barData}
                                                    layout="vertical"
                                                    margin={{
                                                      top: 5,
                                                      right: 30,
                                                      left: 20,
                                                      bottom: 5,
                                                    }}
                                                  >
                                                    <CartesianGrid
                                                      strokeDasharray="3 3"
                                                      horizontal={false}
                                                    />
                                                    <XAxis
                                                      type="number"
                                                      tick={{
                                                        fontSize: 11,
                                                        fontFamily:
                                                          ANALYTICS_CHART_FONT,
                                                      }}
                                                    />
                                                    <YAxis
                                                      dataKey="rating"
                                                      type="category"
                                                      width={100}
                                                      tick={{
                                                        fontSize: 11,
                                                        fontFamily:
                                                          ANALYTICS_CHART_FONT,
                                                      }}
                                                    />
                                                    <RechartsTooltip
                                                      content={({
                                                        active,
                                                        payload,
                                                      }) => {
                                                        if (
                                                          active &&
                                                          payload &&
                                                          payload.length
                                                        ) {
                                                          return (
                                                            <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                                                              <p className="text-sm font-semibold">
                                                                Rating:{" "}
                                                                {
                                                                  payload[0]
                                                                    .payload
                                                                    .rating
                                                                }
                                                              </p>
                                                              <p className="text-sm text-muted-foreground">
                                                                {
                                                                  payload[0]
                                                                    .payload
                                                                    .count
                                                                }{" "}
                                                                responses (
                                                                {
                                                                  payload[0]
                                                                    .payload
                                                                    .percentage
                                                                }
                                                                %)
                                                              </p>
                                                            </div>
                                                          );
                                                        }
                                                        return null;
                                                      }}
                                                    />
                                                    <Bar
                                                      dataKey="count"
                                                      fill={
                                                        ANALYTICS_CHART_COLOR
                                                      }
                                                      radius={[0, 4, 4, 0]}
                                                      label={{
                                                        position: "right",
                                                        fill: "var(--muted-foreground)",
                                                        fontSize: 11,
                                                        fontFamily:
                                                          ANALYTICS_CHART_FONT,
                                                        formatter: (val) =>
                                                          hasBarData
                                                            ? String(val)
                                                            : "",
                                                      }}
                                                    >
                                                      {barData.map(
                                                        (entry, idx) => (
                                                          <Cell
                                                            key={`bar-cell-${idx}`}
                                                            fill={
                                                              entry.isEmpty
                                                                ? EMPTY_CHART_COLOR
                                                                : ANALYTICS_CHART_COLOR
                                                            }
                                                          />
                                                        ),
                                                      )}
                                                    </Bar>
                                                  </BarChart>
                                                </ResponsiveContainer>
                                              );
                                            })()}
                                          </div>
                                        )}

                                      {getQuestionViewMode(
                                        qa.questionId,
                                        qa.questionType,
                                      ) === "chart" &&
                                        (qa.questionType === "short_text" ||
                                          qa.questionType === "long_text") && (
                                          <div
                                            ref={setQuestionChartRef(
                                              qa.questionId,
                                            )}
                                            className="space-y-3"
                                          >
                                            {getTextChartData(qa).length ===
                                            0 ? (
                                              <div className="rounded-md border border-border/70 bg-card p-3">
                                                <ResponsiveContainer
                                                  width="100%"
                                                  height={260}
                                                >
                                                  <BarChart
                                                    data={[
                                                      {
                                                        label: "",
                                                        count: 1,
                                                        isEmpty: true,
                                                      },
                                                    ]}
                                                    margin={{
                                                      top: 10,
                                                      right: 8,
                                                      left: 2,
                                                      bottom: 34,
                                                    }}
                                                  >
                                                    <CartesianGrid
                                                      vertical={false}
                                                      strokeDasharray="3 3"
                                                      stroke="var(--border)"
                                                    />
                                                    <XAxis
                                                      dataKey="label"
                                                      axisLine={false}
                                                      tickLine={false}
                                                      tick={{
                                                        fontSize: 11,
                                                        fontFamily:
                                                          ANALYTICS_CHART_FONT,
                                                      }}
                                                    />
                                                    <YAxis
                                                      allowDecimals={false}
                                                      axisLine={false}
                                                      tickLine={false}
                                                      width={28}
                                                      domain={[0, 4]}
                                                      tick={{
                                                        fontSize: 11,
                                                        fontFamily:
                                                          ANALYTICS_CHART_FONT,
                                                      }}
                                                    />
                                                    <Bar
                                                      dataKey="count"
                                                      barSize={50}
                                                      radius={[8, 8, 0, 0]}
                                                      label={{
                                                        formatter: () => "",
                                                      }}
                                                    >
                                                      <Cell
                                                        fill={EMPTY_CHART_COLOR}
                                                      />
                                                    </Bar>
                                                  </BarChart>
                                                </ResponsiveContainer>
                                              </div>
                                            ) : (
                                              <ResponsiveContainer
                                                width="100%"
                                                height={360}
                                              >
                                                <BarChart
                                                  data={getTextChartData(qa)}
                                                  margin={{
                                                    top: 10,
                                                    right: 8,
                                                    left: 2,
                                                    bottom: 34,
                                                  }}
                                                >
                                                  <CartesianGrid
                                                    vertical={false}
                                                    strokeDasharray="3 3"
                                                    stroke="var(--border)"
                                                  />
                                                  <XAxis
                                                    dataKey="label"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    minTickGap={12}
                                                    angle={0}
                                                    textAnchor="middle"
                                                    tickMargin={10}
                                                    height={30}
                                                    tick={{
                                                      fontSize: 12,
                                                      fontWeight: 500,
                                                      fill: "var(--muted-foreground)",
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                    }}
                                                    tickFormatter={(value) => {
                                                      const label = String(
                                                        value || "",
                                                      );
                                                      return label.length > 12
                                                        ? `${label.slice(0, 12)}...`
                                                        : label;
                                                    }}
                                                  />
                                                  <YAxis
                                                    allowDecimals={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={28}
                                                    domain={[
                                                      0,
                                                      (dataMax) =>
                                                        Math.max(
                                                          4,
                                                          Number(dataMax || 0) +
                                                            1,
                                                        ),
                                                    ]}
                                                    tick={{
                                                      fontSize: 12,
                                                      fill: "var(--muted-foreground)",
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                    }}
                                                  />
                                                  <RechartsTooltip
                                                    cursor={false}
                                                    contentStyle={{
                                                      backgroundColor:
                                                        "var(--popover)",
                                                      border:
                                                        "1px solid var(--border)",
                                                      borderRadius: "8px",
                                                      boxShadow:
                                                        "0 4px 12px rgba(15, 23, 42, 0.08)",
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                    }}
                                                    labelStyle={{
                                                      color:
                                                        "var(--foreground)",
                                                      fontWeight: 600,
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                    }}
                                                    itemStyle={{
                                                      color:
                                                        "var(--foreground)",
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                    }}
                                                    formatter={(value) => [
                                                      value,
                                                      "Responses",
                                                    ]}
                                                  />
                                                  <Legend
                                                    align="right"
                                                    verticalAlign="top"
                                                    iconType="square"
                                                    wrapperStyle={{
                                                      paddingBottom: "8px",
                                                      fontSize: "12px",
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                      color:
                                                        "var(--muted-foreground)",
                                                    }}
                                                  />
                                                  <Bar
                                                    dataKey="count"
                                                    fill={ANALYTICS_CHART_COLOR}
                                                    name="Responses"
                                                    barSize={50}
                                                    maxBarSize={58}
                                                    radius={[8, 8, 0, 0]}
                                                    label={{
                                                      position: "top",
                                                      fill: "var(--muted-foreground)",
                                                      fontSize: 12,
                                                      fontFamily:
                                                        ANALYTICS_CHART_FONT,
                                                    }}
                                                  />
                                                </BarChart>
                                              </ResponsiveContainer>
                                            )}
                                          </div>
                                        )}

                                      {getQuestionViewMode(
                                        qa.questionId,
                                        qa.questionType,
                                      ) === "answers" &&
                                        (qa.choiceDistribution?.length > 0 ||
                                          qa.questionType === "rating") && (
                                          <div className="rounded-md border border-border/70 bg-card">
                                            <div className="grid grid-cols-3 border-b bg-muted/30 text-xs font-medium">
                                              <div className="px-3 py-2">
                                                Answer
                                              </div>
                                              <div className="px-3 py-2">
                                                Count
                                              </div>
                                              <div className="px-3 py-2">
                                                Percentage
                                              </div>
                                            </div>
                                            {(qa.choiceDistribution?.length > 0
                                              ? qa.choiceDistribution.map(
                                                  (item) => ({
                                                    answer: item.option,
                                                    count: item.count,
                                                    percentageValue:
                                                      Number(item.percentage) ||
                                                      0,
                                                    percentageLabel: `${Number(item.percentage) || 0}%`,
                                                  }),
                                                )
                                              : Object.entries(
                                                  qa.ratingDistribution || {},
                                                )
                                                  .sort(
                                                    (a, b) =>
                                                      Number(a[0]) -
                                                      Number(b[0]),
                                                  )
                                                  .map(([rating, count]) => {
                                                    const total = Object.values(
                                                      qa.ratingDistribution ||
                                                        {},
                                                    ).reduce(
                                                      (sum, value) =>
                                                        sum + value,
                                                      0,
                                                    );
                                                    const pct =
                                                      total > 0
                                                        ? Math.round(
                                                            (count / total) *
                                                              100,
                                                          )
                                                        : 0;
                                                    return {
                                                      answer: rating,
                                                      count,
                                                      percentageValue: pct,
                                                      percentageLabel: `${pct}%`,
                                                    };
                                                  })
                                            ).map((row, rowIndex) => (
                                              <div
                                                key={`${qa.questionId}-dist-${rowIndex}`}
                                                className="grid grid-cols-3 border-b last:border-b-0 text-sm"
                                              >
                                                <div className="px-3 py-2 break-words">
                                                  {row.answer}
                                                </div>
                                                <div className="px-3 py-2">
                                                  {row.count}
                                                </div>
                                                <div className="px-3 py-2">
                                                  <div className="flex items-center gap-2">
                                                    <Progress
                                                      value={Math.max(
                                                        0,
                                                        Math.min(
                                                          100,
                                                          Number(
                                                            row.percentageValue,
                                                          ) || 0,
                                                        ),
                                                      )}
                                                      className="h-2 flex-1"
                                                    />
                                                    <span className="w-12 text-right text-xs font-medium tabular-nums text-muted-foreground">
                                                      {row.percentageLabel}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                      {getQuestionViewMode(
                                        qa.questionId,
                                        qa.questionType,
                                      ) === "answers" &&
                                        (qa.questionType === "short_text" ||
                                          qa.questionType === "long_text") && (
                                          <div className="space-y-2 -mt-2">
                                            {/* <p className="text-xs text-muted-foreground">
                                              {qa.answeredCount ||
                                                getQuestionAnswers(qa).length ||
                                                0}{" "}
                                              text responses
                                            </p> */}
                                            {getQuestionAnswers(qa).length ===
                                            0 ? (
                                              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                                No responses yet.
                                              </div>
                                            ) : (
                                              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70">
                                                {getQuestionAnswers(qa).map(
                                                  (ans, i) => (
                                                    <div
                                                      key={`${qa.questionId}-answer-${i}`}
                                                      className="rounded-md border border-border/70 bg-card p-2 text-sm whitespace-pre-wrap"
                                                    >
                                                      {ans}
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  },
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="respondent" className="mt-3">
          <Card>
            <CardHeader className="px-4 py-1 space-y-1.5 -mt-2 ml-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col mr-6 gap-0.5 md:max-w-[60%] sm:max-w-full">
                  <CardTitle className="text-base font-bold tracking-tight">
                    Respondent
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-xs capitalize overflow-hidden wrap-break-word whitespace-normal">
                    Search, review individual responses, and export respondent
                    data.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="-mt-4">
              {isLoadingResponses ? (
                <p className="text-sm text-muted-foreground">
                  Loading responses...
                </p>
              ) : (
                <DataTable
                  table={responsesTable}
                  totalRows={responsesData?.paging?.total || 0}
                  emptyMessage="No responses yet."
                >
                  <DataTableToolbar
                    table={responsesTable}
                    tableKey="respondents"
                    exportOptions={{
                      tableKey: "respondents",
                      fileName: "respondents",
                      extraActions: [
                        {
                          key: "export-respondents",
                          label: hasRespondentSearch
                            ? "Export Respondents (Filtered)"
                            : "Export Respondents",
                          onClick: () =>
                            exportRespondents({
                              surveyId,
                              search: normalizedRespondentSearch || undefined,
                            }),
                          disabled: exportingRespondents,
                        },
                        {
                          key: "export-responses",
                          label: hasRespondentSearch
                            ? "Export Responses (Filtered)"
                            : "Export Responses",
                          onClick: () =>
                            exportResponses({
                              surveyId,
                              search: normalizedRespondentSearch || undefined,
                            }),
                          disabled: exportingResponses,
                        },
                      ],
                    }}
                    Export={false}
                    searchOnEnter={true}
                    resetSearchSignal={respondentSearchResetSignal}
                    onSearch={(value) => {
                      setRespondentSearch((value || "").trim());
                      setResponsePagination((prev) => ({
                        ...prev,
                        pageIndex: 0,
                      }));
                    }}
                    filterFields={[
                      {
                        value: "respondent",
                        placeholder: "Search respondents...",
                      },
                    ]}
                    pageSizeOptions={[10, 20, 30, 40, 50, 100]}
                  >
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleRefreshRespondents}
                            variant="outline"
                            size="icon"
                            className="h-8"
                            aria-label="Refresh respondents"
                            disabled={isFetchingResponses}
                          >
                            <RefreshCw
                              className={`h-4 w-4 text-green-700 ${
                                isFetchingResponses ? "animate-spin" : ""
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Refresh respondents</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </DataTableToolbar>
                </DataTable>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={responseDialogOpen}
            onOpenChange={handleResponseDialogOpenChange}
          >
            <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-hidden p-0 shadow-none border border-border/70 bg-card">
              <DialogHeader className="px-3 py-2.5 border-b border-border/70 bg-muted/20">
                <div className="flex items-start justify-between gap-3 mr-12">
                  <div>
                    <DialogTitle>Response Details</DialogTitle>
                    <DialogDescription>
                      Individual respondent submission details
                    </DialogDescription>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs px-3"
                    onClick={exportCurrentResponseCsv}
                    disabled={!selectedResponse || loadingSelectedResponse}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </DialogHeader>

              <div className="px-3 pb-3 pt-2 overflow-y-auto max-h-[calc(92vh-78px)] space-y-2 bg-background/40">
                {loadingSelectedResponse ? (
                  <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                    Loading response details...
                  </div>
                ) : !selectedResponse ? (
                  <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                    Response not found.
                  </div>
                ) : (
                  <>
                    {/* Recipient Summary */}
                    <ResponseDetailsSummaryCard
                      name={selectedResponse.recipientName || "Anonymous"}
                      email={selectedResponse.recipientEmail || "-"}
                      phone={selectedResponse.recipientPhone || "-"}
                      responses={1}
                    />

                    {/* Submission Card */}
                    <ResponseDetailsSubmissionCard
                      submissionLabel="Submission #1"
                      submittedAtLabel={
                        selectedResponse.submittedAt
                          ? format(
                              new Date(selectedResponse.submittedAt),
                              "MMM d, yyyy h:mm a",
                            )
                          : "-"
                      }
                      completionTimeLabel={formatDurationLabel(
                        selectedResponse.completionTime,
                      )}
                      deviceLabel={selectedResponse.device || "-"}
                    >
                      {responseAnswerItems.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No answers found.
                        </div>
                      ) : (
                        responseAnswerItems.map((item, index) => {
                          const answerKey = `${item.key}-${index}`;
                          const answerText = formatAnswerValue(item.value);
                          const isLongAnswer =
                            answerText.length > 220 ||
                            answerText.includes("\n");
                          const isExpanded = !!expandedAnswers[answerKey];
                          const previewText =
                            !isExpanded && isLongAnswer
                              ? `${answerText.slice(0, 220)}...`
                              : answerText;

                          return (
                            <ResponseDetailsAnswerItem
                              key={answerKey}
                              index={index + 1}
                              title={item.label}
                              questionType={item.questionType}
                              sectionTitle={item.sectionTitle}
                              required={item.required}
                              answerText={previewText}
                              showToggle={isLongAnswer}
                              toggleLabel={
                                isExpanded ? "Show less" : "Show more"
                              }
                              onToggle={() => toggleAnswerExpansion(answerKey)}
                            />
                          );
                        })
                      )}
                    </ResponseDetailsSubmissionCard>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
