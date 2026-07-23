import React from "react";
import { Calendar, Clock, Monitor } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import CustomBadge from "./CustomBadge";

const formatQuestionTypeLabel = (questionType) =>
  String(questionType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function ResponseDetailsSummaryCard({ name, email, phone, responses }) {
  return (
    <Card className="shadow-none border border-border/70 bg-card py-0 gap-0">
      <CardContent className="px-2.5 py-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="font-medium">{name || "Anonymous"}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium break-all">{email || "-"}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="font-medium">{phone || "-"}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Responses</p>
          <p className="font-medium">{responses ?? 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResponseDetailsSubmissionCard({
  submissionLabel,
  versionLabel,
  submittedAtLabel,
  completionTimeLabel,
  deviceLabel,
  children,
}) {
  return (
    <Card className="shadow-none border border-border/70 bg-card py-0 gap-0">
      <CardContent className="px-3 py-2 space-y-2">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{submissionLabel}</p>
            {versionLabel ? <Badge variant="outline">{versionLabel}</Badge> : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2 flex items-center gap-2 text-xs">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{submittedAtLabel || "-"}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2 flex items-center gap-2 text-xs">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Completion Time</p>
                <p className="font-medium">{completionTimeLabel || "-"}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2 flex items-center gap-2 text-xs">
              <Monitor className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Device</p>
                <p className="font-medium">{deviceLabel || "-"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">{children}</div>
      </CardContent>
    </Card>
  );
}

export function ResponseDetailsAnswerItem({
  index,
  title,
  questionType,
  sectionTitle,
  required,
  answerText,
  showToggle = false,
  toggleLabel = "",
  onToggle = null,
  className = "",
}) {
  return (
    <div
      className={`cursor-auto rounded-lg border border-border/70 bg-card p-2 space-y-1.5 transition-colors hover:border-primary/40 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="leading-tight">
          <p className="font-medium text-xs sm:text-sm">
            {index}. {title}
          </p>
          {(questionType || sectionTitle) && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {sectionTitle ? (
                <CustomBadge
                  variant="gray"
                  className="h-5 px-2 text-[10px] font-medium tracking-normal"
                >
                  {sectionTitle}
                </CustomBadge>
              ) : null}
              {questionType ? (
                <CustomBadge
                  variant="green"
                  className="h-5 px-2 text-[10px] font-medium tracking-normal"
                >
                  {formatQuestionTypeLabel(questionType)}
                </CustomBadge>
              ) : null}
            </div>
          )}
        </div>
        {required ? <CustomBadge variant="success">Required</CustomBadge> : null}
      </div>
      <div className="rounded-md bg-muted/30 border border-border/70 px-2 py-1.5 text-sm whitespace-pre-wrap break-words text-foreground">
        {answerText}
      </div>
      {showToggle && onToggle ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={onToggle}
        >
          {toggleLabel}
        </Button>
      ) : null}
    </div>
  );
}
