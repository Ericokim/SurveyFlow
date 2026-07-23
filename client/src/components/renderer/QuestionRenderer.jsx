import { ShortTextInput } from "./ShortTextInput";
import { LongTextInput } from "./LongTextInput";
import { SingleChoiceInput } from "./SingleChoiceInput";
import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { DropdownInput } from "./DropdownInput";
import { RatingInput } from "./RatingInput";
import { DateInput } from "./DateInput";

/**
 * QuestionRenderer - SINGLE SOURCE OF TRUTH
 *
 * This component is reused in:
 * - Editor preview (mode="preview")
 * - Editor edit mode (mode="edit")
 * - Respondent survey (mode="response")
 * - Analytics displays (mode="preview")
 *
 * Props:
 * - question: Question object (from Zod schema)
 * - value: Current answer value
 * - onChange: Callback when value changes
 * - onOtherTextChange: Callback when "Other" text changes (for choice questions)
 * - otherText: Current "Other" text value
 * - mode: "edit" | "response" | "preview"
 * - error: Validation error message
 * - readOnly: explicitly force non-interactive when true
 *
 * DO NOT create any other question rendering logic.
 * All question UX must go through this component.
 */
export function QuestionRenderer({
  question,
  value,
  onChange,
  onOtherTextChange,
  otherText,
  mode = "response",
  error,
  readOnly,
  brandColor,
}) {
  const disabled =
    readOnly !== undefined ? readOnly : mode === "preview" || mode === "edit";

  const commonProps = {
    question,
    value,
    onChange,
    disabled,
    error,
    brandColor,
  };

  // Add other text props for choice questions
  const choiceProps = {
    ...commonProps,
    onOtherTextChange,
    otherText,
  };

  switch (question.type) {
    case "short_text":
      return <ShortTextInput {...commonProps} />;

    case "long_text":
      return <LongTextInput {...commonProps} />;

    case "single_choice":
      return <SingleChoiceInput {...choiceProps} />;

    case "multiple_choice":
      return <MultipleChoiceInput {...choiceProps} />;

    case "dropdown":
      return <DropdownInput {...choiceProps} />;

    case "rating":
      return <RatingInput {...commonProps} />;

    case "date":
      return <DateInput {...commonProps} />;

    default:
      return (
        <div className="p-4 border border-dashed border-muted-foreground rounded-md">
          <p className="text-sm text-muted-foreground">
            Unknown question type: {question.type}
          </p>
        </div>
      );
  }
}
