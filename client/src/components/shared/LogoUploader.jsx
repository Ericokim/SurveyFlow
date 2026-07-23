import React from "react";
import { ImageIcon, Upload, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

/**
 * LogoUploader - Reusable logo upload component
 * Based on Survey Details design
 */
export function LogoUploader({
  // Display
  logoUrl,
  fallbackInitials = "SV",
  title = "Logo",

  // State
  isUploading = false,
  isDeleting = false,
  uploadProgress = 0,

  // Actions
  onUploadClick,
  onPreviewClick,
  onDeleteClick,

  // Optional features
  showFallbackBanner = false,
  fallbackBannerContent,
  canDelete = true,
}) {
  const handleContainerClick = () => {
    if (!isUploading && !isDeleting && !logoUrl) {
      onUploadClick?.();
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">{title}</Label>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Logo Preview Container */}
        <div className="flex flex-col items-start md:items-center gap-4 w-full md:w-auto">
          <div className="relative group">
            {/* Logo Container */}
            <div
              className={`relative w-full max-w-[240px] md:w-48 md:max-w-none aspect-square rounded-2xl border-2 transition-all duration-300 shadow-sm ${
                logoUrl
                  ? "border-border bg-card"
                  : "border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              } ${
                isUploading || isDeleting ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() =>
                !isUploading &&
                !isDeleting &&
                !logoUrl &&
                handleContainerClick()
              }
            >
              {/* Logo or Initials */}
              {logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain p-6 rounded-2xl"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentNode.querySelector(
                        ".logo-fallback"
                      ).style.display = "flex";
                    }}
                  />
                  {/* Fallback in case image fails to load */}
                  <div className="logo-fallback absolute inset-0 hidden items-center justify-center rounded-2xl bg-muted/50">
                    <span className="text-4xl font-bold text-foreground">
                      {fallbackInitials}
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-muted/30">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <span className="text-3xl font-bold text-foreground block mb-2">
                      {fallbackInitials}
                    </span>
                    <p className="text-sm text-muted-foreground font-medium">
                      Click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      PNG, JPG, WebP
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Progress Overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons Hover Overlay */}
              {!isUploading && !isDeleting && logoUrl && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl flex items-center justify-center gap-3">
                  {/* View Button */}
                  {onPreviewClick && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-lg shadow-lg bg-white hover:bg-white/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewClick?.();
                      }}
                      disabled={!logoUrl}
                      title="Preview logo"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Upload Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="rounded-lg shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick?.();
                    }}
                    title="Replace logo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  {/* Delete Button */}
                  {onDeleteClick && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="rounded-lg shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick?.();
                      }}
                      disabled={!canDelete || isDeleting}
                      title="Remove logo"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Instructions */}
        <div className="w-full md:flex-1 space-y-4">
          <div>
            {/* Upload Actions */}
            <div className="flex flex-col gap-3 mb-4">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full sm:w-auto gap-2"
                onClick={onUploadClick}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {logoUrl ? "Replace Logo" : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {logoUrl
                  ? "Upload a new file to replace the current logo"
                  : "Add your brand logo to personalize this survey"}
              </p>
            </div>

            {/* Fallback Banner */}
            {showFallbackBanner && fallbackBannerContent && (
              <div className="mb-4">{fallbackBannerContent}</div>
            )}

            {/* Instructions */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h5 className="text-xs font-semibold text-foreground mb-2.5">
                Upload Guidelines
              </h5>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0"></span>
                  <span>
                    <strong>Formats:</strong> PNG, JPG, WebP
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0"></span>
                  <span>
                    <strong>Max size:</strong> 5MB
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground shrink-0"></span>
                  <span>
                    <strong>Recommended:</strong> Square logos (1:1 ratio) work
                    best
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
