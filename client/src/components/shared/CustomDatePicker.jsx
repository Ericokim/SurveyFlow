import * as React from "react";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  align = "start",
  disabled = false,
  numberOfMonths = 1,
}) {
  const [open, setOpen] = React.useState(false);
  const [internalRange, setInternalRange] = React.useState(
    value ?? { from: undefined, to: undefined }
  );

  // Sync internal range with external value when component receives new value
  React.useEffect(() => {
    setInternalRange(value ?? { from: undefined, to: undefined });
  }, [value?.from, value?.to]);

  // Display label for the trigger button
  const label = internalRange?.from
    ? internalRange?.to
      ? `${format(internalRange.from, "dd-MMM-yyyy")} - ${format(
          internalRange.to,
          "dd-MMM-yyyy"
        )}`
      : format(internalRange.from, "dd-MMM-yyyy")
    : placeholder;

  // Helper text to guide user during selection
  const getHelperText = () => {
    if (!internalRange?.from) {
      return "Select start date";
    }
    if (!internalRange?.to) {
      return "Select end date";
    }
    return "Date range selected";
  };

  // Handle calendar date selection
  const handleSelect = (selected) => {
    setInternalRange(selected ?? { from: undefined, to: undefined });
  };

  // Apply the selected range and close popover
  const handleUpdate = () => {
    onChange?.(internalRange);
    setOpen(false);
  };

  // Close without applying changes
  const handleClose = () => {
    // Reset to original value
    setInternalRange(value ?? { from: undefined, to: undefined });
    setOpen(false);
  };

  // Reset the selection
  const handleReset = () => {
    const resetRange = { from: undefined, to: undefined };
    setInternalRange(resetRange);
    onChange?.(resetRange);
  };

  // Handle popover open/close
  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      // Reset to current value when opening
      setInternalRange(value ?? { from: undefined, to: undefined });
    }
  };

  const hasValidRange = internalRange?.from && internalRange?.to;
  const hasPartialRange = internalRange?.from && !internalRange?.to;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn(
            "w-full h-8 justify-start text-left font-normal",
            !internalRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align={align}
        data-date-range-popover
      >
        <div className="p-3">
          <Calendar
            mode="range"
            captionLayout="dropdown"
            selected={internalRange}
            onSelect={handleSelect}
            numberOfMonths={numberOfMonths}
            className="w-full max-w-none"
          />

          {/* Helper text */}
          <div className="pt-3 pb-2">
            <p className="text-xs text-muted-foreground text-center">
              {getHelperText()}
            </p>
          </div>

          <Separator className="my-2" />

          {/* Control buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!internalRange?.from}
              className="h-8"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="h-8"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUpdate}
                disabled={!hasValidRange}
                className="h-8"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
