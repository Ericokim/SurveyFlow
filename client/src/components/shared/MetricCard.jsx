import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import CustomBadge from "./CustomBadge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MetricCard Component
 * Displays a metric with title, value, description, icon, optional trend and badge
 */
const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  badge,
  className,
}) => {
  const isPositive = trend?.direction === "up";

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    const IconComponent = Icon;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <Card
      className={cn(
        "rounded-xl border bg-card hover:shadow-md transition-shadow min-w-0",
        className
      )}
    >
      <CardHeader className="px-3 py-2 pb-0 space-y-0.5">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <CardDescription className="text-[10px] sm:text-xs font-medium break-words min-w-0 uppercase tracking-wide">
            {title}
          </CardDescription>
          {badge?.text ? (
            <CustomBadge
              variant={badge?.variant || "blue"}
              className="h-5 text-[10px]"
            >
              {badge.text}
            </CustomBadge>
          ) : null}
        </div>
        <CardTitle className="text-xl sm:text-xl font-medium break-words">
          {value}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-2 pt-0">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground min-w-0">
          {renderIcon()}
          <span className="break-words min-w-0">{description}</span>
        </div>
      </CardContent>

      {trend && (
        <CardFooter className="px-4 pb-2 pt-0">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div
              className={`flex items-center gap-1 text-sm ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{trend?.value}</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default MetricCard;
