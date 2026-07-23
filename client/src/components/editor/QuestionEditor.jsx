import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_IS_CHOICE,
  QUESTION_TYPES,
} from "../../lib/constants/questionTypes";

/**
 * Question Editor
 * Edit panel for selected question
 */

export function QuestionEditor({
  question,
  questionIndex,
  onUpdate,
  onDelete,
  onClose,
}) {
  const handleOptionChange = (optionIndex, value) => {
    const newOptions = [...(question.options || [])];
    newOptions[optionIndex] = value;
    onUpdate({ options: newOptions });
  };

  const handleAddOption = () => {
    onUpdate({ options: [...(question.options || []), ""] });
  };

  const handleRemoveOption = (optionIndex) => {
    const currentOptions = question.options || ["Option 1", "Option 2"];

    // Prevent deletion if only 1 option remains
    if (currentOptions.length <= 1) {
      toast.error("Questions must have at least one option");
      return;
    }

    const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
    onUpdate({ options: newOptions });
  };

  const handleRatingScaleChange = (value) => {
    onUpdate({ ratingScale: Number(value) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Question {questionIndex + 1} - {QUESTION_TYPE_LABELS[question.type]}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Text */}
        <div className="space-y-2">
          <Label htmlFor="questionText">Question Text</Label>
          <Textarea
            id="questionText"
            value={question.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Enter your question..."
            rows={3}
          />
        </div>

        {/* Help Text */}
        <div className="space-y-2">
          <Label htmlFor="helpText">Helper Text (optional)</Label>
          <Input
            id="helpText"
            value={question.helpText || ""}
            onChange={(e) => onUpdate({ helpText: e.target.value })}
            placeholder="Add guidance or a hint for respondents"
          />
        </div>

        {/* Required Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="required">Required</Label>
          <Switch
            id="required"
            checked={question.required}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
        </div>

        {/* Type-specific fields */}
        {QUESTION_TYPE_IS_CHOICE.has(question.type) && (
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-2">
              {(question.options || ["Option 1", "Option 2"]).map(
                (option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      disabled={
                        (question.options || ["Option 1", "Option 2"]).length <=
                        1
                      }
                      title={
                        (question.options || ["Option 1", "Option 2"]).length <=
                        1
                          ? "Questions must have at least one option"
                          : "Remove this option"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>
        )}

        {question.type === QUESTION_TYPES.RATING && (
          <div className="space-y-2">
            <Label htmlFor="ratingScale">Rating Scale</Label>
            <div className="grid grid-cols-2 gap-2">
              {[5, 10].map((scale, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    id={`rating-${scale}`}
                    type="radio"
                    name="ratingScale"
                    value={scale}
                    checked={(question.ratingScale || 5) === scale}
                    onChange={(e) => handleRatingScaleChange(e.target.value)}
                  />
                  <Label htmlFor={`rating-${scale}`}>{scale}-point scale</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Question
        </Button>
      </CardContent>
    </Card>
  );
}
