import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingInput({
  question,
  value,
  onChange,
  disabled,
  error,
  brandColor,
}) {
  const scale = question.ratingScale || 5;
  const currentValue = value || 0;

  return (
    <div className="space-y-2">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: scale }, (_, i) => i + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => !disabled && onChange(rating)}
            disabled={disabled}
            className={cn(
              "transition-colors p-1",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Star
              className={cn(
                "h-6 w-6 sm:h-8 sm:w-8",
                rating <= currentValue ? "fill-current text-current" : "text-muted-foreground"
              )}
              style={rating <= currentValue && brandColor ? { color: brandColor } : undefined}
            />
          </button>
        ))}
        {currentValue > 0 && (
          <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
            {currentValue} / {scale}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
