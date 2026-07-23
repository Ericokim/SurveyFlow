import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

/**
 * Message Component
 * Displays status messages (error, success, info, warning)
 */
export function Message({ type = "info", children, className }) {
  const styles = {
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    },
    success: {
      bg: "bg-primary/10 border-primary/30",
      text: "text-primary",
      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-800",
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-800",
      icon: <Info className="h-5 w-5 text-blue-500" />,
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        style.bg,
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className={cn("flex-1 text-sm", style.text)}>{children}</div>
    </div>
  );
}
