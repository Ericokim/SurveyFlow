import { Card, CardContent } from "./card";
import { Button } from "./button";

/**
 * EmptyState Component
 * Reusable empty state with icon, title, description, and optional action
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <Card className={className}>
      <CardContent className="py-12 px-4 text-center">
        {Icon && (
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        {description && (
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {description}
          </p>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            disabled={action.disabled}
            variant={action.variant || "default"}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
