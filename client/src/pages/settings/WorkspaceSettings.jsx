import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCompany,
  useUpdateCompany,
  useUploadLogo,
  useDeleteLogo,
} from "../../lib/queries/company";
import { workspaceSettingsSchema } from "../../lib/schemas/companySchemas";
import { useAuth } from "../../hooks/useAuth";
import { Layout } from "../../components/layouts/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { MarkdownEditor } from "../../components/editor/MarkdownEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Building2,
  Palette,
  Save,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  X,
  ShieldAlert,
  CheckCircle2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { LogoUploader } from "../../components/shared/LogoUploader";
import { RichTextContent } from "../../components/shared/RichTextContent";
import { QuestionRenderer } from "../../components/renderer/QuestionRenderer";
import { getRichTextPlainText } from "../../lib/utils/richText";

const FONTS = ["Inter", "Roboto", "Arial"];

const DEFAULT_SETTINGS = {
  name: "",
  primaryColor: "#10B981",
  secondaryColor: "#10B981",
  defaultFont: "Inter",
  thankYouMessage: "Thank you for completing this survey!",
};

const LEGACY_FONT_FALLBACKS = {
  "DM Sans": "Inter",
  Poppins: "Inter",
  "Open Sans": "Inter",
  Lato: "Inter",
};

const normalizeFontChoice = (font) => {
  if (FONTS.includes(font)) return font;
  return LEGACY_FONT_FALLBACKS[font] || "Inter";
};

const WORKSPACE_PREVIEW_QUESTION = {
  id: "workspace-preview-question",
  type: "single_choice",
  title: "How satisfied are you with the overall experience?",
  description:
    "Helper text and answer options follow the same card layout used in the respondent survey preview.",
  required: false,
  options: ["Very satisfied", "Satisfied", "Needs improvement"],
};

function WorkspaceSurveyPreview({
  formData,
  displayLogoUrl,
  onImageError,
  onSubmitPreview,
}) {
  const primaryColor = formData.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const secondaryColor =
    formData.secondaryColor || DEFAULT_SETTINGS.secondaryColor;

  return (
    <div
      className="overflow-hidden w-full rounded-2xl border border-slate-200 shadow-lg bg-linear-to-br from-slate-50 to-slate-100"
      style={{ fontFamily: formData.defaultFont }}
    >
      <div
        className="text-white py-4 sm:py-5 px-4 w-full"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-5xl">
          <div className="flex items-center gap-3 ">
            {displayLogoUrl ? (
              <div className="shrink-0 bg-white rounded-lg p-2.5">
                <img
                  src={displayLogoUrl}
                  alt="Workspace logo"
                  className="h-12 sm:h-14 max-w-55 sm:max-w-65 object-contain"
                  onError={onImageError}
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold leading-tight">
                Sample Survey Title
              </h3>
              <p className="text-sm leading-relaxed text-white/90">
                This is sample survey description text shown in the respondent
                header before they begin answering.
              </p>
              {/* <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white/90">
                <Eye className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Preview Mode:</strong> Responses will not be saved.
                </span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-5 pb-1">
        <div className="flex items-center text-xs sm:text-sm text-slate-500 mb-2">
          <span>Section: Customer Experience</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "66%",
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            }}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 sm:py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-6">
          <div className="mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Customer Experience
            </h2>
            {/* <p className="mt-0.5 text-sm text-slate-500 leading-relaxed">
              This section preview matches the compact respondent layout without
              numbered section headings.
            </p> */}
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div data-question-id={WORKSPACE_PREVIEW_QUESTION.id}>
              <div className="mb-3">
                <div className="grid grid-cols-[1.2rem_1fr] sm:grid-cols-[1.35rem_1fr] items-start gap-x-2">
                  <span className="pt-[0.32rem] text-[1.1rem] font-semibold text-slate-500 text-right leading-none">
                    1
                  </span>
                  <h3 className="text-[1.1rem] sm:text-[1.2rem] !font-medium text-slate-900 leading-snug">
                    {WORKSPACE_PREVIEW_QUESTION.title}
                  </h3>
                </div>
                {/* {WORKSPACE_PREVIEW_QUESTION.description && (
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed pl-6 sm:pl-7">
                    {WORKSPACE_PREVIEW_QUESTION.description}
                  </p>
                )} */}
              </div>

              <div className="w-full pl-6 sm:pl-7">
                <QuestionRenderer
                  question={WORKSPACE_PREVIEW_QUESTION}
                  mode="preview"
                  value=""
                  onChange={() => {}}
                  brandColor={primaryColor}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              className="text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={onSubmitPreview}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceThankYouPreview({ formData, onBackToSurvey }) {
  const primaryColor = formData.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const thankYouMessage =
    formData.thankYouMessage || DEFAULT_SETTINGS.thankYouMessage;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-linear-to-br from-slate-50 to-slate-100"
      style={{ fontFamily: formData.defaultFont }}
    >
      <div className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="w-full rounded-2xl bg-white p-6 text-center shadow-sm md:p-8">
            <CheckCircle
              className="h-14 w-14 mx-auto mb-4"
              style={{ color: primaryColor }}
            />
            <RichTextContent
              className="markdown-editor-content mb-3 text-xl font-bold text-gray-900 sm:text-2xl [&_p]:m-0"
              value={thankYouMessage}
            />
            <p className="text-sm text-gray-600 mb-3">
              Preview complete. This simulates how your survey will look when
              submitted.
            </p>
            <div
              className="w-full max-w-xs mx-auto h-1 rounded-full mb-3"
              style={{
                background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}88)`,
              }}
            />
            <p className="text-xs text-gray-500">
              No responses were saved. You can switch back to the survey preview
              at any time.
            </p>
            <div className="mt-5 flex justify-center">
              <Button type="button" variant="default" onClick={onBackToSurvey}>
                Back To Survey
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-gray-500">
              surveytool.co
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Workspace Settings Page
 * Configure company branding and defaults
 */

export function WorkspaceSettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const localLogoUrlRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSubmittedPreview, setShowSubmittedPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logoVersion, setLogoVersion] = useState(Date.now());
  const [localLogoUrl, setLocalLogoUrl] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user } = useAuth();

  const {
    data: company,
    isLoading,
    isError,
    error,
    refetch: refetchCompany,
  } = useCompany();
  const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();
  const { mutate: uploadLogo, isPending: isUploading } = useUploadLogo();
  const { mutate: deleteLogo, isPending: isDeleting } = useDeleteLogo();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: DEFAULT_SETTINGS,
  });

  const companyData = Array.isArray(company) ? company[0] : company;
  const formData = watch();

  const buildSettingsSnapshot = useCallback((values = {}, logo = "") => {
    return JSON.stringify({
      name: values.name || "",
      primaryColor: values.primaryColor || DEFAULT_SETTINGS.primaryColor,
      secondaryColor: values.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
      defaultFont: normalizeFontChoice(
        values.defaultFont || DEFAULT_SETTINGS.defaultFont,
      ),
      thankYouMessage:
        values.thankYouMessage || DEFAULT_SETTINGS.thankYouMessage,
      logo: logo || "",
    });
  }, []);

  const updateField = useCallback(
    (field, value) => {
      setValue(field, value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  useEffect(() => {
    register("primaryColor");
    register("secondaryColor");
    register("defaultFont");
    register("thankYouMessage");
  }, [register]);

  // Sync API data to form when company data loads
  useEffect(() => {
    if (company) {
      const companyData = Array.isArray(company) ? company[0] : company;

      if (companyData) {
        const formDefaults = {
          name: companyData.name || DEFAULT_SETTINGS.name,
          primaryColor:
            companyData.primaryColor || DEFAULT_SETTINGS.primaryColor,
          secondaryColor:
            companyData.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
          defaultFont: normalizeFontChoice(
            companyData.defaultFont || DEFAULT_SETTINGS.defaultFont,
          ),
          thankYouMessage:
            companyData.thankYouMessage ||
            companyData.defaultThankYouMessage ||
            DEFAULT_SETTINGS.thankYouMessage,
        };
        reset(formDefaults);
        setSavedSnapshot(
          buildSettingsSnapshot(formDefaults, companyData.logo || ""),
        );
        setHasUnsavedChanges(false);
      }
    }
  }, [company, reset, buildSettingsSnapshot]);

  useEffect(() => {
    if (!savedSnapshot) {
      setHasUnsavedChanges(false);
      return;
    }

    const currentSnapshot = buildSettingsSnapshot(
      formData,
      companyData?.logo || "",
    );
    setHasUnsavedChanges(currentSnapshot !== savedSnapshot);
  }, [formData, companyData?.logo, savedSnapshot, buildSettingsSnapshot]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const onSubmit = (data) => {
    updateCompany(data, {
      onSuccess: (result) => {
        const nextCompany = result?.data || {};
        const snapshotValues = {
          name: nextCompany.name || data.name || DEFAULT_SETTINGS.name,
          primaryColor:
            nextCompany.primaryColor ||
            data.primaryColor ||
            DEFAULT_SETTINGS.primaryColor,
          secondaryColor:
            nextCompany.secondaryColor ||
            data.secondaryColor ||
            DEFAULT_SETTINGS.secondaryColor,
          defaultFont: normalizeFontChoice(
            nextCompany.defaultFont || data.defaultFont,
          ),
          thankYouMessage:
            nextCompany.thankYouMessage ||
            nextCompany.defaultThankYouMessage ||
            data.thankYouMessage ||
            DEFAULT_SETTINGS.thankYouMessage,
        };
        const nextLogo = nextCompany.logo ?? companyData?.logo ?? "";
        setSavedSnapshot(buildSettingsSnapshot(snapshotValues, nextLogo));
        setHasUnsavedChanges(false);
      },
    });
  };

  const handleDeleteLogo = () => {
    deleteLogo(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setShowPreview(false);
        setLogoVersion(Date.now());
        if (localLogoUrlRef.current) {
          URL.revokeObjectURL(localLogoUrlRef.current);
          localLogoUrlRef.current = null;
        }
        setLocalLogoUrl("");
      },
      onError: () => setShowDeleteConfirm(false),
    });
  };
  const companyInitials =
    (companyData?.name || "Workspace")
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "WS";

  const logoUrl = React.useMemo(() => {
    if (!companyData?.logo) return "";
    if (companyData.logo.startsWith("http")) return companyData.logo;
    const baseUrl = import.meta.env.VITE_API_URL || "";
    return `${baseUrl}${companyData.logo}`;
  }, [companyData?.logo]);

  const logoUrlWithCache = logoUrl
    ? `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}v=${logoVersion}`
    : "";

  const displayLogoUrl = localLogoUrl || logoUrlWithCache;

  useEffect(() => {
    if (companyData?.logo && localLogoUrl) {
      if (localLogoUrlRef.current) {
        URL.revokeObjectURL(localLogoUrlRef.current);
        localLogoUrlRef.current = null;
      }
      setLocalLogoUrl("");
    }
  }, [companyData?.logo, localLogoUrl]);

  const placeholderGradient = React.useMemo(() => {
    const name = companyData?.name || "Workspace";
    const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const hue = hash % 360;
    const secondHue = (hue + 40) % 360;
    return `linear-gradient(135deg, hsla(${hue}, 75%, 94%, 1) 0%, hsla(${secondHue}, 78%, 88%, 1) 100%)`;
  }, [companyData?.name]);

  const handleImageError = useCallback((e) => {
    e.currentTarget.style.display = "none";
  }, []);

  // Also update the handleLogoUpload function for better error handling:
  const handleLogoUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset file input
      e.target.value = "";

      // Validate file size
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error("File too large", {
          description:
            "Maximum file size is 5MB. Please choose a smaller file.",
        });
        return;
      }

      // Validate file type
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

      // Check image dimensions (optional)
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        if (width > 2048 || height > 2048) {
          toast.warning("Large image detected", {
            description:
              "For best performance, we recommend using images under 2048×2048px.",
          });
        }

        // Start upload with progress
        setUploadProgress(0);
        uploadLogo(
          {
            file,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                );
                setUploadProgress(percentCompleted);
              }
            },
          },
          {
            onSuccess: () => {
              setUploadProgress(100);
              setTimeout(() => setUploadProgress(0), 1000);
              setLogoVersion(Date.now());

              // Clear local preview URL and refetch company data
              if (localLogoUrlRef.current) {
                URL.revokeObjectURL(localLogoUrlRef.current);
                localLogoUrlRef.current = null;
              }
              setLocalLogoUrl("");
              refetchCompany();
            },
            onError: () => {
              setUploadProgress(0);
            },
            onSettled: () => {
              // Clean up
            },
          },
        );
      };
      img.onerror = () => {
        toast.error("Invalid image file", {
          description: "The selected file doesn't appear to be a valid image.",
        });
      };
      img.src = URL.createObjectURL(file);
    },
    [uploadLogo, refetchCompany],
  );
  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto text-center space-y-4 py-12">
          <p className="text-red-600 font-semibold">
            Failed to load workspace settings.
          </p>
          <p className="text-sm text-muted-foreground">
            {error?.response?.data?.status?.message || error?.message}
          </p>
          <Button onClick={() => refetchCompany()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-4 relative">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-card py-4 px-6 rounded-lg border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/surveys" })}
              className={
                "bg-primary/10 hover:bg-primary/15 text-foreground hover:scale-110 transition-all duration-200"
              }
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure your workspace branding and defaults
              </p>
            </div>
          </div>

          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={
              isUpdating || user?.role !== "admin" || !hasUnsavedChanges
            }
            className="w-full sm:w-auto relative"
          >
            {hasUnsavedChanges && !isUpdating && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
            )}
            <Save className="h-4 w-4 mr-2" />
            {isUpdating
              ? "Saving..."
              : hasUnsavedChanges
                ? "Save Changes"
                : "Saved"}
          </Button>
        </div>

        {/* Admin Warning */}
        {user?.role !== "admin" && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              You need admin privileges to modify workspace settings. Please
              contact your workspace administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* Company Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Company Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                {...register("name")}
                placeholder="Acme Surveys"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Logo Upload Section - Using LogoUploader Component */}
            <LogoUploader
              size="md"
              logoUrl={displayLogoUrl}
              fallbackInitials={companyInitials}
              title="Logo"
              isUploading={isUploading}
              isDeleting={isDeleting}
              uploadProgress={uploadProgress}
              onUploadClick={() => fileInputRef.current?.click()}
              onPreviewClick={() => companyData?.logo && setShowPreview(true)}
              onDeleteClick={() =>
                companyData?.logo && setShowDeleteConfirm(true)
              }
              buttonLayout="bottom"
              showDetailedGuidelines={true}
            />

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader className="relative">
              <AlertDialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo Preview
              </AlertDialogTitle>
              <AlertDialogDescription>
                Full-size view of your company logo.
              </AlertDialogDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-8 w-8 border-primary border hover:bg-primary/10"
                onClick={() => setShowPreview(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogHeader>

            <div className="w-full space-y-4">
              {/* Logo Display */}
              <div className="relative w-full min-h-[400px] max-h-[70vh] rounded-lg border-2 border-border bg-muted/40 flex items-center justify-center p-8">
                {companyData?.logo ? (
                  <>
                    <img
                      src={displayLogoUrl}
                      alt="Company logo preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextElementSibling.style.display = "block";
                      }}
                    />
                    {/* Fallback */}
                    <div
                      className="hidden absolute inset-0 flex items-center justify-center"
                      style={{ backgroundImage: placeholderGradient }}
                    >
                      <div className="text-center">
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
                  <div className="text-center space-y-4">
                    <div
                      className="w-32 h-32 mx-auto rounded-full flex items-center justify-center"
                      style={{ backgroundImage: placeholderGradient }}
                    >
                      <span className="text-3xl font-bold text-foreground">
                        {companyInitials}
                      </span>
                    </div>
                    <p className="text-muted-foreground">No logo uploaded</p>
                  </div>
                )}
              </div>

              {/* Logo Information */}
              {companyData?.logo && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>Recommended: 256×256px</span>
                  {/* <span className="uppercase">
                    {companyData.logo.split(".").pop()}
                  </span>
                  <span>Surveys, forms, branding</span> */}
                </div>
              )}
            </div>
            <AlertDialogFooter className="justify-end">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Upload New Logo
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove logo?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the current logo from your workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLogo}
                disabled={isDeleting}
              >
                {isDeleting ? "Removing..." : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Branding</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize colors, fonts, and default messages
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Top Row: Colors and Font Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Primary Color */}
              <div className="space-y-3">
                <Label
                  htmlFor="primaryColor"
                  className="flex items-center gap-2"
                >
                  Primary Color
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: formData.primaryColor }}
                  />
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        updateField("primaryColor", e.target.value)
                      }
                      className="w-14 h-14 rounded-lg cursor-pointer shadow-sm"
                      title="Choose primary color"
                    />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                      <Palette className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      id="primaryColor"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        updateField("primaryColor", e.target.value)
                      }
                      placeholder="#10B981"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used for buttons and headers
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-3">
                <Label
                  htmlFor="secondaryColor"
                  className="flex items-center gap-2"
                >
                  Secondary Color
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: formData.secondaryColor }}
                  />
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        updateField("secondaryColor", e.target.value)
                      }
                      className="w-14 h-14 rounded-lg cursor-pointer shadow-sm"
                      title="Choose secondary color"
                    />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                      <Palette className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      id="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        updateField("secondaryColor", e.target.value)
                      }
                      placeholder="#10B981"
                      className=" text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used for highlights and accents
                    </p>
                  </div>
                </div>
              </div>

              {/* Font Selector - Now on the same row */}
              <div className="space-y-3">
                <Label
                  htmlFor="defaultFont"
                  className="flex items-center gap-2"
                >
                  Default Font
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: formData.secondaryColor }}
                  />
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-lg border border-border bg-muted/40 flex items-center justify-center">
                      <span
                        className="text-sm text-foreground"
                        style={{ fontFamily: formData.defaultFont }}
                      >
                        Aa
                      </span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                      <Palette className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={formData.defaultFont}
                      onValueChange={(value) =>
                        updateField("defaultFont", value)
                      }
                    >
                      <SelectTrigger
                        id="defaultFont"
                        className="w-full"
                        style={{ fontFamily: formData.defaultFont }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONTS.map((font) => (
                          <SelectItem
                            key={font}
                            value={font}
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied to all surveys unless overridden
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Thank You Message - Full width below */}
            <div className="space-y-3 pt-6 border-t">
              <Label htmlFor="thankYou" className="flex items-center gap-2">
                Default Thank You Message
                <span className="text-xs text-muted-foreground">
                  (Optional)
                </span>
              </Label>
              <MarkdownEditor
                id="thankYou"
                value={formData.thankYouMessage}
                onChange={(value) => updateField("thankYouMessage", value)}
                placeholder="Thank you for completing this survey! Your feedback helps us improve."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Shown to respondents after survey completion</span>
                <span className="">
                  {getRichTextPlainText(formData.thankYouMessage || "").length}
                  /2000
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Preview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how your surveys will appear to respondents
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showSubmittedPreview ? (
              <WorkspaceThankYouPreview
                formData={formData}
                onBackToSurvey={() => setShowSubmittedPreview(false)}
              />
            ) : (
              <WorkspaceSurveyPreview
                formData={formData}
                displayLogoUrl={displayLogoUrl}
                onImageError={handleImageError}
                onSubmitPreview={() => setShowSubmittedPreview(true)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
