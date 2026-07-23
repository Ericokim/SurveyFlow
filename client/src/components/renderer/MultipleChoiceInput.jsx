import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function MultipleChoiceInput({
  question,
  value = [],
  onChange,
  onOtherTextChange,
  otherText = "",
  disabled,
  error,
  brandColor,
}) {
  const { minSelections, maxSelections } = question.validation || {};
  const hasNoneOption = Array.isArray(question.options)
    ? question.options.includes("None")
    : false;

  const handleToggle = (option) => {
    const currentValues = Array.isArray(value) ? value : [];
    const isSelected = currentValues.includes(option);
    let newValues;

    if (isSelected) {
      newValues = currentValues.filter((v) => v !== option);
    } else if (hasNoneOption && option === "None") {
      newValues = ["None"];
    } else {
      const withoutNone = hasNoneOption
        ? currentValues.filter((v) => v !== "None")
        : currentValues;
      newValues = [...withoutNone, option];
    }

    if (maxSelections && newValues.length > maxSelections) return;
    onChange(newValues);
  };

  const handleOtherToggle = (checked) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      const withoutNone = hasNoneOption
        ? currentValues.filter((v) => v !== "None")
        : currentValues;
      const newValues = [...withoutNone, "Other"];
      if (maxSelections && newValues.length > maxSelections) return;
      onChange(newValues);
    } else {
      onChange(currentValues.filter((v) => v !== "Other"));
      onOtherTextChange?.("");
    }
  };

  const isOtherSelected = Array.isArray(value) && value.includes("Other");

  return (
    <div className="space-y-3">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}
      <div className="space-y-2">
        {question.options?.map((option, index) => {
          const isChecked = Array.isArray(value) && value.includes(option);
          const noneSelected =
            hasNoneOption && Array.isArray(value) && value.includes("None");
          const isDisabledByMax =
            !isChecked &&
            maxSelections &&
            Array.isArray(value) &&
            value.length >= maxSelections;
          const isDisabledByNone =
            hasNoneOption &&
            noneSelected &&
            option !== "None" &&
            !isChecked;
          return (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-${index}`}
                checked={isChecked}
                onCheckedChange={() => handleToggle(option)}
                disabled={disabled || isDisabledByMax || isDisabledByNone}
              />
              <Label
                htmlFor={`${question.id}-${index}`}
                className={`font-normal cursor-pointer text-sm ${isDisabledByMax || isDisabledByNone ? "opacity-50" : ""}`}
              >
                {option}
              </Label>
            </div>
          );
        })}
        {question.allowOther && (
          <>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-other`}
                checked={isOtherSelected}
                onCheckedChange={handleOtherToggle}
                disabled={disabled}
              />
              <Label
                htmlFor={`${question.id}-other`}
                className="font-normal cursor-pointer text-sm"
              >
                Other
              </Label>
            </div>
            {isOtherSelected && (
              <div className="mt-2 pl-6">
                <Input
                  value={otherText}
                  onChange={(e) => onOtherTextChange?.(e.target.value)}
                  placeholder="Please specify..."
                  className="w-full min-w-0"
                  disabled={disabled}
                  style={
                    brandColor
                      ? {
                          borderColor: `color-mix(in srgb, ${brandColor} 35%, #cbd5e1)`,
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
