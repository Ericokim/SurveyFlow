import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function DropdownInput({
  question,
  value,
  onChange,
  onOtherTextChange,
  otherText = "",
  disabled,
  error,
  brandColor,
}) {
  const isOtherSelected = value === "Other";

  const handleValueChange = (newValue) => {
    onChange(newValue);
    // Clear other text if switching away from "Other"
    if (newValue !== "Other" && onOtherTextChange) {
      onOtherTextChange("");
    }
  };

  return (
    <div className="space-y-2 w-full">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}
      <Select
        value={value || ""}
        onValueChange={handleValueChange}
        disabled={disabled}
        required={question.required}
        className="w-full"
      >
        <SelectTrigger
          id={question.id}
          className={error ? "border-destructive w-full" : "w-full min-w-0"}
          style={
            !error && brandColor
              ? {
                  borderColor: `color-mix(in srgb, ${brandColor} 35%, #cbd5e1)`,
                }
              : undefined
          }
        >
          <SelectValue
            placeholder={question.placeholder || "Select an option"}
          />
        </SelectTrigger>
        <SelectContent
          style={
            brandColor
              ? {
                  "--select-brand": brandColor,
                  "--select-brand-soft": `color-mix(in srgb, ${brandColor} 14%, white)`,
                }
              : undefined
          }
        >
          {question.options && question.options.map((option, index) => (
            <SelectItem
              key={index}
              value={option}
              className={
                brandColor
                  ? "data-[highlighted]:bg-[var(--select-brand-soft)] data-[highlighted]:text-[var(--select-brand)] data-[state=checked]:bg-[var(--select-brand-soft)] data-[state=checked]:text-[var(--select-brand)]"
                  : undefined
              }
            >
              {option}
            </SelectItem>
          ))}
          {question.allowOther && (
            <SelectItem
              value="Other"
              className={
                brandColor
                  ? "data-[highlighted]:bg-[var(--select-brand-soft)] data-[highlighted]:text-[var(--select-brand)] data-[state=checked]:bg-[var(--select-brand-soft)] data-[state=checked]:text-[var(--select-brand)]"
                  : undefined
              }
            >
              Other
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {isOtherSelected && (
        <Input
          value={otherText}
          onChange={(e) => onOtherTextChange?.(e.target.value)}
          placeholder="Please specify..."
          className="mt-2"
          disabled={disabled}
          style={
            brandColor
              ? {
                  borderColor: `color-mix(in srgb, ${brandColor} 35%, #cbd5e1)`,
                }
              : undefined
          }
        />
      )}
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
