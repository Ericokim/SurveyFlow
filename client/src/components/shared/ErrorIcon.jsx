import {
  AlertTriangle,
  Ban,
  FileX,
  LogIn,
  Lock,
  Server,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { cn } from "../../lib/utils";

const iconByStatus = {
  400: AlertTriangle,
  401: LogIn,
  403: Lock,
  404: FileX,
  409: Ban,
  422: AlertTriangle,
  429: WifiOff,
  500: Server,
  502: Server,
  503: Server,
  504: Server,
};

const iconByType = {
  not_found: FileX,
  auth: ShieldAlert,
  validation: AlertTriangle,
  conflict: Ban,
  network: WifiOff,
  server: Server,
  unknown: AlertTriangle,
};

const variantStyles = {
  error: "bg-slate-900/5 text-slate-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-indigo-100 text-indigo-700",
};

export function ErrorIcon({
  statusCode,
  type,
  icon,
  variant = "error",
  className = "",
}) {
  const IconComponent =
    icon || iconByStatus[statusCode] || iconByType[type] || AlertTriangle;

  return (
    <div
      className={cn(
        "mx-auto w-16 h-16 rounded-2xl flex items-center justify-center",
        variantStyles[variant] || variantStyles.error,
        className
      )}
    >
      <IconComponent className="w-8 h-8" />
    </div>
  );
}
