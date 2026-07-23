import { useState, useEffect, useRef } from "react";
import { CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { ResponseForm } from "../../components/public/ResponseForm";
import { Footer } from "../../components/layouts/Footer";
import { ErrorPage } from "../../components/shared/ErrorPage";
import { companyApi } from "../../lib/api/company";
import { normalizePreviewQuestions } from "../../lib/utils/previewQuestions";
import { motion } from "framer-motion";
import { RichTextContent } from "../../components/shared/RichTextContent";

/**
 * Draft Preview Page
 * Shows in-memory preview of unsaved/draft surveys
 */
export function DraftPreviewPage() {
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

  const [survey, setSurvey] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    // Load draft preview data from sessionStorage and company data from API
    const loadPreview = async () => {
      const previewData = sessionStorage.getItem("draftPreview");

      if (!previewData) {
        setError("No preview data found. Please open preview from the editor.");
        return;
      }

      try {
        const parsed = JSON.parse(previewData);

        // Fetch company data for logo fallback
        try {
          const companyData = await companyApi.getProfile();
          setCompany(companyData);

          // If survey doesn't have a valid logo, use company logo
          if (!parsed.logo || parsed.logo.includes("placeholder")) {
            parsed.logo = companyData?.logo || parsed.logo;
          }
        } catch (err) {
          // Non-blocking: preview still works without company fallback
          // Continue without company data
        }

        const normalizedQuestions = normalizePreviewQuestions(
          parsed.questions || []
        );
        setSurvey({
          ...parsed,
          questions: normalizedQuestions,
        });
        // Don't remove immediately - keep it for potential refreshes
        // Clean up happens on editor page when opening a new preview
      } catch {
        setError("Failed to load preview data.");
      }
    };

    loadPreview();
  }, []);

  const handleSubmit = () => {
    // Simulate submission - show completion screen
    setSubmitted(true);
  };

  // Show completion screen
  if (submitted && survey) {
    const themeColor = survey.themeColor || "#10B981";
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 flex items-center justify-center px-4 py-10 bg-linear-to-br from-slate-50 to-slate-100">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-full max-w-md bg-white rounded-2xl p-6 md:p-8 text-center"
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
                value={survey.thankYouMessage || "Thank you!"}
              />
              <p className="text-sm text-gray-600 mb-3">
                Preview complete. This simulates how your survey will look when
                submitted.
              </p>
              <div
                className="w-full max-w-xs mx-auto h-1 rounded-full mb-3"
                style={{
                  background: `linear-gradient(to right, ${themeColor}, ${themeColor}88)`,
                }}
              />
              <p className="text-xs text-gray-500">
                No responses were saved. You can close this window now.
              </p>
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

  if (error) {
    return (
      <ErrorPage
        statusCode={404}
        title="Preview unavailable"
        description={error}
        variant="warning"
        type="not_found"
        homeTo="/"
        secondaryLabel="Go home"
      />
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto" />
            <p className="text-sm text-slate-500">Loading preview...</p>
          </div>
        </div>
        <Footer variant="minimal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <ResponseForm
          survey={survey}
          onSubmit={handleSubmit}
          isSubmitting={false}
          mode="preview"
        />
      </div>
      <Footer variant="minimal" />
    </div>
  );
}
