import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import {
  useSurvey,
  useCreateSurvey,
  useUpdateSurvey,
  usePublishSurvey,
  useCloseSurvey,
  useDuplicateSurvey,
} from "../../lib/queries";
import {
  useUploadSurveyLogo,
  useDeleteSurveyLogo,
} from "../../lib/queries/surveys";
import { useCompany, useUploadLogo } from "../../lib/queries/company";
import { useRecipientStats } from "../../lib/queries/recipients";
import { Layout } from "../../components/layouts/Layout";
import { InlineQuestionList } from "../../components/editor/InlineQuestionList";
import {
  EditorTopBar,
  EditorMainCanvas,
  EditorSidePanel,
} from "../../components/editor/layout";
import { SectionList } from "../../components/editor/sections";
import { QuestionList } from "../../components/editor/questions";
import { DocumentStyleSectionList } from "../../components/editor/DocumentStyleSectionList";
import { EmptySectionState } from "../../components/editor/EmptySectionState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import { Badge } from "../../components/ui/badge";
import CustomBadge from "../../components/shared/CustomBadge";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import { usePermissions } from "../../hooks/usePermissions";
import { ErrorPage } from "../../components/shared/ErrorPage";
import {
  QUESTION_TYPE_IS_CHOICE,
  QUESTION_TYPES,
} from "../../lib/constants/questionTypes";
import { getDefaultQuestion } from "../../lib/schemas/surveySchemas";
import {
  setSurveyStructurePreference,
  STRUCTURE_TYPES,
} from "../../lib/surveyStructure";
import { SurveyAnalytics } from "../../components/analytics/SurveyAnalytics";
import { toast } from "sonner";
import { useAlertContext } from "../../app/context/AlertContext";
import { ResponseForm } from "../../components/public/ResponseForm";
import { LogicBuilder } from "../../components/editor/LogicBuilder";
import { useExportRecipients } from "../../lib/queries/analytics";
import { AddRecipientDialog } from "../../components/recipients/AddRecipientDialog";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { UploadRecipientsDialog } from "../../components/recipients/UploadRecipientsDialog";
import { RecipientsList } from "../../components/recipients/RecipientsList";
import { EmptyState } from "../../components/ui/empty-state";
import { QuestionTypeSelector } from "../../components/editor/QuestionTypeSelector";
import { ShareSurveyModal } from "../../components/distribution/ShareSurveyModal";
import {
  detectNavigationConflicts,
  detectVisibilityConflicts,
} from "../../lib/utils/logicConflictDetection";
import { getRichTextPlainText } from "../../lib/utils/richText";
import {
  Calendar,
  FileText,
  Bell,
  Users,
  Monitor,
  MapPin,
  BarChart3,
  MoreVertical,
  Plus,
  Download,
  Palette,
  SettingsIcon,
  Upload,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Clock3,
  Image as ImageIcon,
  ShieldCheck,
  UserCheck,
  Lock,
  AlertCircle,
  X,
} from "lucide-react";
import {
  getSimpleVisibilityForQuestion,
  updateVisibilityRulesWithSimpleCondition,
} from "../../lib/utils/surveyLogic";
import { normalizePreviewQuestions } from "../../lib/utils/previewQuestions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { LogoUploader } from "../../components/shared/LogoUploader";
import { QuestionSettingsPanel } from "../../components/editor/QuestionSettingsPanel";
import { ScreenLoader } from "../../components/shared/Loading";
import { motion as Motion } from "framer-motion";

/**
 * Survey Editor Page
 * Drag-drop question builder with publish workflow
 */

function normalizeSectionJumpActionType(type) {
  if (!type) return "";
  const normalized = String(type).trim().toLowerCase();
  if (
    normalized === "terminate" ||
    normalized === "end" ||
    normalized === "end_survey"
  ) {
    return "terminate";
  }
  if (
    normalized === "jump" ||
    normalized === "jump_section" ||
    normalized === "jump_to_section"
  ) {
    return "jump";
  }
  return normalized;
}

function isUnconditionalSectionRule(rule) {
  if (!rule || !rule.fromSectionId) return false;
  const when = rule.when;
  if (when === true) return true;
  if (!when || typeof when !== "object") return false;
  if (when.always === true) return true;
  if (String(when.type || "").toLowerCase() === "always") return true;
  return false;
}

function dedupeUnconditionalSectionNavigationRules(rules = []) {
  if (!Array.isArray(rules) || rules.length === 0) return [];

  // Keep non-unconditional rules as-is; for unconditional section fallbacks,
  // keep only the latest rule per section.
  const nonUnconditionalRules = [];
  const latestUnconditionalBySection = new Map();

  rules.forEach((rule) => {
    if (!isUnconditionalSectionRule(rule)) {
      nonUnconditionalRules.push(rule);
      return;
    }
    const sectionId = rule?.fromSectionId;
    if (!sectionId) {
      nonUnconditionalRules.push(rule);
      return;
    }
    latestUnconditionalBySection.set(sectionId, rule);
  });

  return [...nonUnconditionalRules, ...latestUnconditionalBySection.values()];
}

export function SurveyEditorPage() {
  const params = useParams({ from: "/surveys/$id" });
  const search = useSearch({ from: "/surveys/$id" });
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const { openAlert, closeAlert, setLoading } = useAlertContext();
  const { data: company } = useCompany();
  const { mutate: uploadCompanyLogo } = useUploadLogo();
  const { mutateAsync: uploadSurveyLogo, isPending: isUploadingSurveyLogo } =
    useUploadSurveyLogo();
  const { mutateAsync: deleteSurveyLogo, isPending: isDeletingSurveyLogo } =
    useDeleteSurveyLogo();
  const companyData = Array.isArray(company) ? company[0] : company;

  // Detect if we're in create mode (id === 'new') or edit mode
  const isCreateMode = params.id === "new";
  const isInvalidId =
    params.id === undefined || params.id === null || params.id === "undefined";
  const surveyId = isCreateMode || isInvalidId ? null : params.id;

  // All state declarations must come before effects that use them
  const [localQuestions, setLocalQuestions] = useState([]);
  const localQuestionsRef = React.useRef([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState(null);
  const [missingTitleIds, setMissingTitleIds] = useState([]);
  const [titleError, setTitleError] = useState("");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [localSections, setLocalSections] = useState([]);
  const [localVisibilityRules, setLocalVisibilityRules] = useState([]);
  const [localNavigationRules, setLocalNavigationRules] = useState([]);
  const [hiddenSections, setHiddenSections] = useState(new Set());
  const [hiddenQuestions, setHiddenQuestions] = useState(new Set());
  const [filterMode, setFilterMode] = useState("all");
  const sectionSnapshotsRef = React.useRef({});
  const [savingSectionIds, setSavingSectionIds] = useState(new Set());
  const titleInputRef = React.useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isSavingRef = React.useRef(false); // Track if we're currently saving to prevent effect from overwriting local state

  // Build a snapshot object for change detection (covers editor + settings fields)
  const buildSnapshot = useCallback(
    (metaObj, questions, visibilityRules = [], navigationRules = []) => {
      return JSON.stringify({
        title: metaObj.title,
        description: metaObj.description,
        questions,
        visibilityRules,
        navigationRules,
        themeColor: metaObj.themeColor,
        thankYouMessage: metaObj.thankYouMessage,
        isWhitelistEnabled: metaObj.isWhitelistEnabled,
        showProgress: metaObj.showProgress,
        oneResponsePerRecipient: metaObj.oneResponsePerRecipient,
        settings: metaObj.settings,
      });
    },
    []
  );

  // Use state (not ref) so changes trigger useMemo re-evaluation
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    themeColor: companyData?.primaryColor || "#10B981",
    logo: "",
    thankYouMessage:
      companyData?.thankYouMessage || "Thank you for completing this survey!",
    isWhitelistEnabled: false,
    showProgress: true,
    oneResponsePerRecipient: true,
    settings: {
      presentationMode: "single_page",
      autoAdvanceThreshold: null,
      isSectional: false,
    },
  });

  const normalizeSurveySettings = useCallback(
    (rawSettings = {}, sectionCount = 0) => {
      const hasMultipleSections = sectionCount > 1;
      const isSectional = hasMultipleSections
        ? true
        : rawSettings?.isSectional === true;

      let presentationMode =
        rawSettings?.presentationMode === "multi_step"
          ? "multi_step"
          : "single_page";
      if (!isSectional) {
        // Keep settings valid for backend rules when survey is question-based.
        presentationMode = "single_page";
      }
      if (hasMultipleSections) {
        presentationMode = "multi_step";
      }

      const rawThreshold = rawSettings?.autoAdvanceThreshold;
      const parsedThreshold =
        rawThreshold === null ||
        rawThreshold === undefined ||
        rawThreshold === ""
          ? NaN
          : Number(rawThreshold);
      const autoAdvanceThreshold =
        Number.isFinite(parsedThreshold) && parsedThreshold >= 0
          ? parsedThreshold
          : null;

      return {
        presentationMode,
        autoAdvanceThreshold,
        isSectional,
      };
    },
    []
  );

  const formatValidationDetails = useCallback((errors = []) => {
    if (!Array.isArray(errors) || errors.length === 0) return "";

    return errors
      .map((item) => {
        const field = item?.field || "request";
        const message = item?.message || "Invalid value";
        return `${field}: ${message}`;
      })
      .join(" | ");
  }, []);

  const getSurveySaveErrorMessage = useCallback(
    (error, fallback = "Failed to save survey") => {
      const responseData = error?.response?.data;
      const validationErrors = Array.isArray(responseData?.errors)
        ? responseData.errors
        : [];

      if (validationErrors.length > 0) {
        const details = formatValidationDetails(validationErrors);
        const hasSettingsError = validationErrors.some((item) =>
          String(item?.field || "").startsWith("settings")
        );

        if (hasSettingsError) {
          return `Survey settings are invalid. Check Response Settings and Branding fields. ${details}`;
        }

        return `Validation failed. ${details}`;
      }

      return (
        responseData?.status?.message ||
        responseData?.message ||
        error?.message ||
        fallback
      );
    },
    [formatValidationDetails]
  );

  React.useEffect(() => {
    if (isInvalidId) {
      navigate({ to: "/surveys" });
    }
  }, [isInvalidId, navigate]);

  React.useEffect(() => {
    localQuestionsRef.current = localQuestions;
  }, [localQuestions]);

  // Track unsaved changes by comparing current state to last-saved snapshot
  // Also compute per-tab change flags for tab badges
  const { hasEditorChanges, hasSettingsChanges } = useMemo(() => {
    // No snapshot yet (initial load / create mode not initialized) — no changes
    if (!savedSnapshot) {
      return { hasEditorChanges: false, hasSettingsChanges: false };
    }
    let saved;
    try {
      saved = JSON.parse(savedSnapshot);
    } catch {
      saved = {};
    }
    const editorChanged =
      JSON.stringify({
        title: meta.title,
        description: meta.description,
        questions: localQuestions,
        visibilityRules: localVisibilityRules,
        navigationRules: localNavigationRules,
        settings: meta.settings,
      }) !==
      JSON.stringify({
        title: saved.title,
        description: saved.description,
        questions: saved.questions,
        visibilityRules: saved.visibilityRules,
        navigationRules: saved.navigationRules,
        settings: saved.settings,
      });

    const settingsChanged =
      JSON.stringify({
        themeColor: meta.themeColor,
        thankYouMessage: meta.thankYouMessage,
        isWhitelistEnabled: meta.isWhitelistEnabled,
        showProgress: meta.showProgress,
        oneResponsePerRecipient: meta.oneResponsePerRecipient,
      }) !==
      JSON.stringify({
        themeColor: saved.themeColor,
        thankYouMessage: saved.thankYouMessage,
        isWhitelistEnabled: saved.isWhitelistEnabled,
        showProgress: saved.showProgress,
        oneResponsePerRecipient: saved.oneResponsePerRecipient,
      });

    return {
      hasEditorChanges: editorChanged,
      hasSettingsChanges: settingsChanged,
    };
  }, [
    meta,
    localQuestions,
    localVisibilityRules,
    localNavigationRules,
    savedSnapshot,
  ]);

  React.useEffect(() => {
    setHasUnsavedChanges(hasEditorChanges || hasSettingsChanges);
  }, [hasEditorChanges, hasSettingsChanges]);

  // Warn before leaving with unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const {
    data: survey,
    isLoading,
    error,
  } = useSurvey(surveyId, {
    enabled: !isCreateMode,
    refetchOnWindowFocus: false, // Prevent losing unsaved changes
  });
  const { mutate: createSurvey, isPending: isCreating } = useCreateSurvey();
  const { mutate: updateSurvey, isPending: isUpdating } = useUpdateSurvey();
  const { mutate: publishSurvey, isPending: isPublishing } = usePublishSurvey();
  const { mutate: closeSurvey, isPending: isClosing } = useCloseSurvey();
  const { mutate: duplicateSurvey, isPending: isDuplicating } =
    useDuplicateSurvey();
  const { mutate: exportRecipients, isPending: exportingRecipients } =
    useExportRecipients();
  const { data: recipientStats } = useRecipientStats(surveyId);
  const allowedTabs = useMemo(() => {
    if (isCreateMode) {
      return ["edit", "settings"];
    }

    const isDraft = survey?.status === "draft" || !survey?.status;

    return isDraft
      ? ["edit", "settings", "recipients"]
      : ["edit", "settings", "recipients", "responses"];
  }, [isCreateMode, survey?.status]);

  const resolveTab = useCallback(
    (value) => (allowedTabs.includes(value) ? value : "edit"),
    [allowedTabs]
  );

  const activeTab = resolveTab(search?.tab);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (window.autoSaveTimeout) {
        clearTimeout(window.autoSaveTimeout);
      }
    };
  }, []);
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [uploadRecipientsOpen, setUploadRecipientsOpen] = useState(false);
  const fileInputRef = React.useRef(null);
  const companyLogoInputRef = React.useRef(null);
  const pendingLogoFileRef = React.useRef(null);
  const localLogoUrlRef = React.useRef(null);
  const [localLogoUrl, setLocalLogoUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logoVersion, setLogoVersion] = useState(Date.now());
  const [showLogoPreview, setShowLogoPreview] = useState(false);
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (!surveyId) return;
    const pendingUpload = sessionStorage.getItem("pendingSurveyLogoUpload");
    if (pendingUpload !== "true") return;
    sessionStorage.removeItem("pendingSurveyLogoUpload");
    const pendingFile = pendingLogoFileRef.current;
    if (pendingFile) {
      pendingLogoFileRef.current = null;
      setUploadProgress(0);
      uploadSurveyLogo({
        id: surveyId,
        file: pendingFile,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      })
        .then((result) => {
          // Backend returns { data: { logo: "https://...", publicId: "..." } }
          const logoUrl = result?.data?.logo || meta.logo;
          setMeta((m) => ({ ...m, logo: logoUrl }));
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(0), 1000);
          setLogoVersion(Date.now());
        })
        .catch((error) => {
          console.error("Failed to upload survey logo:", error);
          setUploadProgress(0);
        });
      return;
    }
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  }, [surveyId, uploadSurveyLogo, meta.logo]);

  useEffect(() => {
    if (meta.logo && localLogoUrl) {
      if (localLogoUrlRef.current) {
        URL.revokeObjectURL(localLogoUrlRef.current);
        localLogoUrlRef.current = null;
      }
      setLocalLogoUrl("");
    }
  }, [meta.logo, localLogoUrl]);

  const normalizeNavigationRules = useCallback(
    (rules = []) =>
      (rules || [])
        .map((rule) => {
          const inferredFromSectionId =
            rule.fromSectionId ||
            localSections.find((section) =>
              section.questionIds?.includes(rule.when?.questionId)
            )?.id ||
            null;
          const rawType = rule.action?.type;
          const normalizedType = rawType === "end" ? "terminate" : rawType;

          if (!normalizedType) return null;

          if (normalizedType === "jump") {
            const targetSectionId =
              typeof rule.action?.targetSectionId === "string" &&
              rule.action.targetSectionId.trim().length > 0
                ? rule.action.targetSectionId
                : undefined;
            if (!targetSectionId) return null;

            return {
              ...rule,
              fromSectionId: inferredFromSectionId,
              action: {
                ...rule.action,
                type: normalizedType,
                targetSectionId,
              },
            };
          }

          if (normalizedType === "jump_to_question") {
            const targetQuestionId =
              typeof rule.action?.targetQuestionId === "string" &&
              rule.action.targetQuestionId.trim().length > 0
                ? rule.action.targetQuestionId
                : undefined;
            if (!targetQuestionId) return null;

            return {
              ...rule,
              fromSectionId: inferredFromSectionId,
              action: {
                ...rule.action,
                type: normalizedType,
                targetQuestionId,
              },
            };
          }

          if (normalizedType === "skip") {
            const skipCount = Number.isFinite(rule.action?.skipCount)
              ? Math.max(1, rule.action.skipCount)
              : 1;

            return {
              ...rule,
              fromSectionId: inferredFromSectionId,
              action: {
                ...rule.action,
                type: normalizedType,
                skipCount,
              },
            };
          }

          return {
            ...rule,
            fromSectionId: inferredFromSectionId,
            action: {
              ...rule.action,
              type: normalizedType,
            },
          };
        })
        .filter(Boolean),
    [localSections]
  );

  // Normalize preview questions to mirror save/publish sanitization.
  const previewQuestions = useMemo(() => {
    return normalizePreviewQuestions(localQuestions);
  }, [localQuestions]);
  const previewSurveyData = useMemo(() => {
    const data = {
      title: meta.title || "Untitled Survey",
      description: meta.description,
      questions: previewQuestions,
      sections: localSections,
      visibilityRules: localVisibilityRules,
      navigationRules: normalizeNavigationRules(localNavigationRules),
      themeColor: meta.themeColor,
      logo: meta.logo,
      thankYouMessage: meta.thankYouMessage,
      showProgress: meta.showProgress,
      oneResponsePerRecipient: meta.oneResponsePerRecipient,
      isWhitelistEnabled: meta.isWhitelistEnabled,
      settings: meta.settings,
    };
    return data;
  }, [
    meta,
    previewQuestions,
    localSections,
    localVisibilityRules,
    localNavigationRules,
    normalizeNavigationRules,
  ]);

  const logicConflictIssues = useMemo(() => {
    const normalizedNavigationRules =
      normalizeNavigationRules(localNavigationRules);
    return [
      ...detectNavigationConflicts(localQuestions, normalizedNavigationRules),
      ...detectVisibilityConflicts(localVisibilityRules),
    ];
  }, [
    localQuestions,
    localNavigationRules,
    localVisibilityRules,
    normalizeNavigationRules,
  ]);

  const warnLogicConflicts = useCallback(() => {
    if (!logicConflictIssues.length) return;
    const severeIssues = logicConflictIssues.filter(
      (issue) =>
        issue.type === "self_jump" ||
        issue.type === "backward_jump" ||
        issue.type === "visibility_cycle" ||
        issue.type === "duplicate_condition_conflict"
    );
    if (!severeIssues.length) return;
    toast.warning(
      `Logic warning: ${severeIssues.length} potential conflict${
        severeIssues.length > 1 ? "s" : ""
      } detected. Review logic before publishing.`,
      { duration: 5000 }
    );
  }, [logicConflictIssues]);

  // Sync local state with fetched survey (only in edit mode)
  React.useEffect(() => {
    // Skip if we're currently saving to prevent overwriting local edits
    if (isSavingRef.current) {
      return;
    }

    let loadedQuestions = [];
    if (isCreateMode) {
      // Reset to clean state for create mode
      setLocalVisibilityRules([]);
      setLocalNavigationRules([]);
      const createMeta = {
        title: "",
        description: "",
        themeColor: companyData?.primaryColor || "#10B981",
        logo: "",
        thankYouMessage:
          companyData?.thankYouMessage ||
          companyData?.defaultThankYouMessage ||
          "Thank you for completing this survey!",
        isWhitelistEnabled: false,
        showProgress: true,
        oneResponsePerRecipient: true,
        settings: {
          presentationMode: "single_page",
          autoAdvanceThreshold: null,
          isSectional: false,
        },
      };
      setMeta(createMeta);
      // Keep snapshot in sync so company data loading doesn't cause false positives
      setSavedSnapshot(buildSnapshot(createMeta, [], [], []));
    } else if (survey?.questions) {
      const normalized = survey.questions.map((q, idx) => {
        const isChoice = QUESTION_TYPE_IS_CHOICE.has(q.type);
        const hasOptions = Array.isArray(q.options) && q.options.length > 0;
        return {
          ...q,
          id: q.id || q._id || `q_${idx}`,
          order: q.order ?? idx + 1,
          options: hasOptions
            ? q.options
            : isChoice
              ? ["Option 1", "Option 2"]
              : undefined,
          ratingScale:
            q.ratingScale || (q.type === QUESTION_TYPES.RATING ? 5 : undefined),
        };
      });
      setLocalQuestions(normalized);
      loadedQuestions = normalized;
    }
    if (!isCreateMode && survey) {
      // Load sections and rules from survey
      const sections = survey.sections || [];

      // Ensure at least one default section exists
      if (sections.length === 0 && survey.questions?.length > 0) {
        const normalizedQuestions = survey.questions.map((q, idx) => ({
          ...q,
          id: q.id || q._id || `q_${idx}`,
        }));
        const defaultSection = {
          id: `section_${crypto.randomUUID()}`,
          title: "Main Questions",
          description: "",
          order: 0,
          questionIds: normalizedQuestions.map((q) => q.id),
        };
        setLocalSections([defaultSection]);
        setExpandedSections({ [defaultSection.id]: true });
      } else {
        setLocalSections(sections);
        // Auto-expand all sections in document mode
        if (sections.length > 0) {
          const expandedState = {};
          sections.forEach((section) => {
            expandedState[section.id] = true;
          });
          setExpandedSections(expandedState);
        }
      }

      setLocalVisibilityRules(survey.visibilityRules || []);
      const normalizedNav = (survey.navigationRules || []).map((rule) => {
        const actionType = rule.action?.type;
        const uiType =
          actionType === "terminate" ? "end" : actionType || "jump";

        return {
          ...rule,
          action: {
            ...rule.action,
            type: uiType,
          },
        };
      });

      setLocalNavigationRules(
        dedupeUnconditionalSectionNavigationRules(normalizedNav)
      );

      const incomingSettings = survey.settings || {};
      const normalizedSettings = normalizeSurveySettings(
        incomingSettings,
        sections.length
      );

      const metaData = {
        title: survey.title || "",
        description: survey.description || "",
        themeColor: survey.themeColor || companyData?.primaryColor || "#10B981",
        logo: survey.logo || companyData?.logo || "",
        thankYouMessage:
          survey.thankYouMessage ||
          companyData?.thankYouMessage ||
          companyData?.defaultThankYouMessage ||
          "Thank you for completing this survey!",
        isWhitelistEnabled: survey.isWhitelistEnabled || false,
        showProgress: survey.showProgress ?? true,
        oneResponsePerRecipient: survey.oneResponsePerRecipient ?? true,
        settings: normalizedSettings,
      };

      setMeta(metaData);

      // Set snapshot to loaded state so badge starts as "no changes"
      setSavedSnapshot(
        buildSnapshot(
          metaData,
          loadedQuestions,
          survey.visibilityRules || [],
          normalizedNav
        )
      );
    }
  }, [
    survey,
    isCreateMode,
    companyData,
    buildSnapshot,
    normalizeSurveySettings,
  ]);

  // Initialize create mode only once
  const hasInitializedCreateMode = React.useRef(false);

  React.useEffect(() => {
    if (isCreateMode && !hasInitializedCreateMode.current) {
      hasInitializedCreateMode.current = true;

      // Auto-focus title field for better UX
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }

    // Reset flag when leaving create mode
    if (!isCreateMode) {
      hasInitializedCreateMode.current = false;
    }
  }, [isCreateMode]);

  React.useEffect(() => {
    if (!localQuestions.length || localSections.length === 0) {
      return;
    }

    const questionIdSet = new Set(
      localQuestions.map((question) => question.id)
    );
    const assignedIds = new Set();
    let didChange = false;

    const nextSections = localSections.map((section) => {
      const existingIds = Array.isArray(section.questionIds)
        ? section.questionIds
        : [];
      const filteredIds = existingIds.filter((id) => questionIdSet.has(id));
      const sameIds =
        filteredIds.length === existingIds.length &&
        filteredIds.every((id, idx) => id === existingIds[idx]);

      filteredIds.forEach((id) => assignedIds.add(id));

      if (!sameIds) {
        didChange = true;
        return { ...section, questionIds: filteredIds };
      }

      return section;
    });

    const unassignedIds = localQuestions
      .map((question) => question.id)
      .filter((id) => !assignedIds.has(id));

    if (unassignedIds.length > 0) {
      didChange = true;
      const firstSection = nextSections[0];
      nextSections[0] = {
        ...firstSection,
        questionIds: [...(firstSection.questionIds || []), ...unassignedIds],
      };
    }

    if (didChange) {
      setLocalSections(nextSections);
    }
  }, [localQuestions, localSections]);

  React.useEffect(() => {
    if (localSections.length <= 1) return;
    if (meta.settings?.presentationMode === "multi_step") return;
    setMeta((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        presentationMode: "multi_step",
      },
    }));
  }, [localSections.length, meta.settings?.presentationMode]);
  const getSectionQuestionIds = useCallback(
    (sectionId, sections, questions) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return [];
      if (
        Array.isArray(section.questionIds) &&
        section.questionIds.length > 0
      ) {
        return section.questionIds;
      }
      return questions
        .filter((question) => question.sectionId === sectionId)
        .map((question) => question.id);
    },
    []
  );

  const getSectionQuestions = useCallback(
    (sectionId, sections, questions) => {
      const ids = getSectionQuestionIds(sectionId, sections, questions);
      const questionMap = new Map(questions.map((q) => [q.id, q]));
      return ids.map((id) => questionMap.get(id)).filter(Boolean);
    },
    [getSectionQuestionIds]
  );

  const filterVisibilityRulesForSection = useCallback(
    (sectionId, questionIdSet, visibilityRules) => {
      return (visibilityRules || []).filter((rule) => {
        if (!rule) return false;
        if (rule.targetType === "section") {
          return rule.targetId === sectionId;
        }
        if (rule.targetType === "question") {
          if (questionIdSet.has(rule.targetId)) return true;
        }
        return questionIdSet.has(rule.when?.questionId);
      });
    },
    []
  );

  const filterNavigationRulesForSection = useCallback(
    (sectionId, questionIdSet, navigationRules) => {
      return (navigationRules || []).filter((rule) => {
        if (!rule) return false;
        if (rule.fromSectionId === sectionId) return true;
        if (questionIdSet.has(rule.when?.questionId)) return true;
        if (rule.action?.targetSectionId === sectionId) return true;
        if (questionIdSet.has(rule.action?.targetQuestionId)) return true;
        return false;
      });
    },
    []
  );

  const normalizeRules = useCallback((rules) => {
    return [...(rules || [])].sort((a, b) => {
      const aKey = a?.id || "";
      const bKey = b?.id || "";
      if (aKey !== bKey) return aKey.localeCompare(bKey);
      return JSON.stringify(a || {}).localeCompare(JSON.stringify(b || {}));
    });
  }, []);

  const buildSectionSnapshot = useCallback(
    (sectionId, sections, questions, visibilityRules, navigationRules) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return null;
      const questionIds = getSectionQuestionIds(sectionId, sections, questions);
      const questionIdSet = new Set(questionIds);

      return {
        section: { ...section },
        questions: getSectionQuestions(sectionId, sections, questions).map(
          (q) => ({
            ...q,
            options: Array.isArray(q.options) ? [...q.options] : q.options,
          })
        ),
        visibilityRules: normalizeRules(
          filterVisibilityRulesForSection(
            sectionId,
            questionIdSet,
            visibilityRules
          )
        ),
        navigationRules: normalizeRules(
          filterNavigationRulesForSection(
            sectionId,
            questionIdSet,
            navigationRules
          )
        ),
      };
    },
    [
      filterNavigationRulesForSection,
      filterVisibilityRulesForSection,
      getSectionQuestionIds,
      getSectionQuestions,
      normalizeRules,
    ]
  );

  const setSectionSnapshot = (
    sectionId,
    sections,
    questions,
    visibilityRules,
    navigationRules
  ) => {
    const snapshot = buildSectionSnapshot(
      sectionId,
      sections,
      questions,
      visibilityRules,
      navigationRules
    );
    if (!snapshot) return;
    sectionSnapshotsRef.current = {
      ...sectionSnapshotsRef.current,
      [sectionId]: snapshot,
    };
  };

  React.useEffect(() => {
    if (localSections.length === 0) return;
    const next = { ...sectionSnapshotsRef.current };
    localSections.forEach((section) => {
      if (!next[section.id]) {
        const snapshot = buildSectionSnapshot(
          section.id,
          localSections,
          localQuestions,
          localVisibilityRules,
          localNavigationRules
        );
        if (snapshot) next[section.id] = snapshot;
      }
    });
    sectionSnapshotsRef.current = next;
  }, [
    localSections,
    localQuestions,
    localVisibilityRules,
    localNavigationRules,
    buildSectionSnapshot,
  ]);

  const sectionDirtyMap = useMemo(() => {
    const map = {};
    localSections.forEach((section) => {
      const snapshot = sectionSnapshotsRef.current[section.id];
      if (!snapshot) {
        map[section.id] = false;
        return;
      }
      const current = buildSectionSnapshot(
        section.id,
        localSections,
        localQuestions,
        localVisibilityRules,
        localNavigationRules
      );
      map[section.id] = current
        ? JSON.stringify(snapshot) !== JSON.stringify(current)
        : false;
    });
    return map;
  }, [
    localSections,
    localQuestions,
    localVisibilityRules,
    localNavigationRules,
    buildSectionSnapshot,
  ]);

  if (!canEdit) {
    return (
      <Layout>
        <ErrorPage
          statusCode={403}
          title="Access denied"
          description="You don’t have permission to edit surveys."
          homeTo="/surveys"
          secondaryLabel="Go to dashboard"
          showRetry={false}
          variant="warning"
        />
      </Layout>
    );
  }

  if (isInvalidId) {
    return null;
  }

  if (!isCreateMode && isLoading) {
    return <ScreenLoader message="Loading survey editor..." />;
  }

  if (!isCreateMode && error) {
    return (
      <Layout>
        <ErrorPage
          error={error}
          title="Unable to load survey"
          homeTo="/surveys"
          secondaryLabel="Go to dashboard"
        />
      </Layout>
    );
  }

  const handleSave = () => {
    if (!meta.title.trim()) {
      setTitleError("Survey title is required");
      if (!window.__surveyToastActive) {
        toast.error("Please enter a survey title");
        window.__surveyToastActive = true;
        setTimeout(() => {
          window.__surveyToastActive = false;
        }, 2000);
      }
      // Scroll to and focus the title input
      titleInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => titleInputRef.current?.focus(), 300);
      return;
    }
    setTitleError("");
    const {
      payload,
      hasMissingTitle,
      firstMissingTitleId,
      missingTitleIds: nextMissingTitleIds,
    } = buildSurveyPayload(localQuestions);
    if (hasMissingTitle) {
      setMissingTitleIds(nextMissingTitleIds);
      if (firstMissingTitleId) {
        scrollToQuestion(firstMissingTitleId);
      }
      if (!window.__surveyToastActive) {
        toast.error("Every question needs a title before saving");
        window.__surveyToastActive = true;
        setTimeout(() => {
          window.__surveyToastActive = false;
        }, 2000);
      }
      return;
    }

    setMissingTitleIds([]);
    warnLogicConflicts();

    if (isCreateMode) {
      createSurvey(payload, {
        onSuccess: (result) => {
          const surveyId = result?.data?._id;
          toast.success(result?.message || "Survey saved");
          setSavedSnapshot(
            buildSnapshot(
              meta,
              localQuestions,
              localVisibilityRules,
              localNavigationRules
            )
          );
          isSavingRef.current = false; // Reset saving flag
          if (surveyId) {
            navigate({ to: "/surveys/$id", params: { id: surveyId } });
          }
        },
        onError: (error) => {
          isSavingRef.current = false; // Reset saving flag on error
          // Handle backend validation errors
          if (error?.response?.data?.errors) {
            const titleErr = error.response.data.errors.find(
              (e) => e.field === "title"
            );
            if (titleErr) {
              setTitleError("Survey title is required");
              toast.error("Please enter a survey title");
              // Scroll to and focus the title input
              titleInputRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              setTimeout(() => titleInputRef.current?.focus(), 300);
              return;
            }
          }
          const message = getSurveySaveErrorMessage(
            error,
            "Failed to save survey"
          );
          console.error("[SurveyEditor] Create survey failed", {
            message,
            errors: error?.response?.data?.errors || [],
            settingsPayload: payload?.settings,
          });
          toast.error(message);
        },
      });
    } else {
      isSavingRef.current = true; // Set saving flag
      updateSurvey(
        { id: surveyId, data: payload },
        {
          onSuccess: (result) => {
            toast.success(result?.message || "Changes saved");
            setSavedSnapshot(
              buildSnapshot(
                meta,
                localQuestions,
                localVisibilityRules,
                localNavigationRules
              )
            );
            // Reset flag after a brief delay to allow query to settle
            setTimeout(() => {
              isSavingRef.current = false;
            }, 100);
          },
          onError: (error) => {
            isSavingRef.current = false; // Reset saving flag on error
            // Handle backend validation errors
            if (error?.response?.data?.errors) {
              const titleErr = error.response.data.errors.find(
                (e) => e.field === "title"
              );
              if (titleErr) {
                setTitleError("Survey title is required");
                if (!window.__surveyToastActive) {
                  toast.error("Please enter a survey title");
                  window.__surveyToastActive = true;
                  setTimeout(() => {
                    window.__surveyToastActive = false;
                  }, 2000);
                }
                // Scroll to and focus the title input
                titleInputRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                setTimeout(() => titleInputRef.current?.focus(), 300);
                return;
              }
            }
            const message = getSurveySaveErrorMessage(
              error,
              "Failed to save changes"
            );
            console.error("[SurveyEditor] Update survey failed", {
              message,
              errors: error?.response?.data?.errors || [],
              settingsPayload: payload?.settings,
            });
            if (!window.__surveyToastActive) {
              toast.error(message);
              window.__surveyToastActive = true;
              setTimeout(() => {
                window.__surveyToastActive = false;
              }, 2000);
            }
          },
        }
      );
    }
  };

  // Utility: always sort sections by order
  const sortSectionsByOrder = (sections) => {
    return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  // Add a new section, optionally after a given section
  const addSection = (afterSection = null) => {
    setLocalSections((prev) => {
      // Always work with a sorted copy
      const sortedPrev = sortSectionsByOrder(prev);
      const newSection = {
        id: `section_${crypto.randomUUID()}`,
        title: `Section ${sortedPrev.length + 1}`,
        description: "",
        order: 0, // will be set below
        questionIds: [],
      };
      let next;
      if (afterSection && afterSection.id) {
        const idx = sortedPrev.findIndex((s) => s.id === afterSection.id);
        if (idx === -1) {
          next = [...sortedPrev, newSection];
        } else {
          next = [
            ...sortedPrev.slice(0, idx + 1),
            newSection,
            ...sortedPrev.slice(idx + 1),
          ];
        }
      } else {
        next = [...sortedPrev, newSection];
      }
      // Re-assign order fields
      next = next.map((s, i) => ({ ...s, order: i }));
      // Always return sorted by order
      next = sortSectionsByOrder(next);
      // Expand the new section
      setExpandedSections((prevExp) => ({ ...prevExp, [newSection.id]: true }));
      // Always enable sectional mode when adding sections
      setMeta((prevMeta) => ({
        ...prevMeta,
        settings: {
          ...prevMeta.settings,
          isSectional: true,
          presentationMode: "multi_step",
        },
      }));
      // Auto-scroll to new section after a brief delay to allow rendering
      setTimeout(() => {
        const sectionElement = document.querySelector(
          `[data-section-id="${newSection.id}"]`
        );
        if (sectionElement) {
          sectionElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
          // Auto-focus the title input
          const titleInput = sectionElement.querySelector(
            'input[placeholder="Section title"]'
          );
          if (titleInput) {
            setTimeout(() => {
              titleInput.focus();
              titleInput.select();
            }, 300);
          }
        }
      }, 100);
      return next;
    });
  };

  // Question-based survey handler - creates a default wrapper section (empty, no questions)
  // The section header is hidden via isSectional: false (DocumentStyleSection respects this)
  // User adds questions from the empty state inside the section
  const addQuestionDirectly = () => {
    setSurveyStructurePreference(STRUCTURE_TYPES.QUESTION);

    const sectionId = `section_${crypto.randomUUID()}`;

    setLocalSections((prev) => [
      ...prev,
      {
        id: sectionId,
        title: "",
        description: "",
        order: 0,
        questionIds: [],
      },
    ]);
    setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));

    setMeta((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        isSectional: false,
        presentationMode: "single_page",
      },
    }));
  };

  const toggleQuestionVisibility = (questionId) => {
    setHiddenQuestions((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  };

  // Toggle between question mode and section mode
  const toggleSectionalMode = () => {
    const currentIsSectional = meta.settings?.isSectional ?? false;

    if (currentIsSectional) {
      // Converting sections → questions: confirm and merge all sections into one
      const sectionCount = localSections.length;
      openAlert({
        title: "Convert to questions?",
        description:
          sectionCount > 1
            ? `This will merge all ${sectionCount} sections into a single question list. Section titles will be removed.`
            : "This will remove section titles and show all questions in a single list.",
        actionLabel: "Convert to questions",
        cancelLabel: "Cancel",
        actionStyle: "default",
        onAction: () => {
          // Merge all question IDs into the first section
          if (localSections.length > 1) {
            const allQuestionIds = localSections.flatMap(
              (s) => s.questionIds || []
            );
            const keepSection = {
              ...localSections[0],
              title: "",
              description: "",
              order: 0,
              questionIds: allQuestionIds,
            };
            setLocalSections([keepSection]);
          } else if (localSections.length === 1) {
            // Just clear the title
            setLocalSections((prev) =>
              prev.map((s) => ({ ...s, title: "", description: "" }))
            );
          }

          setMeta((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              isSectional: false,
              presentationMode: "single_page",
            },
          }));
        },
      });
    } else {
      // Converting questions → sections: confirm
      openAlert({
        title: "Convert to sections?",
        description:
          "This will organize your questions into sections. You can add more sections and move questions between them.",
        actionLabel: "Convert to sections",
        cancelLabel: "Cancel",
        actionStyle: "default",
        onAction: () => {
          setMeta((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              isSectional: true,
              presentationMode: "multi_step",
            },
          }));
        },
      });
    }
  };

  const addSectionFromTemplate = (template) => {
    const newSection = {
      id: `section_${crypto.randomUUID()}`,
      title: template.name,
      description: template.description || "",
      order: localSections.length,
      questionIds: [],
    };

    // If template has questions, add them to the section
    if (template.questions && template.questions.length > 0) {
      const newQuestions = template.questions.map((questionTemplate) => ({
        id: `question_${crypto.randomUUID()}`,
        title: questionTemplate.title,
        type: questionTemplate.type,
        required: questionTemplate.required || false,
        options: questionTemplate.options || [],
        order: newSection.questionIds.length,
        sectionId: newSection.id,
      }));

      // Add questions to local questions
      setLocalQuestions((prev) => [...prev, ...newQuestions]);

      // Add question IDs to section
      newSection.questionIds = newQuestions.map((q) => q.id);
    }

    setLocalSections((prev) => [...prev, newSection]);
    setExpandedSections((prev) => ({ ...prev, [newSection.id]: true }));

    // Auto-scroll to new section after a brief delay to allow rendering
    setTimeout(() => {
      const sectionElement = document.querySelector(
        `[data-section-id="${newSection.id}"]`
      );
      if (sectionElement) {
        sectionElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });

        // Auto-focus the title input
        const titleInput = sectionElement.querySelector(
          'input[placeholder="Section title"]'
        );
        if (titleInput) {
          setTimeout(() => {
            titleInput.focus();
            titleInput.select();
          }, 300);
        }
      }
    }, 100);
  };

  const updateSection = (sectionId, updates) => {
    setLocalSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  // Section-scoped save handler
  const handleSectionSave = async ({
    sectionId,
    title,
    description,
    questions: sectionQuestions,
  }) => {
    setSavingSectionIds((prev) => {
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
    try {
      // Build updated questions array by merging section questions
      const sourceQuestions = localQuestionsRef.current || localQuestions;
      const updatedQuestions = sourceQuestions.map((q) => {
        const updated = sectionQuestions?.find((sq) => sq.id === q.id);
        return updated ? { ...q, ...updated } : q;
      });

      // Update section metadata in local state
      const updatedSections = localSections.map((s) =>
        s.id === sectionId ? { ...s, title, description } : s
      );

      // Build payload with updated data
      const {
        payload,
        hasMissingTitle,
        firstMissingTitleId,
        missingTitleIds: nextMissingTitleIds,
      } = buildSurveyPayloadWithData(updatedQuestions, updatedSections);

      if (hasMissingTitle) {
        setMissingTitleIds(nextMissingTitleIds);
        if (firstMissingTitleId) {
          scrollToQuestion(firstMissingTitleId);
        }
        toast.error("Some questions are missing titles");
        return false;
      }

      // If creating a new survey, validate title first
      if (isCreateMode) {
        if (!meta.title.trim()) {
          setTitleError("Survey title is required");
          toast.error("Please enter a survey title before saving");
          // Scroll to and focus the title input
          titleInputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          setTimeout(() => titleInputRef.current?.focus(), 300);
          return false;
        }
        return new Promise((resolve) => {
          createSurvey(payload, {
            onSuccess: (result) => {
              const newSurveyId = result?.data?._id;
              if (newSurveyId) {
                toast.success("Survey created");
                // Add small delay to ensure backend processing is complete
                setTimeout(() => {
                  navigate({
                    to: "/surveys/$id",
                    params: { id: newSurveyId },
                    // Force page reload to ensure fresh data load
                    replace: true,
                  });
                }, 500);
                resolve(true);
              } else {
                toast.error("Failed to create survey");
                resolve(false);
              }
            },
            onError: (error) => {
              console.error("Failed to create survey:", error);
              toast.error("Failed to create survey");
              resolve(false);
            },
          });
        });
      }

      // Save to backend (existing survey)
      await new Promise((resolve, reject) => {
        updateSurvey(
          { id: surveyId, data: payload },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      // Update local state only after successful save
      setLocalQuestions(updatedQuestions);
      setLocalSections(updatedSections);
      setMissingTitleIds([]);
      setSectionSnapshot(
        sectionId,
        updatedSections,
        updatedQuestions,
        localVisibilityRules,
        localNavigationRules
      );

      toast.success("Section saved");
      return true;
    } catch (error) {
      console.error("Failed to save section:", error);
      toast.error("Failed to save section");
      return false;
    } finally {
      setSavingSectionIds((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  const handleSectionCancel = (sectionId) => {
    const snapshot = sectionSnapshotsRef.current[sectionId];
    if (!snapshot) return;

    setLocalSections((prev) =>
      prev.map((s) => (s.id === sectionId ? snapshot.section : s))
    );

    setLocalQuestions((prev) => {
      const sectionQuestionIds = new Set(
        snapshot.section.questionIds || snapshot.questions.map((q) => q.id)
      );
      const snapshotMap = new Map(snapshot.questions.map((q) => [q.id, q]));

      const next = prev
        .filter((q) => !sectionQuestionIds.has(q.id))
        .concat(
          (snapshot.section.questionIds || []).map((id) => snapshotMap.get(id))
        )
        .filter(Boolean);

      return next;
    });

    const sectionQuestionIds = new Set(
      snapshot.section.questionIds || snapshot.questions.map((q) => q.id)
    );

    setLocalVisibilityRules((prev) => {
      const remaining = (prev || []).filter((rule) => {
        if (!rule) return false;
        if (rule.targetType === "section") {
          return rule.targetId !== sectionId;
        }
        if (rule.targetType === "question") {
          if (sectionQuestionIds.has(rule.targetId)) return false;
        }
        return !sectionQuestionIds.has(rule.when?.questionId);
      });
      return [...remaining, ...(snapshot.visibilityRules || [])];
    });

    setLocalNavigationRules((prev) => {
      const remaining = (prev || []).filter((rule) => {
        if (!rule) return false;
        if (rule.fromSectionId === sectionId) return false;
        if (sectionQuestionIds.has(rule.when?.questionId)) return false;
        if (rule.action?.targetSectionId === sectionId) return false;
        if (sectionQuestionIds.has(rule.action?.targetQuestionId)) return false;
        return true;
      });
      return [...remaining, ...(snapshot.navigationRules || [])];
    });

    setMissingTitleIds((prevIds) =>
      prevIds.filter((id) => !snapshot.section.questionIds?.includes(id))
    );
  };

  // Clean up orphaned rules when sections/questions are deleted
  const cleanupOrphanedRules = (
    deletedSectionIds = [],
    deletedQuestionIds = []
  ) => {
    const sectionIdSet = new Set(deletedSectionIds);
    const questionIdSet = new Set(deletedQuestionIds);

    // Remove navigation rules referencing deleted sections/questions
    setLocalNavigationRules((prev) =>
      prev.filter((rule) => {
        // Remove if jump target is deleted section
        if (
          rule.action?.targetSectionId &&
          sectionIdSet.has(rule.action.targetSectionId)
        ) {
          return false;
        }
        // Remove if jump target is deleted question
        if (
          rule.action?.targetQuestionId &&
          questionIdSet.has(rule.action.targetQuestionId)
        ) {
          return false;
        }
        // Remove if condition references deleted question
        if (rule.when?.questionId && questionIdSet.has(rule.when.questionId)) {
          return false;
        }
        return true;
      })
    );

    // Remove visibility rules referencing deleted sections/questions
    setLocalVisibilityRules((prev) =>
      prev.filter((rule) => {
        // Remove if target is deleted section
        if (rule.targetType === "section" && sectionIdSet.has(rule.targetId)) {
          return false;
        }
        // Remove if target is deleted question
        if (
          rule.targetType === "question" &&
          questionIdSet.has(rule.targetId)
        ) {
          return false;
        }
        // Remove if condition references deleted question
        if (rule.when?.questionId && questionIdSet.has(rule.when.questionId)) {
          return false;
        }
        return true;
      })
    );
  };

  const deleteSection = (sectionId) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;

    const questionIds = new Set(section.questionIds || []);

    const isSectionMode =
      meta.settings?.isSectional ?? localSections.length > 1;

    openAlert({
      title: isSectionMode ? "Delete section?" : "Delete all questions?",
      description: isSectionMode
        ? "Delete this section and all questions inside it?"
        : "This will remove all questions and return to the structure chooser.",
      actionLabel: isSectionMode ? "Delete section" : "Delete all questions",
      cancelLabel: "Cancel",
      actionStyle: "destructive",
      onAction: () => {
        // Clean up rules referencing this section and its questions
        cleanupOrphanedRules([sectionId], Array.from(questionIds));

        setLocalQuestions((prev) => prev.filter((q) => !questionIds.has(q.id)));

        setLocalSections((prev) => {
          const remaining = prev.filter((s) => s.id !== sectionId);

          return remaining.map((s, idx) => ({ ...s, order: idx }));
        });

        setHiddenQuestions((prev) => {
          const next = new Set(prev);
          questionIds.forEach((id) => next.delete(id));
          return next;
        });

        setExpandedQuestions((prev) => {
          const next = { ...prev };
          questionIds.forEach((id) => delete next[id]);
          return next;
        });

        setExpandedSections((prev) => {
          const next = { ...prev };
          delete next[sectionId];
          return next;
        });

        setHiddenSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });

        closeAlert();
      },
      onCancel: () => closeAlert(),
    });
  };

  // When questions change, keep section questionIds in sync for additions/removals
  // const syncSectionsWithQuestions = (nextQuestions) => {
  //   const nextIds = new Set(nextQuestions.map((q) => q.id));
  //   setLocalSections((prev) =>
  //     prev.map((s) => ({
  //       ...s,
  //       questionIds: (s.questionIds || []).filter((id) => nextIds.has(id)),
  //     }))
  //   );
  // };

  // Simple per-option logic setter (maps to navigationRules)
  const setOptionLogic = (questionId, optionValue, action) => {
    const getQuestionOrderIndex = () => {
      const questionById = new Map(
        (localQuestions || []).map((question) => [question.id, question])
      );
      const sectionSorted = [...(localSections || [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const ordered = [];
      sectionSorted.forEach((section) => {
        (section.questionIds || []).forEach((id) => {
          const question = questionById.get(id);
          if (question) ordered.push(question);
        });
      });
      const seen = new Set(ordered.map((q) => q.id));
      const remaining = (localQuestions || [])
        .filter((q) => !seen.has(q.id))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return new Map(
        [...ordered, ...remaining].map((q, index) => [q.id, index])
      );
    };

    const fromSectionId =
      localSections.find((section) => section.questionIds?.includes(questionId))
        ?.id || null;

    setLocalNavigationRules((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex(
        (r) =>
          r.when?.questionId === questionId &&
          r.when?.operator === "equals" &&
          r.when?.value === optionValue
      );

      if (action.type === "continue") {
        if (idx !== -1) updated.splice(idx, 1);
        return updated;
      }

      let actionData;
      if (action.type === "end") {
        actionData = { type: "end" };
      } else if (action.type === "jump") {
        actionData = {
          type: "jump",
          targetSectionId: action.targetSectionId || "",
        };
      } else if (action.type === "jump_to_question") {
        const questionOrderIndex = getQuestionOrderIndex();
        const sourceIndex = questionOrderIndex.get(questionId);
        const targetIndex = questionOrderIndex.get(action.targetQuestionId);
        const isInvalidForwardJump =
          !Number.isFinite(sourceIndex) ||
          !Number.isFinite(targetIndex) ||
          targetIndex <= sourceIndex;

        // Enforce forward-only question jumps in editor authoring path.
        if (isInvalidForwardJump) {
          if (idx !== -1) {
            updated.splice(idx, 1);
          }
          return updated;
        }

        actionData = {
          type: "jump_to_question",
          targetQuestionId: action.targetQuestionId || "",
        };
      } else {
        actionData = {
          type: "jump",
          targetSectionId: action.targetSectionId || "",
        };
      }

      const base = {
        id: idx !== -1 ? updated[idx].id : `nav_${crypto.randomUUID()}`,
        fromSectionId,
        when: { questionId, operator: "equals", value: optionValue },
        action: actionData,
        priority: 0,
      };

      if (idx === -1) updated.push(base);
      else updated[idx] = base;
      return updated;
    });
  };

  const sectionJumpResolution = (() => {
    const map = {};
    const sourceMap = {};

    const questionSectionMap = new Map();
    (localSections || []).forEach((section) => {
      (section.questionIds || []).forEach((questionId) => {
        if (typeof questionId === "string" && questionId) {
          questionSectionMap.set(questionId, section.id);
        }
      });
    });
    (localQuestions || []).forEach((question) => {
      if (!question?.id) return;
      if (question?.sectionId) {
        questionSectionMap.set(question.id, question.sectionId);
      }
    });

    const derivedTargetsBySection = new Map();

    (localNavigationRules || []).forEach((rule) => {
      const actionType = normalizeSectionJumpActionType(rule?.action?.type);
      const targetSectionId =
        rule?.action?.targetSectionId ||
        rule?.action?.sectionId ||
        rule?.targetSectionId ||
        "";
      if (
        typeof rule?.fromSectionId === "string" &&
        rule.fromSectionId.length > 0 &&
        isUnconditionalSectionRule(rule)
      ) {
        if (actionType === "terminate") {
          map[rule.fromSectionId] = "__end__";
          sourceMap[rule.fromSectionId] = "explicit";
          return;
        }
        if (
          actionType !== "jump" ||
          typeof targetSectionId !== "string" ||
          !targetSectionId
        ) {
          return;
        }
        map[rule.fromSectionId] = targetSectionId;
        sourceMap[rule.fromSectionId] = "explicit";
        return;
      }

      if (
        actionType !== "jump" ||
        typeof targetSectionId !== "string" ||
        !targetSectionId
      ) {
        return;
      }

      const sourceQuestionId = rule?.when?.questionId;
      if (typeof sourceQuestionId !== "string" || !sourceQuestionId) {
        return;
      }
      const sourceSectionId =
        (typeof rule?.fromSectionId === "string" && rule.fromSectionId) ||
        questionSectionMap.get(sourceQuestionId);
      if (!sourceSectionId) return;

      if (!derivedTargetsBySection.has(sourceSectionId)) {
        derivedTargetsBySection.set(sourceSectionId, new Set());
      }
      derivedTargetsBySection.get(sourceSectionId).add(targetSectionId);
    });

    for (const [sectionId, targets] of derivedTargetsBySection.entries()) {
      if (map[sectionId]) {
        sourceMap[sectionId] = "explicit_with_conditional";
        continue;
      }
      if (targets.size !== 1) continue;
      const [targetSectionId] = [...targets];
      if (typeof targetSectionId !== "string" || !targetSectionId) continue;
      // Keep section-level jump selector bound to explicit unconditional rules only.
      // Derived targets from option logic are informational and should not force
      // the section fallback selector value.
      sourceMap[sectionId] = "derived";
    }

    return { map, sourceMap };
  })();
  const sectionJumpMap = sectionJumpResolution.map;
  const sectionJumpSourceMap = sectionJumpResolution.sourceMap;

  const hasConditionalSectionVisibility = (localVisibilityRules || []).some(
    (rule) => rule?.targetType === "section"
  );

  const handleSectionJumpChange = (sectionId, targetSectionId) => {
    setLocalNavigationRules((prev = []) => {
      const updated = [...prev];
      const sectionJumpIndexes = updated
        .map((rule, index) => ({ rule, index }))
        .filter(({ rule }) => {
          const actionType = normalizeSectionJumpActionType(rule?.action?.type);
          return (
            rule?.fromSectionId === sectionId &&
            isUnconditionalSectionRule(rule) &&
            (actionType === "jump" || actionType === "terminate")
          );
        })
        .map(({ index }) => index);
      const sectionJumpIdx = sectionJumpIndexes.length
        ? sectionJumpIndexes[0]
        : -1;

      const isContinueTarget =
        !targetSectionId ||
        targetSectionId === "__continue__" ||
        targetSectionId === sectionId;

      if (isContinueTarget) {
        if (sectionJumpIndexes.length > 0) {
          for (let i = sectionJumpIndexes.length - 1; i >= 0; i -= 1) {
            updated.splice(sectionJumpIndexes[i], 1);
          }
        }
        return dedupeUnconditionalSectionNavigationRules(updated);
      }

      const baseRule = {
        id:
          sectionJumpIdx !== -1
            ? updated[sectionJumpIdx].id
            : `nav_${crypto.randomUUID()}`,
        fromSectionId: sectionId,
        when: true,
        action:
          targetSectionId === "__end__"
            ? {
                type: "terminate",
              }
            : {
                type: "jump",
                targetSectionId,
              },
        // Keep unconditional section jump lower than conditional option logic
        // so specific answer-based rules win first.
        priority: -100,
      };

      if (sectionJumpIndexes.length > 0) {
        for (let i = sectionJumpIndexes.length - 1; i >= 0; i -= 1) {
          updated.splice(sectionJumpIndexes[i], 1);
        }
      }

      if (sectionJumpIdx === -1) {
        updated.push(baseRule);
      } else {
        updated.push(baseRule);
      }
      return dedupeUnconditionalSectionNavigationRules(updated);
    });
  };

  const getOptionLogic = (questionId, optionValue) => {
    const resolveLegacySkipTargetQuestionId = (sourceQuestionId, skipCount) => {
      const section = localSections.find((s) =>
        s.questionIds?.includes(sourceQuestionId)
      );
      if (!section?.questionIds?.length) return "";
      const sourceIndex = section.questionIds.indexOf(sourceQuestionId);
      if (sourceIndex < 0) return "";
      const jumpIndex = sourceIndex + (Number(skipCount) || 1) + 1;
      return section.questionIds[jumpIndex] || "";
    };

    const match = localNavigationRules.find(
      (r) =>
        r.when?.questionId === questionId &&
        r.when?.operator === "equals" &&
        r.when?.value === optionValue
    );
    if (!match) return { type: "continue" };
    if (match.action?.type === "end") return { type: "end" };
    if (match.action?.type === "terminate") return { type: "end" };
    if (match.action?.type === "skip") {
      const targetQuestionId = resolveLegacySkipTargetQuestionId(
        questionId,
        match.action?.skipCount
      );
      if (targetQuestionId) {
        return {
          type: "jump_to_question",
          targetQuestionId,
        };
      }
      return {
        type: "continue",
      };
    }
    if (match.action?.targetQuestionId) {
      return {
        type: "jump_to_question",
        targetQuestionId: match.action?.targetQuestionId || "",
      };
    }
    return {
      type: "jump",
      targetSectionId: match.action?.targetSectionId || "",
    };
  };

  // Get visibility condition for a question (simple format)
  const getVisibilityCondition = (questionId) => {
    return getSimpleVisibilityForQuestion(questionId, localVisibilityRules);
  };

  // Handle visibility condition changes
  const handleVisibilityChange = (questionId, condition) => {
    setLocalVisibilityRules((prev) =>
      updateVisibilityRulesWithSimpleCondition(prev, questionId, condition)
    );
  };

  // Section expansion handlers
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Question expansion handler
  const toggleQuestionExpanded = (questionId, newState) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: newState,
    }));
  };

  // Document-style section handlers
  const handleToggleVisibility = (sectionId) => {
    setHiddenSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Expand/Collapse all functionality
  const handleExpandAll = () => {
    const allExpanded = {};
    localSections.forEach((section) => {
      allExpanded[section.id] = true;
    });
    setExpandedSections(allExpanded);
  };

  const handleCollapseAll = () => {
    const allCollapsed = {};
    localSections.forEach((section) => {
      allCollapsed[section.id] = false;
    });
    setExpandedSections(allCollapsed);
  };

  // Filter mode handler
  const handleFilterChange = (mode) => {
    setFilterMode(mode);
  };

  const unhideAllQuestionsInSection = (sectionId) => {
    setHiddenQuestions((prev) => {
      const next = new Set(prev);
      if (sectionId === "root") {
        localQuestions
          .filter((q) => !q.sectionId)
          .forEach((question) => next.delete(question.id));
        return next;
      }
      const section = localSections.find((s) => s.id === sectionId);
      if (section && section.questionIds) {
        section.questionIds.forEach((questionId) => {
          next.delete(questionId);
        });
      }
      return next;
    });
  };

  const handleSectionLogic = (section) => {
    openSidePanel({ ...section, type: "section" });
  };

  const handleAddQuestionToSection = (questionType, sectionId) => {
    addQuestionToSection(questionType, sectionId);
  };

  // Add question to specific section
  const addQuestionToSection = (questionType, sectionId) => {
    const newQuestion = {
      ...getDefaultQuestion(questionType),
      order: localQuestions.length + 1,
      sectionId,
    };

    setLocalQuestions((prev) => [...prev, newQuestion]);

    // Assign to section
    setLocalSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, questionIds: [...(s.questionIds || []), newQuestion.id] }
          : s
      )
    );

    // Auto-expand section
    setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));

    // Collapse all other questions and expand only the new question
    setExpandedQuestions({ [newQuestion.id]: true });

    // Highlight the new question
    setHighlightedQuestionId(newQuestion.id);

    // Remove highlight after 2 seconds
    setTimeout(() => {
      setHighlightedQuestionId(null);
    }, 2000);

    // Auto-scroll to new question after a brief delay to allow rendering
    setTimeout(() => {
      const questionElement = document.querySelector(
        `[data-question-id="${newQuestion.id}"]`
      );
      if (questionElement) {
        questionElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        // Auto-focus the title input
        const titleInput = questionElement.querySelector(
          'input[placeholder*="question"], input[placeholder*="Question"], textarea[placeholder*="question"], textarea[placeholder*="Question"]'
        );
        if (titleInput) {
          setTimeout(() => {
            titleInput.focus();
            titleInput.select();
          }, 300);
        }
      }
    }, 150);
  };

  // Update question by ID and auto-save to database
  const updateQuestion = (questionId, updates) => {
    // Early return if updates is null or undefined
    if (!updates || typeof updates !== "object") {
      console.warn("updateQuestion called with invalid updates:", updates);
      return;
    }

    setLocalQuestions((prev) => {
      const updatedQuestions = prev.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question
      );

      // Clear missing title error if question now has a title
      const updatedQuestion = updatedQuestions.find((q) => q.id === questionId);
      const hasTitle =
        updatedQuestion?.title && updatedQuestion.title.trim().length > 0;

      if (hasTitle) {
        setMissingTitleIds((prevIds) =>
          prevIds.filter((id) => id !== questionId)
        );
      }

      return updatedQuestions;
    });
  };

  function scrollToQuestion(questionId, containingSectionId = null) {
    const containingSection =
      containingSectionId
        ? localSections.find((section) => section.id === containingSectionId)
        : localSections.find((section) =>
            section.questionIds?.includes(questionId)
          );

    if (containingSection) {
      setExpandedSections((prev) => ({
        ...prev,
        [containingSection.id]: true,
      }));
    }

    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: true,
    }));

    const questionElement = document.querySelector(
      `[data-question-id="${questionId}"]`
    );
    if (!questionElement) return;

    questionElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    const titleInput = questionElement.querySelector(
      'input[placeholder*="question"], input[placeholder*="Question"], textarea[placeholder*="question"], textarea[placeholder*="Question"]'
    );
    if (titleInput) {
      setTimeout(() => {
        titleInput.focus();
        titleInput.select();
      }, 200);
    }
  }

  const normalizeQuestionValidation = (validation) => {
    if (!validation || typeof validation !== "object") {
      return undefined;
    }

    const normalized = { ...validation };
    const knownPredefinedPatterns = new Set([
      "email",
      "phone",
      "url",
      "numeric",
      "integer",
      "alphanumeric",
    ]);

    const rawPredefinedPattern =
      typeof normalized.predefinedPattern === "string"
        ? normalized.predefinedPattern.trim()
        : normalized.predefinedPattern;
    const rawPattern =
      typeof normalized.pattern === "string"
        ? normalized.pattern.trim()
        : normalized.pattern;

    const candidatePattern =
      typeof rawPredefinedPattern === "string" && rawPredefinedPattern.length > 0
        ? rawPredefinedPattern
        : typeof rawPattern === "string" && rawPattern.length > 0
          ? rawPattern
          : null;

    const normalizedPredefinedPattern =
      candidatePattern === "number" ? "numeric" : candidatePattern;

    if (
      typeof normalizedPredefinedPattern === "string" &&
      knownPredefinedPatterns.has(normalizedPredefinedPattern)
    ) {
      normalized.predefinedPattern = normalizedPredefinedPattern;
      normalized.pattern = normalizedPredefinedPattern;
    } else {
      delete normalized.predefinedPattern;
      if (typeof rawPattern !== "string" || rawPattern.length === 0) {
        delete normalized.pattern;
      } else if (knownPredefinedPatterns.has(rawPattern)) {
        normalized.pattern = rawPattern;
      } else {
        normalized.pattern = rawPattern;
      }
    }

    const numericKeys = [
      "minLength",
      "maxLength",
      "minSelections",
      "maxSelections",
    ];
    numericKeys.forEach((key) => {
      if (!Number.isFinite(normalized[key])) {
        delete normalized[key];
      }
    });

    if (typeof normalized.customMessage === "string") {
      const trimmed = normalized.customMessage.trim();
      if (trimmed.length === 0) {
        delete normalized.customMessage;
      } else {
        normalized.customMessage = trimmed;
      }
    } else {
      delete normalized.customMessage;
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  };

  function buildSurveyPayload(questions) {
    const orderedQuestions = questions.map((q, idx) => {
      const title = (q.title || "").trim();
      const helpText =
        typeof q.helpText === "string" && q.helpText.trim().length > 0
          ? q.helpText.trim()
          : undefined;

      const isChoice = QUESTION_TYPE_IS_CHOICE.has(q.type);
      let options = isChoice
        ? (q.options || [])
            .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
            .filter(Boolean)
        : undefined;
      if (isChoice && (!options || options.length === 0)) {
        options = ["Option 1", "Option 2"];
      }

      const sanitized = { ...q, title, helpText, options };
      if (isChoice) {
        sanitized.allowOther = q.allowOther === true;
      } else {
        delete sanitized.allowOther;
      }
      if (q.type === QUESTION_TYPES.RATING) {
        sanitized.ratingScale = q.ratingScale || 5;
      } else {
        delete sanitized.ratingScale;
      }

      return {
        ...sanitized,
        validation: normalizeQuestionValidation(q.validation),
        order: idx + 1,
      };
    });

    const missingTitleIds = orderedQuestions
      .filter((q) => !q.title || q.title.length === 0)
      .map((q) => q.id);
    const firstMissingTitleId = missingTitleIds[0];
    // Only block save if there are questions and at least one is missing a title
    const hasMissingTitle =
      orderedQuestions.length > 0 && missingTitleIds.length > 0;

    const sanitizedSections = (localSections || []).map((section, idx) => {
      const title = (section.title || "").trim();
      const rawDescription =
        typeof section.description === "string"
          ? section.description.trim()
          : section.description;
      const description =
        rawDescription === "" || rawDescription === undefined
          ? null
          : rawDescription;

      return {
        ...section,
        title,
        description,
        order: section.order ?? idx,
        questionIds: section.questionIds || [],
      };
    });
    const sectionIdByQuestionId = new Map();
    sanitizedSections.forEach((section) => {
      (section.questionIds || []).forEach((questionId) => {
        if (typeof questionId === "string" && questionId) {
          sectionIdByQuestionId.set(questionId, section.id);
        }
      });
    });

    const normalizedSettings = normalizeSurveySettings(
      meta.settings,
      sanitizedSections.length
    );

    const normalizedNavigationRules =
      normalizeNavigationRules(localNavigationRules);

    const sanitizedQuestions = orderedQuestions.map((q) => {
      const normalizedValidation = normalizeQuestionValidation(q.validation);
      const resolvedSectionId = sectionIdByQuestionId.get(q.id) || q.sectionId;
      if (q.type !== QUESTION_TYPES.RATING) {
        const { ratingScale: _ratingScale, ...rest } = q;
        const nextQuestion = {
          ...rest,
          ...(resolvedSectionId ? { sectionId: resolvedSectionId } : {}),
        };
        if (normalizedValidation) {
          return {
            ...nextQuestion,
            validation: normalizedValidation,
          };
        }
        const { validation: _validation, ...withoutValidation } = nextQuestion;
        return withoutValidation;
      }
      const nextQuestion = {
        ...q,
        ...(resolvedSectionId ? { sectionId: resolvedSectionId } : {}),
        ratingScale: q.ratingScale || 5,
      };
      if (normalizedValidation) {
        return {
          ...nextQuestion,
          validation: normalizedValidation,
        };
      }
      const { validation: _validation, ...withoutValidation } = nextQuestion;
      return withoutValidation;
    });

    const payload = {
      title: meta.title,
      description:
        typeof meta.description === "string" && meta.description.trim() === ""
          ? null
          : meta.description,
      themeColor: meta.themeColor,
      thankYouMessage: meta.thankYouMessage,
      isWhitelistEnabled: meta.isWhitelistEnabled,
      showProgress: meta.showProgress,
      oneResponsePerRecipient: meta.oneResponsePerRecipient,
      logo: meta.logo,
      questions: sanitizedQuestions,
      sections: sanitizedSections,
      visibilityRules: localVisibilityRules,
      navigationRules: normalizedNavigationRules,
      settings: normalizedSettings,
    };

    if (meta.logo && meta.logo.trim()) {
      payload.logo = meta.logo.trim();
    }

    return {
      payload,
      hasMissingTitle,
      firstMissingTitleId,
      missingTitleIds,
    };
  }

  // Helper to build payload with custom questions/sections (for section save)
  function buildSurveyPayloadWithData(questions, sections) {
    const orderedQuestions = questions.map((q, idx) => {
      const title = (q.title || "").trim();
      const helpText =
        typeof q.helpText === "string" && q.helpText.trim().length > 0
          ? q.helpText.trim()
          : undefined;

      const isChoice = QUESTION_TYPE_IS_CHOICE.has(q.type);
      let options = isChoice
        ? (q.options || [])
            .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
            .filter(Boolean)
        : undefined;
      if (isChoice && (!options || options.length === 0)) {
        options = ["Option 1", "Option 2"];
      }

      const sanitized = { ...q, title, helpText, options };
      if (isChoice) {
        sanitized.allowOther = q.allowOther === true;
      } else {
        delete sanitized.allowOther;
      }
      if (q.type === QUESTION_TYPES.RATING) {
        sanitized.ratingScale = q.ratingScale || 5;
      } else {
        delete sanitized.ratingScale;
      }

      return {
        ...sanitized,
        validation: normalizeQuestionValidation(q.validation),
        order: idx + 1,
      };
    });

    const missingTitleIds = orderedQuestions
      .filter((q) => !q.title || q.title.length === 0)
      .map((q) => q.id);
    const firstMissingTitleId = missingTitleIds[0];
    // Only block save if there are questions and at least one is missing a title
    const hasMissingTitle =
      orderedQuestions.length > 0 && missingTitleIds.length > 0;

    const sanitizedSections = (sections || []).map((section, idx) => {
      const title = (section.title || "").trim();
      const rawDescription =
        typeof section.description === "string"
          ? section.description.trim()
          : section.description;
      const description =
        rawDescription === "" || rawDescription === undefined
          ? null
          : rawDescription;

      return {
        ...section,
        title,
        description,
        order: section.order ?? idx,
        questionIds: section.questionIds || [],
      };
    });
    const sectionIdByQuestionId = new Map();
    sanitizedSections.forEach((section) => {
      (section.questionIds || []).forEach((questionId) => {
        if (typeof questionId === "string" && questionId) {
          sectionIdByQuestionId.set(questionId, section.id);
        }
      });
    });

    const normalizedSettings = normalizeSurveySettings(
      meta.settings,
      sanitizedSections.length
    );

    const normalizedNavigationRules =
      normalizeNavigationRules(localNavigationRules);

    const sanitizedQuestions = orderedQuestions.map((q) => {
      const normalizedValidation = normalizeQuestionValidation(q.validation);
      const resolvedSectionId = sectionIdByQuestionId.get(q.id) || q.sectionId;
      if (q.type !== QUESTION_TYPES.RATING) {
        const { ratingScale: _ratingScale, ...rest } = q;
        const nextQuestion = {
          ...rest,
          ...(resolvedSectionId ? { sectionId: resolvedSectionId } : {}),
        };
        if (normalizedValidation) {
          return {
            ...nextQuestion,
            validation: normalizedValidation,
          };
        }
        const { validation: _validation, ...withoutValidation } = nextQuestion;
        return withoutValidation;
      }
      const nextQuestion = {
        ...q,
        ...(resolvedSectionId ? { sectionId: resolvedSectionId } : {}),
        ratingScale: q.ratingScale || 5,
      };
      if (normalizedValidation) {
        return {
          ...nextQuestion,
          validation: normalizedValidation,
        };
      }
      const { validation: _validation, ...withoutValidation } = nextQuestion;
      return withoutValidation;
    });

    const payload = {
      title: meta.title,
      description:
        typeof meta.description === "string" && meta.description.trim() === ""
          ? null
          : meta.description,
      themeColor: meta.themeColor,
      thankYouMessage: meta.thankYouMessage,
      isWhitelistEnabled: meta.isWhitelistEnabled,
      showProgress: meta.showProgress,
      oneResponsePerRecipient: meta.oneResponsePerRecipient,
      logo: meta.logo,
      questions: sanitizedQuestions,
      sections: sanitizedSections,
      visibilityRules: localVisibilityRules,
      navigationRules: normalizedNavigationRules,
      settings: normalizedSettings,
    };

    if (meta.logo && meta.logo.trim()) {
      payload.logo = meta.logo.trim();
    }

    return {
      payload,
      hasMissingTitle,
      firstMissingTitleId,
      missingTitleIds,
    };
  }

  // Delete question by ID and keep section assignments in sync
  const deleteQuestion = (questionId) => {
    // Clean up rules referencing this question
    cleanupOrphanedRules([], [questionId]);

    setLocalQuestions((prev) => prev.filter((q) => q.id !== questionId));

    setLocalSections((prev) =>
      prev.map((section) => ({
        ...section,
        questionIds: (section.questionIds || []).filter(
          (id) => id !== questionId
        ),
      }))
    );
  };

  // Duplicate question by ID and insert next to original within its section
  const duplicateQuestion = (questionId) => {
    const newId = `${questionId}-copy-${Date.now()}`;

    setLocalQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === questionId);
      if (index === -1) return prev;

      const original = prev[index];
      const copy = {
        ...original,
        id: newId,
        title: `${original.title || "Untitled"} (copy)`,
        order: prev.length + 1,
      };

      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });

    // Insert the duplicated question into the same section immediately after the original
    setLocalSections((prev) =>
      prev.map((section) => {
        const ids = section.questionIds || [];
        const originalIndex = ids.indexOf(questionId);
        if (originalIndex === -1) return section;
        const newIds = [...ids];
        newIds.splice(originalIndex + 1, 0, newId);
        return { ...section, questionIds: newIds };
      })
    );
  };

  const moveQuestionToSection = (questionId, targetSectionId) => {
    if (!questionId || !targetSectionId) return;

    const targetSection = localSections.find(
      (section) => section.id === targetSectionId
    );
    if (!targetSection) return;

    const currentSection = localSections.find((section) =>
      section.questionIds?.includes(questionId)
    );

    if (currentSection?.id === targetSectionId) return;

    setLocalQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, sectionId: targetSectionId }
          : question
      )
    );

    setLocalSections((prev) =>
      prev.map((section) => {
        const filteredIds = (section.questionIds || []).filter(
          (id) => id !== questionId
        );

        if (section.id === targetSectionId) {
          return {
            ...section,
            questionIds: [...filteredIds, questionId],
          };
        }

        return {
          ...section,
          questionIds: filteredIds,
        };
      })
    );

    setExpandedSections((prev) => ({
      ...prev,
      [targetSectionId]: true,
    }));
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: true,
    }));
    setHighlightedQuestionId(questionId);

    setTimeout(() => {
      scrollToQuestion(questionId, targetSectionId);
    }, 150);

    setTimeout(() => {
      setHighlightedQuestionId((current) =>
        current === questionId ? null : current
      );
    }, 2000);
  };

  // Reorder questions within a section
  const handleReorderQuestions = (sectionId, newQuestionIds) => {
    setLocalSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, questionIds: newQuestionIds }
          : section
      )
    );
  };

  // Reorder sections
  const handleReorderSections = (reorderedSections) => {
    // Update titles for default-named sections to match new order
    const updated = reorderedSections.map((section, index) => {
      const isDefaultTitle = /^Section \d+$/.test(section.title || "");
      return {
        ...section,
        title: isDefaultTitle ? `Section ${index + 1}` : section.title,
      };
    });
    setLocalSections(updated);
  };

  // Duplicate section
  const duplicateSection = (sectionId) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;

    const copy = {
      ...section,
      id: `section_${crypto.randomUUID()}`,
      title: `${section.title || "Section"} (copy)`,
      order: localSections.length,
      questionIds: [], // Don't copy question assignments
    };

    setLocalSections((prev) => [...prev, copy]);
    setExpandedSections((prev) => ({ ...prev, [copy.id]: true }));
  };

  // Move section up
  const moveSectionUp = (sectionId) => {
    const index = localSections.findIndex((s) => s.id === sectionId);
    if (index <= 0) return; // Already at top

    const reordered = [...localSections];
    const section = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = section;

    setLocalSections(reordered);
  };

  // Move section down
  const moveSectionDown = (sectionId) => {
    const index = localSections.findIndex((s) => s.id === sectionId);
    if (index === -1 || index >= localSections.length - 1) return; // Already at bottom

    const reordered = [...localSections];
    const section = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = section;

    setLocalSections(reordered);
  };

  // Merge section with above
  const mergeSectionWithAbove = (sectionId) => {
    const index = localSections.findIndex((s) => s.id === sectionId);
    if (index <= 0) return; // No section above to merge with

    const targetSection = localSections[index];
    const aboveSection = localSections[index - 1];

    // Merge questionIds
    const mergedQuestionIds = [
      ...(aboveSection.questionIds || []),
      ...(targetSection.questionIds || []),
    ];

    // Update above section with merged questions and remove merged section
    setLocalSections((prev) => {
      const remaining = prev
        .map((s) =>
          s.id === aboveSection.id
            ? { ...s, questionIds: mergedQuestionIds }
            : s
        )
        .filter((s) => s.id !== sectionId); // Remove merged section

      return remaining;
    });

    // Expand the merged section
    setExpandedSections((prev) => ({ ...prev, [aboveSection.id]: true }));
  };

  // Open side panel for section or question
  const openSidePanel = (entity) => {
    setSelectedEntity(entity);
    setSidePanelOpen(true);
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setSelectedEntity(null);
  };

  // const handlePreviewSubmit = (answers) => {
  //   // Local-only submission to mimic respondent flow
  //   console.debug("Preview submission (not sent):", answers);
  //   toast.success("Preview submitted (not saved)");
  // };

  const handlePublish = () => {
    if (isCreateMode) {
      toast.error("Please save the survey first before publishing");
      return;
    }

    if (isClosedEnded && totalRecipients < 1) {
      toast.error(
        "Add at least one recipient before publishing a closed-ended survey"
      );
      navigate({
        search: (prev) => ({ ...prev, tab: "recipients" }),
      });
      return;
    }

    warnLogicConflicts();

    const isRepublish = isPublished;
    const title = isRepublish ? "Publish Changes?" : "Publish Survey?";
    const description = isRepublish
      ? "Publishing will update the live survey with your latest changes. This will create a new version. Existing responses will remain linked to their original question versions."
      : "Publishing will make this survey live and accessible to recipients. You can still edit and republish after publishing, or close it later to stop accepting responses.";
    const actionLabel = isRepublish ? "Publish Changes" : "Publish Survey";

    openAlert({
      title,
      description,
      actionLabel,
      cancelLabel: "Cancel",
      actionStyle: "primary",
      onAction: () => {
        const { payload, hasMissingTitle, firstMissingTitleId } =
          buildSurveyPayload(localQuestions);
        if (hasMissingTitle) {
          if (firstMissingTitleId) {
            scrollToQuestion(firstMissingTitleId);
          }
          toast.error("Every question needs a title before publishing");
          return;
        }

        updateSurvey(
          { id: surveyId, data: payload },
          {
            onSuccess: () => {
              publishSurvey(surveyId, {
                onSuccess: () => {
                  closeAlert();
                  toast.success(
                    isRepublish
                      ? "Changes published successfully"
                      : "Survey published successfully"
                  );
                  if (!isRepublish) {
                    navigate({ to: "/surveys" });
                  }
                },
                onError: (error) => {
                  closeAlert();
                  toast.error(error.message || "Failed to publish survey");
                },
              });
            },
            onError: (error) => {
              closeAlert();
              const message = getSurveySaveErrorMessage(
                error,
                "Failed to save before publishing"
              );
              console.error("[SurveyEditor] Save before publish failed", {
                message,
                errors: error?.response?.data?.errors || [],
                settingsPayload: payload?.settings,
              });
              toast.error(message);
            },
          }
        );
      },
      onCancel: () => closeAlert(),
    });
  };

  const isPublished = !isCreateMode && survey?.status === "published";
  const isClosed = !isCreateMode && survey?.status === "closed";
  const isDraft =
    !isCreateMode && (survey?.status === "draft" || !survey?.status);
  const isSettingsLocked = isClosed; // Only lock closed surveys, allow editing published surveys

  // Check if published survey has unpublished changes
  const hasUnpublishedChanges =
    isPublished &&
    survey?.currentVersion > 0 &&
    survey?.publishedVersion >= 0 &&
    survey.currentVersion > survey.publishedVersion;

  const totalRecipients =
    recipientStats?.totalRecipients ?? recipientStats?.total ?? 0;
  const isClosedEnded = !!meta.isWhitelistEnabled;
  const isPublishBlocked =
    !isCreateMode && isClosedEnded && totalRecipients < 1;

  const handlePublishBlocked = () => {
    openAlert({
      title: "Cannot Publish Survey",
      description:
        "This is a closed-ended survey and requires at least one recipient before publishing. Please go to the Recipients tab to add recipients.",
      actionLabel: "Go to Recipients",
      cancelLabel: "Cancel",
      actionStyle: "primary",
      onAction: () => {
        closeAlert();
        navigate({ search: (prev) => ({ ...prev, tab: "recipients" }) });
      },
      onCancel: () => closeAlert(),
    });
  };

  const handleClose = () => {
    if (isCreateMode) {
      toast.error("Cannot close a survey that has not been created yet");
      return;
    }

    openAlert({
      title: "Close Survey?",
      description:
        "Closing will stop accepting new responses. The survey will remain accessible but respondents cannot submit new answers. You can reopen the survey later if needed.",
      actionLabel: "Close Survey",
      cancelLabel: "Cancel",
      actionStyle: "destructive",
      onAction: () => {
        closeSurvey(surveyId, {
          onSuccess: () => {
            closeAlert();
            toast.success("Survey closed successfully");
            navigate({ to: "/surveys" });
          },
          onError: (error) => {
            closeAlert();
            toast.error(error.message || "Failed to close survey");
          },
        });
      },
      onCancel: () => closeAlert(),
    });
  };

  const handleDuplicate = () => {
    if (isCreateMode) {
      toast.error("Save this survey first before duplicating");
      return;
    }

    openAlert({
      title: "Duplicate Survey?",
      description:
        "A new draft copy will be created with sections, questions, logic, settings, and recipients. Responses are not copied.",
      actionLabel: "Duplicate",
      cancelLabel: "Cancel",
      actionStyle: "default",
      onAction: () => {
        setLoading(true);
        duplicateSurvey(surveyId, {
          onSuccess: (result) => {
            setLoading(false);
            closeAlert();
            const duplicatedSurveyId = result?.data?._id;
            toast.success("Survey duplicated successfully");
            if (duplicatedSurveyId) {
              navigate({
                to: "/surveys/$id",
                params: { id: duplicatedSurveyId },
              });
            }
          },
          onError: (error) => {
            setLoading(false);
            closeAlert();
            toast.error(error.message || "Failed to duplicate survey");
          },
        });
      },
      onCancel: () => closeAlert(),
    });
  };

  const handleLogoUploadClick = () => {
    if (!surveyId) {
      if (!meta.title.trim()) {
        setTitleError("Survey title is required");
        toast.error("Please enter a survey title before uploading a logo");
        // Scroll to and focus the title input
        titleInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => titleInputRef.current?.focus(), 300);
        return;
      }
      const { payload } = buildSurveyPayload(localQuestions);

      sessionStorage.setItem("pendingSurveyLogoUpload", "true");
      createSurvey(payload, {
        onSuccess: (result) => {
          const newSurveyId = result?.data?._id;
          if (newSurveyId) {
            navigate({
              to: "/surveys/$id",
              params: { id: newSurveyId },
              search: { tab: "settings" },
            });
          }
        },
      });
      return;
    }

    fileInputRef.current?.click();
  };

  const normalizeLogoUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    const rawBaseUrl = import.meta.env.VITE_API_URL || "";
    const baseUrl = rawBaseUrl.endsWith("/api")
      ? rawBaseUrl.replace(/\/api$/, "")
      : rawBaseUrl;
    if (value.startsWith("/")) return `${baseUrl}${value}`;
    return `${baseUrl}/${value}`;
  };
  const shareUrl = survey?.publicId
    ? `${window.location.origin}/r/${survey.publicId}`
    : "";

  // Prioritize survey-specific logo over company logo
  // Only use company logo if survey doesn't have its own logo set
  const activeLogoValue = meta.logo || "";
  const companyLogoValue =
    !meta.logo && companyData?.logo ? companyData.logo : "";
  const activeLogoUrl = normalizeLogoUrl(activeLogoValue);
  const companyLogoUrl = normalizeLogoUrl(companyLogoValue);
  const activeLogoUrlWithCache = activeLogoUrl
    ? `${activeLogoUrl}${activeLogoUrl.includes("?") ? "&" : "?"}v=${logoVersion}`
    : "";
  const companyLogoUrlWithCache = companyLogoUrl
    ? `${companyLogoUrl}${companyLogoUrl.includes("?") ? "&" : "?"}v=${logoVersion}`
    : "";
  const displayLogoUrl =
    localLogoUrl || activeLogoUrlWithCache || companyLogoUrlWithCache;
  const appFaviconUrl = `${window.location.origin}/favicon.png`;
  const shareQrLogoUrl = displayLogoUrl || appFaviconUrl;
  const logoFallbackInitials = (meta.title || companyData?.name || "Survey")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const handleLogoFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB. Please choose a smaller file.",
      });
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload an image file (PNG, JPG, or WebP).",
      });
      return;
    }

    if (localLogoUrlRef.current) {
      URL.revokeObjectURL(localLogoUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    localLogoUrlRef.current = previewUrl;
    setLocalLogoUrl(previewUrl);

    if (!surveyId) {
      if (!meta.title.trim()) {
        setTitleError("Survey title is required");
        toast.error("Please enter a survey title before uploading a logo");
        // Scroll to and focus the title input
        titleInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => titleInputRef.current?.focus(), 300);
        return;
      }
      const { payload } = buildSurveyPayload(localQuestions);
      pendingLogoFileRef.current = file;
      sessionStorage.setItem("pendingSurveyLogoUpload", "true");
      createSurvey(payload, {
        onSuccess: (result) => {
          const newSurveyId = result?.data?._id;
          if (newSurveyId) {
            navigate({
              to: "/surveys/$id",
              params: { id: newSurveyId },
              search: { tab: "settings" },
            });
          }
        },
      });
      return;
    }

    try {
      setUploadProgress(0);
      const result = await uploadSurveyLogo({
        id: surveyId,
        file,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });
      // Backend returns { data: { logo: "https://...", publicId: "..." } }
      const logoUrl = result?.data?.logo || meta.logo;
      setMeta((m) => ({ ...m, logo: logoUrl }));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
      setLogoVersion(Date.now());
    } catch (error) {
      console.error("Failed to upload survey logo:", error);
      setUploadProgress(0);
    }
  };

  const handleCompanyLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    uploadCompanyLogo(file);
  };

  const handleLogoRemove = async () => {
    if (!surveyId) return;
    try {
      await deleteSurveyLogo(surveyId);
      setMeta((m) => ({ ...m, logo: "" }));
      if (localLogoUrlRef.current) {
        URL.revokeObjectURL(localLogoUrlRef.current);
        localLogoUrlRef.current = null;
      }
      setLocalLogoUrl("");
      setLogoVersion(Date.now());
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to delete survey logo:", error);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) {
      toast.error("Survey must be published first to get a public link");
      return;
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success("Survey link copied to clipboard!");
  };

  const handlePreview = () => {
    // Always preview using current editor state (local changes)
    // This allows previewing edits even for published surveys
    const previewData = {
      ...previewSurveyData,
      _previewMode: true,
      _isDraft: survey?.status !== "published",
      _isPublished: survey?.status === "published",
    };
    sessionStorage.setItem("draftPreview", JSON.stringify(previewData));
    const url = `${window.location.origin}/preview/draft`;
    window.open(url, "_blank");
  };

  return (
    <Layout>
      {/* New Top Bar */}
      <EditorTopBar
        surveyId={surveyId}
        isCreateMode={isCreateMode}
        title={meta.title}
        status={survey?.status}
        publishedVersion={survey?.publishedVersion || 0}
        currentVersion={survey?.currentVersion || 0}
        publicId={survey?.publicId}
        questionCount={localQuestions.length}
        onTitleChange={(title) => setMeta({ ...meta, title })}
        onPreview={handlePreview}
        onSave={handleSave}
        onPublish={handlePublish}
        onPublishBlocked={handlePublishBlocked}
        onClose={handleClose}
        onDuplicate={handleDuplicate}
        onCopyLink={handleCopyLink}
        onShare={() => setIsShareModalOpen(true)}
        isSaving={isCreating || isUpdating}
        isPublishing={isPublishing}
        isClosing={isClosing}
        isDuplicating={isDuplicating}
        isSettingsLocked={isSettingsLocked}
        isPublishBlocked={isPublishBlocked}
        hasUnpublishedChanges={hasUnpublishedChanges}
        publishBlockedReason={
          isPublishBlocked
            ? "Closed-ended surveys require at least one recipient. Go to the Recipients tab to add recipients before publishing."
            : ""
        }
        hasChanges={hasUnsavedChanges}
        isWhitelistEnabled={meta.isWhitelistEnabled}
        totalRecipients={totalRecipients}
        isSectional={meta.settings?.isSectional ?? localSections.length > 1}
        sectionCount={localSections.length}
      />
      <ShareSurveyModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        surveyTitle={meta.title || survey?.title || "survey"}
        shareUrl={shareUrl}
        preferredLogoUrl={shareQrLogoUrl}
      />

      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 px-2 sm:px-4 lg:px-0">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextTab = resolveTab(value);
            navigate({
              search: (prev) => ({ ...prev, tab: nextTab }),
            });
          }}
        >
          <div className="w-full my-2">
            <TabsList className="border border-border/90 shadow-xs bg-card w-full md:w-fit flex flex-col sm:flex-row flex-wrap sm:flex-nowrap items-stretch overflow-visible gap-1 md:gap-2 p-1 rounded-md group-data-[orientation=horizontal]/tabs:h-auto sm:group-data-[orientation=horizontal]/tabs:h-12">
              <TabsTrigger
                className="shrink-0 flex-none h-auto text-xs sm:text-sm px-3 py-2 md:px-4 md:py-2 w-full sm:w-auto justify-start sm:justify-center relative border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                value="edit"
              >
                Editor
                {hasEditorChanges && (
                  <span className="ml-1.5 inline-block w-2 h-2 bg-amber-500 ring-1 ring-background rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger
                className="shrink-0 flex-none h-auto text-xs sm:text-sm px-3 py-2 md:px-4 md:py-2 w-full sm:w-auto justify-start sm:justify-center relative border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                value="settings"
              >
                Settings
                {hasSettingsChanges && (
                  <span className="ml-1.5 inline-block w-2 h-2 bg-amber-500 ring-1 ring-background rounded-full" />
                )}
              </TabsTrigger>
              {!isCreateMode && (
                <TabsTrigger
                  className="shrink-0 flex-none h-auto text-xs sm:text-sm px-3 py-2 md:px-4 md:py-2 w-full sm:w-auto justify-start sm:justify-center border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                  value="recipients"
                >
                  Recipients
                </TabsTrigger>
              )}
              {!isCreateMode && !isDraft && (
                <TabsTrigger
                  className="shrink-0 flex-none h-auto text-xs sm:text-sm px-3 py-2 md:px-4 md:py-2 w-full sm:w-auto justify-start sm:justify-center border border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary"
                  value="responses"
                >
                  Responses
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="edit" className="space-y-4 md:space-y-5">
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-4 md:space-y-5"
            >
              {/* Warning for editing published surveys */}
              {/* {isPublished && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    <strong>Note:</strong> This survey is published and
                    accepting responses.
                    {hasUnpublishedChanges ? (
                      <>
                        {" "}
                        You have unpublished changes. Click{" "}
                        <strong>'Publish'</strong> to update the live survey.
                      </>
                    ) : (
                      <>
                        {" "}
                        Changes you make will create a new version. Save your
                        changes, then click <strong>
                          'Publish Changes'
                        </strong>{" "}
                        to update the live survey.
                      </>
                    )}{" "}
                    Existing responses will remain linked to their original
                    question versions.
                  </AlertDescription>
                </Alert>
              )} */}

              {/* Survey meta fields */}
              <Card className="shadow-none">
                <CardContent className="space-y-4 -mt-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Survey Title</Label>
                    <Input
                      ref={titleInputRef}
                      value={meta.title}
                      onChange={(e) => {
                        setMeta({ ...meta, title: e.target.value });
                        if (titleError) setTitleError("");
                      }}
                      placeholder="Customer Satisfaction Survey"
                      disabled={isSettingsLocked}
                      className={`text-sm sm:text-base shadow-none focus-visible:ring-0 ${titleError ? "border-red-500 focus-visible:border-red-500" : "focus-visible:!border-primary"}`}
                    />
                    {titleError && (
                      <p className="text-xs text-red-600">{titleError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Description (Optional)
                    </Label>
                    <MarkdownEditor
                      value={meta.description}
                      onChange={(value) =>
                        setMeta({ ...meta, description: value })
                      }
                      placeholder="Help us understand your experience with our service"
                      disabled={isSettingsLocked}
                    />
                    <div className="flex justify-end text-xs text-muted-foreground">
                      <span>
                        {getRichTextPlainText(meta.description || "").length}
                        /5000
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document-Style Section Editor */}
              <EditorMainCanvas>
                {localSections.length > 0 || localQuestions.length > 0 ? (
                  <DocumentStyleSectionList
                    sections={sortSectionsByOrder(
                      localSections.filter(
                        (section) => !hiddenSections.has(section.id)
                      )
                    )}
                    allSections={sortSectionsByOrder(localSections)}
                    questions={localQuestions}
                    visibilityRules={localVisibilityRules}
                    sectionJumpMap={sectionJumpMap}
                    sectionJumpSourceMap={sectionJumpSourceMap}
                    hasConditionalSectionVisibility={
                      hasConditionalSectionVisibility
                    }
                    onSectionJumpChange={handleSectionJumpChange}
                    expandedSections={expandedSections}
                    hiddenSections={hiddenSections}
                    filterMode={filterMode}
                    onToggleSection={toggleSection}
                    onUpdateSection={updateSection}
                    onSaveSection={handleSectionSave}
                    onCancelSection={handleSectionCancel}
                    sectionDirtyMap={sectionDirtyMap}
                    savingSectionIds={savingSectionIds}
                    onDeleteSection={deleteSection}
                    onDuplicateSection={duplicateSection}
                    onMoveSectionUp={moveSectionUp}
                    onMoveSectionDown={moveSectionDown}
                    onMergeSectionWithAbove={mergeSectionWithAbove}
                    onToggleVisibility={handleToggleVisibility}
                    onSectionLogicClick={handleSectionLogic}
                    onToggleSectionalMode={toggleSectionalMode}
                    onAddSection={addSection}
                    onAddSectionFromTemplate={addSectionFromTemplate}
                    onAddQuestion={handleAddQuestionToSection}
                    onReorderSections={handleReorderSections}
                    onFilterChange={handleFilterChange}
                    onExpandAll={handleExpandAll}
                    onCollapseAll={handleCollapseAll}
                    expandedQuestions={expandedQuestions}
                    onToggleQuestionExpanded={toggleQuestionExpanded}
                    isSectional={
                      meta.settings?.isSectional ?? localSections.length > 1
                    }
                    readonly={isSettingsLocked}
                  >
                    {(section) => (
                      <QuestionList
                        questions={localQuestions}
                        sectionId={section.id}
                        sections={localSections}
                        onUpdateQuestion={updateQuestion}
                        onDeleteQuestion={deleteQuestion}
                        onDuplicateQuestion={duplicateQuestion}
                        onMoveQuestionToSection={moveQuestionToSection}
                        onAddQuestion={addQuestionToSection}
                        onReorderQuestions={handleReorderQuestions}
                        onOptionLogicChange={setOptionLogic}
                        getOptionLogic={getOptionLogic}
                        visibilityCondition={getVisibilityCondition}
                        onVisibilityChange={handleVisibilityChange}
                        hiddenQuestions={hiddenQuestions}
                        onToggleQuestionVisibility={toggleQuestionVisibility}
                        onUnhideAllInSection={unhideAllQuestionsInSection}
                        expandedStates={expandedQuestions}
                        onToggleExpanded={toggleQuestionExpanded}
                        missingTitleIds={missingTitleIds}
                        highlightedQuestionId={highlightedQuestionId}
                        selectedQuestionId={selectedQuestionId}
                        onSelectQuestion={setSelectedQuestionId}
                        readonly={isSettingsLocked}
                        isSectional={
                          meta.settings?.isSectional ?? localSections.length > 1
                        }
                      />
                    )}
                  </DocumentStyleSectionList>
                ) : (
                  <EmptySectionState
                    onAddSection={addSection}
                    onAddSectionFromTemplate={addSectionFromTemplate}
                    onAddQuestionDirectly={addQuestionDirectly}
                    readonly={isSettingsLocked}
                  />
                )}
              </EditorMainCanvas>
            </Motion.div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 md:space-y-6">
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-4 md:space-y-6"
            >
              {/* Response Settings */}
              <Card className={"shadow-none"}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {/* <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <SettingsIcon className="h-5 w-5 text-blue-600" />
                  </div> */}
                    <div>
                      <CardTitle>Response Settings</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Control who can respond and how the survey behaves.
                        {!isSettingsLocked &&
                          " Changes apply when you save the survey."}
                        {isSettingsLocked &&
                          " Settings are locked for closed surveys."}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={"-mt-3"}>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-muted/40 px-3 sm:px-4 py-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5 h-9 w-9 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Survey Type</p>
                          <p className="text-xs text-muted-foreground">
                            Closed-ended: Only approved recipients. Open-ended:
                            Anyone with link.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tabs
                          value={meta.isWhitelistEnabled ? "closed" : "open"}
                          onValueChange={(value) => {
                            if (isSettingsLocked) return;
                            setMeta((m) => ({
                              ...m,
                              isWhitelistEnabled: value === "closed",
                            }));
                          }}
                        >
                          <TabsList className="h-8 border border-border bg-muted/40">
                            <TabsTrigger
                              value="closed"
                              disabled={isSettingsLocked}
                              className="text-xs px-2.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              Closed-ended
                            </TabsTrigger>
                            <TabsTrigger
                              value="open"
                              disabled={isSettingsLocked}
                              className="text-xs px-2.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              Open-ended
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-muted/40 px-3 sm:px-4 py-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5 h-9 w-9 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Show Progress</p>
                          <p className="text-xs text-muted-foreground">
                            Display question progress indicator (client-side
                            only).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tabs
                          value={meta.showProgress ? "yes" : "no"}
                          onValueChange={(value) => {
                            if (isSettingsLocked) return;
                            setMeta((m) => ({
                              ...m,
                              showProgress: value === "yes",
                            }));
                          }}
                        >
                          <TabsList className="h-8 border border-border bg-muted/40">
                            <TabsTrigger
                              value="yes"
                              disabled={isSettingsLocked}
                              className="text-xs px-2.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              Yes
                            </TabsTrigger>
                            <TabsTrigger
                              value="no"
                              disabled={isSettingsLocked}
                              className="text-xs px-2.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              No
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-muted/40 px-3 sm:px-4 py-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5 h-9 w-9 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            One Response Per Recipient
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Prevent duplicate submissions from the same
                            recipient.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tabs
                          value={
                            meta.oneResponsePerRecipient ? "single" : "multiple"
                          }
                          onValueChange={(value) => {
                            if (isSettingsLocked) return;
                            setMeta((m) => ({
                              ...m,
                              oneResponsePerRecipient: value === "single",
                            }));
                          }}
                        >
                          <TabsList className="h-8 border border-border bg-muted/40">
                            <TabsTrigger
                              value="single"
                              disabled={isSettingsLocked}
                              className="text-xs px-2.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              Single
                            </TabsTrigger>
                            <TabsTrigger
                              value="multiple"
                              disabled={isSettingsLocked}
                              className="text-xs px-2.5 border border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              Multiple
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branding */}
              <Card className={"shadow-none"}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {/* <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-purple-600" />
                  </div> */}
                    <div>
                      <CardTitle>Branding</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Match workspace branding while allowing survey-level
                        overrides.
                        {isCreateMode &&
                          company &&
                          " (Inheriting workspace defaults)"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={"-mt-3"}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 border-t pt-4">
                    {/* Logo Upload Section - Using LogoUploader Component */}
                    <LogoUploader
                      size="md"
                      logoUrl={displayLogoUrl}
                      fallbackInitials={logoFallbackInitials}
                      title="Survey Logo"
                      isUploading={isUploadingSurveyLogo}
                      isDeleting={isDeletingSurveyLogo}
                      uploadProgress={uploadProgress}
                      onUploadClick={handleLogoUploadClick}
                      onPreviewClick={() =>
                        displayLogoUrl && setShowLogoPreview(true)
                      }
                      onDeleteClick={() => setShowDeleteLogoConfirm(true)}
                      buttonLayout="bottom"
                      showDetailedGuidelines={true}
                      showFallbackBanner={!meta.logo && companyLogoUrlWithCache}
                      fallbackBannerContent={
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">
                                Using Workspace Default
                              </p>
                              <p className="text-xs text-muted-foreground">
                                This survey currently displays your workspace
                                logo. Upload a custom logo above to override it
                                for this specific survey.
                              </p>
                            </div>
                          </div>
                        </div>
                      }
                    />

                    {/* Hidden File Inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCompanyLogoUpload}
                    />

                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        Primary Color
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: meta.themeColor }}
                        />
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={meta.themeColor}
                            onChange={(e) =>
                              setMeta({ ...meta, themeColor: e.target.value })
                            }
                            className="w-14 h-14 rounded-lg cursor-pointer shadow-sm"
                            disabled={isSettingsLocked}
                            title="Choose primary color"
                          />
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center border border-border">
                            <Palette className="h-2.5 w-2.5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <Input
                            value={meta.themeColor}
                            onChange={(e) =>
                              setMeta({ ...meta, themeColor: e.target.value })
                            }
                            className=" text-sm"
                            disabled={isSettingsLocked}
                            placeholder="#10B981"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Used for buttons and headers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AlertDialog
                    open={showLogoPreview}
                    onOpenChange={setShowLogoPreview}
                  >
                    <AlertDialogContent className="max-w-3xl">
                      <AlertDialogHeader className="relative">
                        <AlertDialogTitle className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          Logo Preview
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Full-size view of your survey logo.
                        </AlertDialogDescription>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-8 w-8 border-primary border hover:bg-primary/10"
                          onClick={() => setShowLogoPreview(false)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogHeader>

                      <div className="w-full space-y-4">
                        <div className="relative w-full min-h-[400px] max-h-[70vh] rounded-lg border-2 border-border bg-muted/40 flex items-center justify-center p-8">
                          {displayLogoUrl ? (
                            <>
                              <img
                                src={displayLogoUrl}
                                alt="Survey logo preview"
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display =
                                      "block";
                                  }
                                }}
                              />
                              <div className="hidden absolute inset-0 items-center justify-center text-center">
                                <div>
                                  <p className="text-lg font-medium text-foreground mb-2">
                                    Logo failed to load
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Please try uploading again
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center space-y-3">
                              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-2xl font-bold">
                                {logoFallbackInitials || "SV"}
                              </div>
                              <p className="text-muted-foreground">
                                No logo uploaded
                              </p>
                            </div>
                          )}
                        </div>
                        {displayLogoUrl && (
                          <div className="text-xs text-muted-foreground">
                            Recommended: 256x256px
                          </div>
                        )}
                      </div>
                      <AlertDialogFooter className="justify-end">
                        <Button
                          variant="outline"
                          onClick={handleLogoUploadClick}
                          disabled={isUploadingSurveyLogo || isDeletingSurveyLogo}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Upload New Logo
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog
                    open={showDeleteLogoConfirm}
                    onOpenChange={setShowDeleteLogoConfirm}
                  >
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove survey logo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the current survey logo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteLogoConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={isDeletingSurveyLogo}
                          onClick={async () => {
                            await handleLogoRemove();
                            setShowDeleteLogoConfirm(false);
                          }}
                        >
                          {isDeletingSurveyLogo ? "Removing..." : "Remove Logo"}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="space-y-3 pt-6 border-t">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Default Thank You Message
                      <span className="text-xs text-muted-foreground">
                        (Optional)
                      </span>
                    </label>
                    <MarkdownEditor
                      value={meta.thankYouMessage}
                      onChange={(value) =>
                        setMeta({ ...meta, thankYouMessage: value })
                      }
                      placeholder="Thank you for completing this survey!"
                      disabled={isSettingsLocked}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Shown to respondents after survey completion</span>
                      <span className="">
                        {getRichTextPlainText(meta.thankYouMessage || "").length}
                        /2000
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Motion.div>
          </TabsContent>
          {!isCreateMode && (isPublished || isClosed) && (
            <TabsContent value="responses" className="space-y-4">
              {activeTab === "responses" && (
                <Motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <SurveyAnalytics
                    surveyId={surveyId}
                    survey={survey}
                    enabled={activeTab === "responses"}
                  />
                </Motion.div>
              )}
            </TabsContent>
          )}

          {/* Recipients tab */}
          {!isCreateMode && (
            <TabsContent value="recipients" className="space-y-4">
              {activeTab === "recipients" && (
                <Motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <RecipientsList
                    surveyId={surveyId}
                    surveyTitle={survey?.title}
                    surveyPublicId={survey?.publicId}
                    surveyStatus={survey?.status}
                    stats={recipientStats}
                    onAddRecipient={() => setAddRecipientOpen(true)}
                    onUploadCSV={() => setUploadRecipientsOpen(true)}
                    onExportRecipients={() => exportRecipients(surveyId)}
                    exportingRecipients={exportingRecipients}
                  />

                  <AddRecipientDialog
                    open={addRecipientOpen}
                    onOpenChange={setAddRecipientOpen}
                    surveyId={surveyId}
                  />

                  <UploadRecipientsDialog
                    open={uploadRecipientsOpen}
                    onOpenChange={setUploadRecipientsOpen}
                    surveyId={surveyId}
                  />
                </Motion.div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Contextual Side Panel */}
      <EditorSidePanel
        isOpen={sidePanelOpen}
        onClose={closeSidePanel}
        selectedEntity={selectedEntity}
      >
        {selectedEntity && selectedEntity.type === "question" && (
          <QuestionSettingsPanel
            question={{
              ...selectedEntity.data,
              visibilityConditions:
                selectedEntity.data.visibilityConditions ??
                getVisibilityCondition(selectedEntity.data.id),
            }}
            allQuestions={localQuestions}
            readonly={!canEdit}
            onChange={(updates) =>
              updateQuestion(selectedEntity.data.id, updates)
            }
            onVisibilityChange={handleVisibilityChange}
          />
        )}
        {selectedEntity && selectedEntity.type === "section" && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Section settings and logic will appear here
            </p>
          </div>
        )}
      </EditorSidePanel>
    </Layout>
  );
}
