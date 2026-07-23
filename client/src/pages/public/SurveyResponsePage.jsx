import { useState, useMemo, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import {
  usePublicSurvey,
  useSaveResponseProgress,
  useSubmitResponse,
  useValidateAccess,
} from "../../lib/queries";
import { WhitelistGate } from "../../components/public/WhitelistGate";
import { ResponseForm } from "../../components/public/ResponseForm";
import { Footer } from "../../components/layouts/Footer";
import { CheckCircle, Home, X } from "lucide-react";
import { ErrorPage } from "../../components/shared/ErrorPage";
import { Button } from "../../components/ui/button";
import { motion } from "framer-motion";
import { RichTextContent } from "../../components/shared/RichTextContent";
import { getApiErrorMessage } from "../../lib/utils/apiMessages";
import {
  ALREADY_COMPLETED_MESSAGE,
  CLOSED_SURVEY_DESCRIPTION,
  isAlreadyCompletedMessage,
  isClosedSurveyMessage,
} from "../../lib/utils/respondentAccess";

/**
 * Survey Response Page
 * Public survey for respondents
 * Supports mode: "live" (default), "preview", "test"
 */

export function SurveyResponsePage({ mode = "live" }) {
  const handleCloseWindow = () => {
    try {
      window.close();
    } catch {
      // no-op: fall back below
    }

    // Browsers often block window.close() unless the tab was script-opened.
    window.setTimeout(() => {
      if (window.closed) return;
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.replace("/");
    }, 120);
  };

  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;

    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      root.style.colorScheme = previousColorScheme;
      if (hadDarkClass) {
        root.classList.add("dark");
      }
    };
  }, []);

  const { publicId } = useParams({ from: "/r/$publicId" });
  const [identifier, setIdentifier] = useState(null);
  const [accessState, setAccessState] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCompletedView, setAlreadyCompletedView] = useState(false);
  const [linkAccessAttempted, setLinkAccessAttempted] = useState(false);
  const [linkAccessError, setLinkAccessError] = useState(null);
  const [sessionStartedAt] = useState(() => new Date().toISOString());
  const recipientId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid");
    return rid && rid.trim().length > 0 ? rid.trim() : null;
  }, []);
  const resumeDraft = accessState?.resume || null;
  const effectiveRecipientId = accessState?.recipientId || recipientId;
  const responseStartedAt = resumeDraft?.startedAt || sessionStartedAt;
  const respondentScope = useMemo(() => {
    const normalizedIdentifier =
      typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
    const rawScope = effectiveRecipientId || normalizedIdentifier || "anon";
    return encodeURIComponent(rawScope);
  }, [effectiveRecipientId, identifier]);
  const hasRespondentIdentity = useMemo(() => {
    const normalizedIdentifier =
      typeof identifier === "string" ? identifier.trim() : "";
    return Boolean(effectiveRecipientId || normalizedIdentifier);
  }, [effectiveRecipientId, identifier]);
  const storageKey = useMemo(
    () => `survey_response_${publicId}_${respondentScope}`,
    [publicId, respondentScope]
  );

  // Check for reset parameter to allow viewing survey again
  const shouldReset = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reset") === "1" || params.get("view") === "1";
  }, []);

  // Clear localStorage if reset parameter is present
  useEffect(() => {
    if (shouldReset) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore storage failures
      }
    }
  }, [shouldReset, storageKey]);

  const { data: survey, isLoading, error } = usePublicSurvey(publicId, mode);
  const { mutate: validateAccess, isPending: isValidatingAccess } =
    useValidateAccess();
  const { mutate: saveResponseProgress } = useSaveResponseProgress();
  const { mutate: submitResponse, isPending } = useSubmitResponse(mode);
  const isAlreadyCompletedError = isAlreadyCompletedMessage(linkAccessError);
  const isClosedSurveyError = isClosedSurveyMessage(linkAccessError);
  const isSurveyClosed = survey?.status === "closed";
  const isResolvingRecipientAccess =
    mode === "live" &&
    survey?.status === "published" &&
    survey?.isWhitelistEnabled &&
    !!recipientId &&
    !accessState &&
    (isValidatingAccess || !linkAccessAttempted);

  const applyAccessState = (validatedIdentifier, result) => {
    setLinkAccessError(null);
    setAccessState(result || null);
    setIdentifier(validatedIdentifier?.trim() || null);

    if (
      !shouldReset &&
      survey?.oneResponsePerRecipient &&
      result?.responseStatus === "completed"
    ) {
      setAlreadyCompletedView(true);
    }
  };

  useEffect(() => {
    if (
      mode !== "live" ||
      survey?.status !== "published" ||
      !survey?.isWhitelistEnabled ||
      !recipientId ||
      accessState ||
      linkAccessAttempted
    ) {
      return;
    }

    setLinkAccessAttempted(true);
    validateAccess(
      { publicId, recipientId },
      {
        onSuccess: (result) => {
          applyAccessState(null, result);
        },
        onError: (requestError) => {
          const message = getApiErrorMessage(
            requestError,
            "Unable to validate this recipient link."
          );
          if (isAlreadyCompletedMessage(message)) {
            setAlreadyCompletedView(true);
            setAccessState({ responseStatus: "completed" });
            return;
          }
          setLinkAccessError(message);
        },
      }
    );
  }, [
    mode,
    survey?.isWhitelistEnabled,
    recipientId,
    accessState,
    linkAccessAttempted,
    validateAccess,
    publicId,
    survey?.oneResponsePerRecipient,
    shouldReset,
  ]);

  const previouslySubmitted = useMemo(() => {
    if (shouldReset) return false; // Bypass check if reset parameter is present
    if (!(survey?.oneResponsePerRecipient && mode === "live")) return false;
    let storedSubmitted = false;
    try {
      storedSubmitted = localStorage.getItem(storageKey) === "submitted";
    } catch {
      storedSubmitted = false;
    }
    if (hasRespondentIdentity) {
      return accessState?.responseStatus === "completed" || storedSubmitted;
    }
    return storedSubmitted;
  }, [
    shouldReset,
    survey?.oneResponsePerRecipient,
    mode,
    hasRespondentIdentity,
    accessState?.responseStatus,
    storageKey,
  ]);

  useEffect(() => {
    if (submitted || shouldReset) return;
    if (!(survey?.oneResponsePerRecipient && mode === "live")) return;
    try {
      if (localStorage.getItem(storageKey) === "submitted") {
        setSubmitted(true);
      }
    } catch {
      // ignore storage failures
    }
  }, [
    submitted,
    shouldReset,
    survey?.oneResponsePerRecipient,
    mode,
    storageKey,
  ]);

  const handleAccessGranted = (validatedIdentifier, result) => {
    applyAccessState(validatedIdentifier, result);
  };

  const handleAlreadyCompletedAccess = (validatedIdentifier) => {
    setLinkAccessError(null);
    setIdentifier(validatedIdentifier?.trim() || null);
    setAlreadyCompletedView(true);
    setAccessState((prev) => ({
      ...(prev || {}),
      responseStatus: "completed",
    }));
  };

  const handleWhitelistAccessError = (message) => {
    setLinkAccessError(message || "Unable to validate this survey access.");
  };

  const handleSaveProgress = (answers, progressState = {}) => {
    if (mode !== "live" || !hasRespondentIdentity) return;

    const payload = {
      answers,
      startedAt: responseStartedAt,
      ...(effectiveRecipientId ? { recipientId: effectiveRecipientId } : {}),
      ...(identifier ? { identifier } : {}),
      ...(progressState.visitedSectionIds?.length
        ? { visitedSectionIds: progressState.visitedSectionIds }
        : undefined),
      ...(progressState.visitedQuestionIds?.length
        ? { visitedQuestionIds: progressState.visitedQuestionIds }
        : undefined),
      ...(progressState.navigation
        ? { navigation: progressState.navigation }
        : undefined),
    };

    saveResponseProgress(
      { publicId, data: payload },
      {
        onSuccess: (result) => {
          setAccessState((prev) =>
            prev
              ? {
                  ...prev,
                  responseStatus: result?.responseStatus || "in_progress",
                  resume: {
                    ...(prev.resume || {}),
                    answers,
                    navigation: progressState.navigation || prev.resume?.navigation,
                    responseStatus: result?.responseStatus || "in_progress",
                    lastSavedAt: result?.lastSavedAt || prev.resume?.lastSavedAt,
                    progress: result?.progress || prev.resume?.progress,
                    journey: result?.journey || prev.resume?.journey,
                    startedAt: responseStartedAt,
                  },
                }
              : prev
          );
        },
        onError: (requestError) => {
          const message = getApiErrorMessage(
            requestError,
            "Failed to save progress"
          );
          if (isAlreadyCompletedMessage(message)) {
            setAccessState((prev) =>
              prev
                ? {
                    ...prev,
                    responseStatus: "completed",
                  }
                : {
                    responseStatus: "completed",
                  }
            );
            return;
          }
          if (isClosedSurveyMessage(message)) {
            setLinkAccessError(message);
          }
        },
      }
    );
  };

  const handleSubmit = (
    answers,
    { visitedSectionIds, visitedQuestionIds, navigation } = {}
  ) => {
    const payload = {
      answers,
      mode,
      startedAt: responseStartedAt,
      ...(effectiveRecipientId ? { recipientId: effectiveRecipientId } : {}),
      ...(identifier ? { identifier } : {}),
      ...(visitedSectionIds?.length ? { visitedSectionIds } : undefined),
      ...(visitedQuestionIds?.length ? { visitedQuestionIds } : undefined),
      ...(navigation ? { navigation } : undefined),
    };

    submitResponse(
      { publicId, data: payload },
      {
        onSuccess: () => {
          setAlreadyCompletedView(false);
          setSubmitted(true);
          setAccessState((prev) =>
            prev
              ? {
                  ...prev,
                  responseStatus: "completed",
                  resume: {
                    ...(prev.resume || {}),
                    responseStatus: "completed",
                  },
                }
              : prev
          );
          if (
            survey?.oneResponsePerRecipient &&
            mode === "live" &&
            hasRespondentIdentity
          ) {
            try {
              localStorage.setItem(storageKey, "submitted");
            } catch {
              // ignore storage failures
            }
          }
        },
        onError: (requestError) => {
          const message = getApiErrorMessage(
            requestError,
            "Failed to submit response"
          );
          if (isClosedSurveyMessage(message)) {
            setLinkAccessError(message);
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto" />
            <p className="text-sm text-slate-500">Loading survey...</p>
          </div>
        </div>
        <Footer variant="minimal" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorPage
        error={error}
        title="Unable to load survey"
        homeTo="/"
        secondaryLabel="Go home"
      />
    );
  }

  if (isSurveyClosed || isClosedSurveyError) {
    return (
      <ErrorPage
        title="Survey is closed"
        description={CLOSED_SURVEY_DESCRIPTION}
        showRetry={false}
        homeTo="/"
        secondaryLabel="Go home"
      />
    );
  }

  if (linkAccessError && !isAlreadyCompletedError) {
    return (
      <ErrorPage
        error={{ response: { data: { status: { message: linkAccessError } } } }}
        title="Unable to verify recipient"
        homeTo="/"
        secondaryLabel="Go home"
      />
    );
  }

  if (isResolvingRecipientAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto" />
            <p className="text-sm text-slate-500">Loading your saved progress...</p>
          </div>
        </div>
        <Footer variant="minimal" />
      </div>
    );
  }

  if (submitted || previouslySubmitted) {
    const themeColor = survey?.themeColor || "#10B981";
    const isAlreadyCompletedState =
      alreadyCompletedView || (!submitted && previouslySubmitted);
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 md:p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.15,
                }}
              >
                <CheckCircle
                  className="h-14 w-14 mx-auto mb-4"
                  style={{ color: themeColor }}
                />
              </motion.div>
              <RichTextContent
                className="markdown-editor-content mb-3 text-xl font-bold text-gray-900 sm:text-2xl [&_p]:m-0"
                value={
                  isAlreadyCompletedState
                    ? "Already Completed"
                    : mode === "test"
                    ? "Test Submitted!"
                    : survey?.thankYouMessage || "Thank you!"
                }
              />
              <p className="text-sm text-gray-600 mb-4">
                {isAlreadyCompletedState
                  ? ALREADY_COMPLETED_MESSAGE
                  : mode === "preview"
                  ? "Your preview was validated successfully. No responses were saved."
                  : mode === "test"
                    ? "Your test response was submitted and will be excluded from analytics."
                    : "Your response has been submitted successfully."}
              </p>
              <div
                className="w-full max-w-xs mx-auto h-1 rounded-full mb-6"
                style={{
                  background: `linear-gradient(to right, ${themeColor}, ${themeColor}88)`,
                }}
              />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                  className="w-full sm:w-auto"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button> */}
                <Button
                  variant="default"
                  onClick={handleCloseWindow}
                  className="w-full sm:w-auto"
                  style={{
                    backgroundColor: themeColor,
                    borderColor: themeColor,
                    color: "#ffffff",
                  }}
                >
                  Close Window
                </Button>
              </div>
            </motion.div>
            <p className="mt-4 text-xs text-gray-400">
              Powered by{" "}
              <span className="font-semibold text-gray-500">
                surveytool.co
              </span>
            </p>
          </div>
        </div>
        <Footer variant="minimal" />
      </div>
    );
  }

  // Closed-ended surveys: allow direct access via recipient link, otherwise require whitelist validation.
  if (survey.isWhitelistEnabled && !accessState && !recipientId) {
    return (
      <WhitelistGate
        survey={survey}
        publicId={publicId}
        onAccessGranted={handleAccessGranted}
        onAlreadyCompleted={handleAlreadyCompletedAccess}
        onAccessError={handleWhitelistAccessError}
      />
    );
  }

  // Show response form
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <ResponseForm
          survey={survey}
          onSubmit={handleSubmit}
          onSaveProgress={hasRespondentIdentity ? handleSaveProgress : undefined}
          isSubmitting={isPending}
          mode={mode}
          storageScope={respondentScope}
          initialDraft={resumeDraft}
        />
      </div>
      <Footer variant="minimal" />
    </div>
  );
}
