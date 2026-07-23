import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ErrorIcon } from "./ErrorIcon";
import { resolveErrorDisplay } from "../../lib/utils/errorMapping";

export function ErrorPage({
  statusCode,
  type,
  title,
  description,
  error,
  fullScreen = true,
  showHome = true,
  showRetry = true,
  onRetry,
  onAction,
  actionLabel,
  actions,
  primaryLabel = "Try again",
  secondaryLabel = "Go to dashboard",
  homeTo = "/surveys",
  variant = "error",
  debugId,
}) {
  const navigate = useNavigate();

  const mapped = useMemo(
    () =>
      resolveErrorDisplay(error, {
        statusCode,
        type,
        title,
        description,
        variant,
      }),
    [error, statusCode, type, title, description, variant]
  );

  const resolvedStatus = mapped.statusCode;
  const requestId =
    error?.response?.headers?.["x-request-id"] || error?.requestId;
  const showDebugId =
    typeof import.meta !== "undefined" && import.meta.env?.DEV;

  const resolvedPrimaryLabel = actionLabel || primaryLabel;
  const resolvedAction = onAction || onRetry;

  return (
    <div
      className={
        fullScreen
          ? "min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-indigo-50 px-4 py-8"
          : "w-full flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-indigo-50 px-4 py-8"
      }
    >
      <Card className="w-full max-w-2xl border-slate-200 shadow-lg">
        <CardContent className="p-8 md:p-12 text-center space-y-6">
          <ErrorIcon
            statusCode={resolvedStatus}
            type={type || mapped.type}
            variant={variant || mapped.variant}
          />

          <div className="space-y-2">
            {resolvedStatus && (
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Error {resolvedStatus}
              </p>
            )}
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              {mapped.title}
            </h1>
            <p className="text-sm md:text-base text-slate-600">
              {mapped.description}
            </p>
          </div>

          {showDebugId && (requestId || debugId) && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-xs text-slate-500">
              Reference ID: <span className="">{debugId || requestId}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {Array.isArray(actions) && actions.length > 0 ? (
              actions.map((action) => (
                <Button
                  key={action.key || action.label}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  className="gap-2"
                >
                  {action.label}
                </Button>
              ))
            ) : (
              <>
                {showRetry && (
                  <Button
                    onClick={
                      resolvedAction ||
                      (() => {
                        window.location.reload();
                      })
                    }
                    className="gap-2"
                  >
                    {resolvedPrimaryLabel}
                  </Button>
                )}
                {showHome && (
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: homeTo })}
                    className="gap-2"
                  >
                    <Home className="w-4 h-4" />
                    {secondaryLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
