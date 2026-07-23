import React from "react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

/**
 * UtilityButton - Reusable utility button component for actions like expand/collapse, filters, etc.
 * Extends the base Button component with pre-styled variants for common utility actions.
 */
export function UtilityButton({
  children,
  variant = "outline",
  size = "sm",
  icon: Icon,
  isActive = false,
  className,
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "gap-2 transition-all",
        isActive && "bg-primary/20 text-primary shadow-sm dark:bg-primary/25 dark:text-primary",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Button>
  );
}

/**
 * UtilityButtonGroup - Container for grouped utility buttons
 */
export function UtilityButtonGroup({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center bg-card rounded-md border border-border p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ToggleUtilityButton - Specialized utility button for toggle actions (expand/collapse, show/hide)
 */
export function ToggleUtilityButton({
  isToggled = false,
  toggledIcon: ToggledIcon,
  defaultIcon: DefaultIcon,
  toggledLabel,
  defaultLabel,
  onToggle,
  ...props
}) {
  const Icon = isToggled ? ToggledIcon : DefaultIcon;
  const label = isToggled ? toggledLabel : defaultLabel;

  return (
    <UtilityButton
      icon={Icon}
      onClick={onToggle}
      title={label}
      {...props}
    >
      {label}
    </UtilityButton>
  );
}

/**
 * FilterButton - Specialized utility button for filter actions
 */
export function FilterButton({
  isActive = false,
  icon: Icon,
  children,
  ...props
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-3 rounded-sm transition-all",
        isActive
          ? "bg-primary/20 text-primary shadow-sm dark:bg-primary/25 dark:text-primary"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 mr-1.5" />}
      {children}
    </Button>
  );
}
