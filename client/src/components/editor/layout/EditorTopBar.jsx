import React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lock,
  AlertCircle,
  LayoutList,
  FileText,
  Link2,
  Copy,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import CustomBadge from "../../shared/CustomBadge";
import { Alert, AlertDescription } from "../../ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { cn } from "../../../lib/utils";

/**
 * EditorTopBar - Production-grade survey editor top bar
 * Clean design with progressive disclosure and intuitive actions
 */
export function EditorTopBar({
  isCreateMode,
  title,
  status,
  publicId,
  questionCount,
  canEdit = true,
  onPreview,
  onSave,
  onPublish,
  onClose,
  onDuplicate,
  onCopyLink,
  onShare,
  onPublishBlocked,
  isSaving,
  isPublishing,
  isClosing,
  isDuplicating = false,
  isSettingsLocked,
  isPublishBlocked = false,
  publishBlockedReason = "",
  hasChanges = false,
  hasUnpublishedChanges = false,
  isWhitelistEnabled = false,
  totalRecipients = 0,
  isSectional = false,
  sectionCount = 0,
}) {
  const navigate = useNavigate();

  const handleCopyLink = () => {
    if (!publicId) return;
    const url = `${window.location.origin}/r/${publicId}`;
    navigator.clipboard.writeText(url);
    onCopyLink?.();
  };

  const canShare = Boolean(publicId) && status !== "closed";

  const statusConfig = {
    draft: { label: "Draft", variant: "draft" },
    published: { label: "Published", variant: "published" },
    unpublished: { label: "Unpublished changes", variant: "warning" },
    closed: { label: "Closed", variant: "red" },
  };

  const currentStatus =
    status === "published" && hasUnpublishedChanges
      ? statusConfig.unpublished
      : statusConfig[status] || statusConfig.draft;
  const headerTitle = isCreateMode
    ? "Create New Survey"
    : title || "Untitled Survey";
  const headerDescription = isCreateMode
    ? "Set your survey title and start adding questions."
    : "Review content, logic, and publishing details in one place.";

  return (
    <div
      className={cn(
        "transition-all duration-200 ease-in-out bg-transparent relative lg:sticky lg:top-0 z-40"
      )}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 py-1 mb-2">
        <div className="rounded-lg border border-border bg-card px-3 sm:px-6 py-3 sm:py-4">
          {/* Header Row */}
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-start lg:justify-between">
            {/* Back Navigation + Title */}
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 w-full lg:w-auto lg:flex-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate({ to: "/surveys" })}
                      className="shrink-0 mt-0.5 sm:mt-1.5 h-10 w-10 bg-primary/10 hover:bg-primary/15 text-foreground hover:scale-105 transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Back to surveys</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="min-w-0 w-full space-y-0.5">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight text-foreground line-clamp-2 sm:truncate max-w-full">
                  {headerTitle}
                </h1>

                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {headerDescription}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-2 w-full md:grid-cols-3 lg:w-auto lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2">
                {!isSettingsLocked && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={onSave}
                        disabled={!canEdit || isSaving}
                        className=" text-xs sm:text-sm relative w-full lg:w-auto"
                      >
                        {hasChanges && !isSaving && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                        {isSaving ? (
                          "Saving..."
                        ) : (
                          <>
                            <span className="hidden sm:inline">
                              {isCreateMode ? "Save" : "Save Changes"}
                            </span>
                            <span className="sm:hidden">
                              {isCreateMode ? "Save" : "Save"}
                            </span>
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isCreateMode
                        ? "Save your survey as draft"
                        : "Save your latest changes"}
                    </TooltipContent>
                  </Tooltip>
                )}

                {status !== "closed" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={onPreview}
                        className=" text-xs sm:text-sm w-full lg:w-auto"
                      >
                        Preview
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {status === "published"
                        ? "Preview your current changes as a respondent"
                        : "Preview as a respondent"}
                    </TooltipContent>
                  </Tooltip>
                )}

                {!isCreateMode && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={onDuplicate}
                        disabled={!canEdit || isDuplicating}
                        className=" text-xs sm:text-sm w-full lg:w-auto"
                      >
                        {isDuplicating ? "Duplicating..." : "Duplicate"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Create a draft copy of this survey
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Primary Action */}
                {status === "draft" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          if (isPublishBlocked) {
                            onPublishBlocked?.();
                          } else {
                            onPublish();
                          }
                        }}
                        disabled={!canEdit || isPublishing || !questionCount}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground  text-xs sm:text-sm col-span-2 md:col-span-1 lg:col-span-1 w-full lg:w-auto"
                      >
                        {isPublishing ? "Publishing..." : "Publish"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {isPublishBlocked
                        ? publishBlockedReason
                        : "Publish to collect responses"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    {status === "published" && hasUnpublishedChanges && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              if (isPublishBlocked) {
                                onPublishBlocked?.();
                              } else {
                                onPublish();
                              }
                            }}
                            disabled={
                              !canEdit || isPublishing || !questionCount
                            }
                            className="bg-primary hover:bg-primary/90 text-primary-foreground  text-xs sm:text-sm col-span-2 md:col-span-1 lg:col-span-1 w-full lg:w-auto"
                          >
                            {isPublishing ? "Publishing..." : "Publish"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {isPublishBlocked
                            ? publishBlockedReason
                            : "Update live survey with your changes"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {status === "published" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={onClose}
                            disabled={!canEdit || isClosing}
                            className=" text-xs sm:text-sm col-span-1 lg:col-span-1 w-full lg:w-auto"
                          >
                            {isClosing ? "Closing..." : "Close"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Close the published survey
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {status !== "closed" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={onShare || handleCopyLink}
                            disabled={!canShare}
                            className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground font-medium  text-xs sm:text-sm col-span-1 lg:col-span-1 w-full lg:w-auto"
                          >
                            Share
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {canShare
                            ? "Copy the public link"
                            : "Public link unavailable"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            </TooltipProvider>
          </div>

          {/* Metadata Row */}
          <div className="mt-3 -mx-1 px-1 flex items-center gap-2 overflow-x-auto pb-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <CustomBadge
                    variant={currentStatus.variant}
                    className={cn("text-xs sm:text-sm")}
                  >
                    {currentStatus.label}
                  </CustomBadge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {status === "draft" &&
                  "Survey is in draft mode. You can edit all settings and content before publishing"}
                {status === "published" &&
                  (hasUnpublishedChanges
                    ? "Survey is published, but saved changes are not yet live. Publish to update the live survey."
                    : "Survey is live and accepting responses. You can still edit questions and settings")}
                {status === "closed" &&
                  "This survey has been closed and is no longer accepting new responses"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <CustomBadge
                    variant={isWhitelistEnabled ? "default" : "secondary"}
                    className="text-xs sm:text-sm"
                  >
                    {isWhitelistEnabled ? "Closed-ended" : "Open-ended"}
                  </CustomBadge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isWhitelistEnabled
                  ? "Closed-ended: Only approved recipients. Requires recipient list."
                  : "Open-ended: Anyone with link. No recipient list required."}
              </TooltipContent>
            </Tooltip>

            {questionCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <CustomBadge variant={"info"} className="text-xs sm:text-sm">
                      {questionCount} Question{questionCount !== 1 ? "s" : ""}
                    </CustomBadge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Total number of questions in this survey
                </TooltipContent>
              </Tooltip>
            )}

            {(questionCount > 0 || sectionCount > 0) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <CustomBadge
                      variant={isSectional ? "purple" : "cyan"}
                      className="text-xs sm:text-sm gap-1"
                    >
                      {isSectional ? (
                        <LayoutList className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {isSectional ? "Sections" : "Questions only"}
                    </CustomBadge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isSectional
                    ? `Section-based: Survey is organized into sections - ${sectionCount} section${sectionCount !== 1 ? "s" : ""}`
                    : `Question-based: All questions on a single page - ${questionCount} question${questionCount !== 1 ? "s" : ""}`}
                </TooltipContent>
              </Tooltip>
            )}

            {hasChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <CustomBadge
                      variant={"warning"}
                      className="gap-1.5 text-xs sm:text-sm text-amber-700 border-amber-300 bg-amber-50"
                    >
                      Unsaved changes
                    </CustomBadge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  You have unsaved changes. Click 'Save Changes' to preserve
                  your work
                </TooltipContent>
              </Tooltip>
            )}

            {isSettingsLocked && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <CustomBadge
                      variant={"warning"}
                      className="gap-1.5 text-xs sm:text-sm"
                    >
                      <Lock className="h-3 w-3" />
                      Read-Only
                    </CustomBadge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Survey is read-only. Closed surveys cannot be edited
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* More Options Dropdown
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {status === "published" && (
                <>
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Survey Link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/surveys/${surveyId}/recipients`)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Recipients
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onShowSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Survey Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowBranding}>
                <Palette className="w-4 h-4 mr-2" />
                Branding & Theme
              </DropdownMenuItem>
              {status === "published" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onClose}
                    disabled={isClosing}
                    className="text-red-600"
                  >
                    {isClosing ? "Closing..." : "Close Survey"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
      </div>
    </div>
  );
}
