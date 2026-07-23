import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function SingleChoiceInput({
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

  return (
    <div className="space-y-3">
      {question.helpText && (
        <p className="text-sm text-muted-foreground">{question.helpText}</p>
      )}
      <RadioGroup
        value={value || ""}
        onValueChange={onChange}
        disabled={disabled}
        required={question.required}
        className={error ? "border-destructive" : ""}
      >
        {question.options?.map((option, index) => (
          <div key={index} className="flex items-center space-x-2">
            <RadioGroupItem value={option} id={`${question.id}-${index}`} />
            <Label
              htmlFor={`${question.id}-${index}`}
              className="font-normal cursor-pointer text-sm"
            >
              {option}
            </Label>
          </div>
        ))}
        {question.allowOther && (
          <>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Other" id={`${question.id}-other`} />
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
      </RadioGroup>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}
