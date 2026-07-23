import { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/**
 * Date input using shadcn/ui Calendar + Popover (matches Image #2)
 */
export function DateInput({
  question,
  value,
  onChange,
  disabled,
  error,
  brandColor,
}) {
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  const handleSelect = (date) => {
    if (!date) {
      onChange("");
      return;
    }
    onChange(date.toISOString());
  };

  return (
    <div className="space-y-2">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={question.id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground",
              error && "border-destructive"
            )}
            style={
              error || !brandColor
                ? undefined
                : {
                    borderColor: `color-mix(in srgb, ${brandColor} 35%, #cbd5e1)`,
                  }
            }
          >
            {selectedDate ? (
              format(selectedDate, "PPP")
            ) : (
              <span>Pick a date</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" side="top" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            captionLayout="dropdown"
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
