import React from "react";
import * as Dg from "@/components/ui/dialog.jsx";
import * as At from "@/components/ui/alert-dialog.jsx";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertContext } from "../../app/context/AlertContext";
import { Input } from "@/components/ui/input";

export const Dialog = React.forwardRef(
  (
    {
      title,
      description,
      open = false,
      onOpenChange,
      contentClassName,
      className,
      children,
      closeIcon = true,
      ...props
    },
    ref
  ) => {
    return (
      <Dg.Dialog
        ref={ref}
        modal={true}
        open={open}
        defaultOpen={open}
        onOpenChange={onOpenChange}
        {...props}
      >
        <Dg.DialogContent
          closeIcon={closeIcon}
          className={cn(className, contentClassName)}
        >
          <Dg.DialogHeader>
            <Dg.DialogTitle className="-mt-2">{title}</Dg.DialogTitle>
            {description && (
              <Dg.DialogDescription>{description}</Dg.DialogDescription>
            )}
          </Dg.DialogHeader>
          {children}
        </Dg.DialogContent>
      </Dg.Dialog>
    );
  }
);

export const AlertDialog = React.forwardRef(({ ...props }, ref) => {
  const { alert } = useAlertContext();
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [isConfirmationValid, setIsConfirmationValid] = React.useState(false);

  // Reset confirmation input when dialog opens/closes
  React.useEffect(() => {
    if (!alert.open) {
      setConfirmationInput("");
      setIsConfirmationValid(false);
    }
  }, [alert.open]);

  // Check if confirmation input matches required text
  React.useEffect(() => {
    if (alert.requiresConfirmation && alert.confirmationMatch) {
      setIsConfirmationValid(
        confirmationInput.toLowerCase().trim() ===
          alert.confirmationMatch.toLowerCase().trim()
      );
    } else {
      setIsConfirmationValid(true);
    }
  }, [confirmationInput, alert.requiresConfirmation, alert.confirmationMatch]);

  // Handle action with confirmation check
  const handleAction = () => {
    if (alert.requiresConfirmation && !isConfirmationValid) {
      return;
    }
    alert.onAction();
  };

  // Get appropriate icon based on alert style
  const getAlertIcon = () => {
    switch (alert.actionStyle) {
      case "destructive":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        );
      case "success":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
        );
      case "warning":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        );
      case "info":
      case "default":
      case "primary":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Info className="h-6 w-6 text-primary" />
          </div>
        );
      default:
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <HelpCircle className="h-6 w-6 text-muted-foreground" />
          </div>
        );
    }
  };

  return (
    <At.AlertDialog
      modal={true}
      open={alert.open}
      defaultOpen={alert.open}
      onOpenChange={alert.closeConfirmation}
      {...props}
    >
      <At.AlertDialogContent className="sm:max-w-md overflow-hidden p-0 border-border">
        <div className="bg-card text-card-foreground">
          {/* Icon Section */}
          <div className="px-6 pt-6 pb-2 text-center">{getAlertIcon()}</div>

          {/* Content Section */}
          <div className="px-6 pb-4">
            <At.AlertDialogHeader className="text-center space-y-2">
              <At.AlertDialogTitle className="text-lg font-semibold text-foreground">
                {alert.title}
              </At.AlertDialogTitle>
              <At.AlertDialogDescription className="text-sm text-muted-foreground">
                {alert.description}
              </At.AlertDialogDescription>
            </At.AlertDialogHeader>

            {/* Confirmation Input Section */}
            {alert.requiresConfirmation && (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-foreground">
                  {alert.confirmationText}
                </div>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder={alert.confirmationPlaceholder}
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    className={cn(
                      "text-center ",
                      isConfirmationValid
                        ? "border-primary/40 focus:border-primary focus:ring-primary"
                        : confirmationInput.length > 0
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : ""
                    )}
                  />
                  {alert.confirmationMatch && (
                    <div className="text-xs text-muted-foreground text-center">
                      {/* Type:{' '}
                      <span className=" font-semibold">
                        {alert.confirmationMatch}
                      </span> */}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Button Section */}
          <div className="px-6 py-4 bg-muted/25 border-t border-border">
            <At.AlertDialogFooter className="flex gap-3 justify-center">
              <At.AlertDialogCancel
                className={cn(
                  "inline-flex items-center justify-center",
                  "px-4 py-2 min-w-[80px] h-9",
                  "text-sm font-medium rounded-md",
                  "border border-border",
                  "bg-background text-foreground",
                  "hover:bg-muted",
                  "focus:outline-none focus:ring-2 focus:ring-ring/60",
                  "transition-colors duration-150"
                )}
                onClick={alert.onCancel}
              >
                {alert.cancelLabel}
              </At.AlertDialogCancel>

              <At.AlertDialogAction
                className={cn(
                  "inline-flex items-center justify-center",
                  "px-4 py-2 min-w-[80px] h-9",
                  "text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2",
                  "transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  alert.actionStyle === "destructive"
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground focus:ring-destructive/60"
                    : alert.actionStyle === "success"
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary/60"
                      : alert.actionStyle === "warning"
                        ? "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/60"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary/60"
                )}
                disabled={
                  alert.loading ||
                  (alert.requiresConfirmation && !isConfirmationValid)
                }
                onClick={handleAction}
              >
                {alert.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  alert.actionLabel
                )}
              </At.AlertDialogAction>
            </At.AlertDialogFooter>
          </div>
        </div>
      </At.AlertDialogContent>
    </At.AlertDialog>
  );
});

export const CreateDialog = ({ align = "left", title, icon, children }) => {
  return (
    <fieldset className="w-full rounded-lg border bg-card text-card-foreground shadow hover:shadow-md p-4">
      <legend align={align} className="-ml-1 px-2 text-lg font-medium">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
        </div>
      </legend>
      {children}
    </fieldset>
  );
};
