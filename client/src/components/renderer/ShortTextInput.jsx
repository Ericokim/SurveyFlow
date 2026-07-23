import { Input } from "@/components/ui/input";
import { PhoneInput } from "../shared/CustomPhoneInput";

export function ShortTextInput({
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

  const configuredPattern =
    question?.validation?.predefinedPattern || question?.validation?.pattern;
  const normalizedPattern =
    typeof configuredPattern === "string"
      ? configuredPattern.trim().toLowerCase()
      : "";

  const typeByPattern = {
    email: "email",
    phone: "tel",
    url: "url",
    numeric: "number",
    number: "number",
    integer: "number",
  };

  const inputType = typeByPattern[normalizedPattern] || "text";
  const inputMode =
    normalizedPattern === "integer"
      ? "numeric"
      : ["numeric", "number"].includes(normalizedPattern)
        ? "decimal"
        : undefined;
  const step = normalizedPattern === "integer" ? "1" : undefined;
  const placeholderByPattern = {
    email: "john@example.com",
    phone: "+254712345678",
  };
  const resolvedPlaceholder =
    placeholderByPattern[normalizedPattern] || question.placeholder || question.title;

  return (
    <div className="space-y-2">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}
      {normalizedPattern === "phone" ? (
        <PhoneInput
          id={question.id}
          value={value || ""}
          onChange={(nextValue) => onChange(nextValue || "")}
          disabled={disabled}
          required={question.required}
          fieldState={error ? { error: { message: error } } : {}}
          international
          defaultCountry="KE"
          limitMaxLength
          placeholder={resolvedPlaceholder}
          className="w-full"
        />
      ) : (
        <Input
          id={question.id}
          type={inputType}
          inputMode={inputMode}
          step={step}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={question.required}
          minLength={question.validation?.minLength}
          maxLength={question.validation?.maxLength}
          placeholder={resolvedPlaceholder}
          className={error ? "border-destructive" : ""}
          style={error ? undefined : brandedBorder}
        />
      )}
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
