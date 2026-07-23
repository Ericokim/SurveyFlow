import { Textarea } from "@/components/ui/textarea";

export function LongTextInput({
  question,
  value,
  onChange,
  disabled,
  error,
  brandColor,
}) {
  const brandedBorder = brandColor
    ? { borderColor: `color-mix(in srgb, ${brandColor} 35%, #cbd5e1)` }
    : undefined;

  return (
    <div className="space-y-2">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}
      <Textarea
        id={question.id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={question.required}
        minLength={question.validation?.minLength}
        maxLength={question.validation?.maxLength}
        rows={4}
        placeholder={question.placeholder || question.title}
        className={error ? "border-destructive" : ""}
        style={error ? undefined : brandedBorder}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
