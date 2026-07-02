import type { AnyFieldApi } from "@tanstack/form-core";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const FormFieldType = {
  INPUT: "input",
  FILE_UPLOAD: "file",
  PASSWORD: "password",
  OTP: "otp",
  TEXTAREA: "textarea",
  PHONE_INPUT: "phoneInput",
  CHECKBOX: "checkbox",
  DATE_PICKER: "datePicker",
  DATE_TIME_PICKER: "dateTimePicker",
  DATE: "datePick",
  SELECT: "select",
  MULTISELECT: "multiselect",
  SWITCH: "switch",
  SKELETON: "skeleton",
  TAGS: "tags",
} as const;

export type FormFieldTypeValue =
  (typeof FormFieldType)[keyof typeof FormFieldType];

type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type BaseFieldProps = {
  fieldType?: FormFieldTypeValue;
  label?: React.ReactNode;
  id?: string;
  name?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  controlClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  required?: boolean;
};

type TextFieldType =
  | typeof FormFieldType.INPUT
  | typeof FormFieldType.FILE_UPLOAD
  | typeof FormFieldType.PASSWORD
  | typeof FormFieldType.OTP
  | typeof FormFieldType.PHONE_INPUT
  | typeof FormFieldType.DATE_PICKER
  | typeof FormFieldType.DATE_TIME_PICKER
  | typeof FormFieldType.DATE
  | typeof FormFieldType.TAGS;

type TextFieldProps = BaseFieldProps &
  Omit<
    React.ComponentProps<typeof Input>,
    "id" | "name" | "type" | "className" | "aria-invalid"
  > & {
    fieldType?: TextFieldType;
    type?: React.HTMLInputTypeAttribute;
  };

type TextareaFieldProps = BaseFieldProps &
  Omit<
    React.ComponentProps<typeof Textarea>,
    "id" | "name" | "className" | "aria-invalid"
  > & {
    fieldType: typeof FormFieldType.TEXTAREA;
  };

type SelectFieldProps = BaseFieldProps & {
  fieldType: typeof FormFieldType.SELECT | typeof FormFieldType.MULTISELECT;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

type BooleanFieldProps = BaseFieldProps &
  Omit<
    React.ComponentProps<typeof Checkbox>,
    "id" | "name" | "className" | "onCheckedChange"
  > & {
    fieldType: typeof FormFieldType.CHECKBOX | typeof FormFieldType.SWITCH;
    onCheckedChange?: (checked: boolean) => void;
  };

type SkeletonFieldProps = BaseFieldProps & {
  fieldType: typeof FormFieldType.SKELETON;
  renderSkeleton: () => React.ReactNode;
};

export type CustomFormFieldProps =
  | TextFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | BooleanFieldProps
  | SkeletonFieldProps;

function FieldShell({
  children,
  className,
  controlId,
  description,
  error,
  inline = false,
  label,
  labelClassName,
  required,
}: {
  children: React.ReactNode;
  className?: string;
  controlId: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  inline?: boolean;
  label?: React.ReactNode;
  labelClassName?: string;
  required?: boolean;
}) {
  if (!label) {
    return <div className={className}>{children}</div>;
  }

  if (inline) {
    return (
      <div className={cn("flex items-start gap-3", className)}>
        {children}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label
            htmlFor={controlId}
            className={cn("font-normal leading-6", labelClassName)}
          >
            {label}
            {required ? <span className="sr-only"> required</span> : null}
          </Label>
          <FieldSupportText description={description} error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={controlId} className={labelClassName}>
        {label}
        {required ? <span className="sr-only"> required</span> : null}
      </Label>
      {children}
      <FieldSupportText description={description} error={error} />
    </div>
  );
}

function FieldSupportText({
  description,
  error,
}: {
  description?: React.ReactNode;
  error?: React.ReactNode;
}) {
  if (error) {
    return <p className="text-destructive text-sm leading-6">{error}</p>;
  }

  if (description) {
    return (
      <p className="text-muted-foreground text-sm leading-6">{description}</p>
    );
  }

  return null;
}

function FieldFrame({
  children,
  className,
  invalid,
}: {
  children: React.ReactNode;
  className?: string;
  invalid?: boolean;
}) {
  return (
    <div
      data-invalid={invalid ? "" : undefined}
      className={cn(
        "relative flex h-11 items-center rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow]",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        "data-[invalid]:border-destructive data-[invalid]:ring-2 data-[invalid]:ring-destructive/15",
        className,
      )}
    >
      {children}
    </div>
  );
}

function getInputType(
  fieldType: TextFieldType | undefined,
  type: React.HTMLInputTypeAttribute | undefined,
  showPassword: boolean,
) {
  if (fieldType === FormFieldType.PASSWORD) {
    return showPassword ? "text" : "password";
  }

  if (type) return type;

  switch (fieldType) {
    case FormFieldType.FILE_UPLOAD:
      return "file";
    case FormFieldType.OTP:
      return "text";
    case FormFieldType.PHONE_INPUT:
      return "tel";
    case FormFieldType.DATE:
    case FormFieldType.DATE_PICKER:
      return "date";
    case FormFieldType.DATE_TIME_PICKER:
      return "datetime-local";
    default:
      return "text";
  }
}

function TextField(props: TextFieldProps & { controlId: string }) {
  const {
    className,
    controlClassName,
    controlId,
    description,
    error,
    fieldType = FormFieldType.INPUT,
    icon: Icon,
    inputClassName,
    label,
    labelClassName,
    required,
    type,
    ...inputProps
  } = props;
  const [showPassword, setShowPassword] = useState(false);
  const invalid = Boolean(error);
  const inputType = getInputType(fieldType, type, showPassword);
  const isPassword = fieldType === FormFieldType.PASSWORD;

  return (
    <FieldShell
      className={className}
      controlId={controlId}
      description={description}
      error={error}
      label={label}
      labelClassName={labelClassName}
      required={required}
    >
      <FieldFrame invalid={invalid} className={controlClassName}>
        {Icon ? (
          <Icon
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 size-5 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}

        <Input
          id={controlId}
          name={props.name}
          type={inputType}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          inputMode={fieldType === FormFieldType.OTP ? "numeric" : undefined}
          className={cn(
            "sf-auth-input h-full rounded-xl border-0 bg-transparent shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 aria-invalid:border-transparent aria-invalid:ring-0 aria-invalid:ring-offset-0 md:text-sm",
            Icon ? "pl-12" : "pl-4",
            isPassword ? "pr-12" : "pr-4",
            inputClassName,
          )}
          {...inputProps}
        />

        {isPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </FieldFrame>
    </FieldShell>
  );
}

function TextareaField(props: TextareaFieldProps & { controlId: string }) {
  const {
    className,
    controlClassName,
    controlId,
    description,
    error,
    inputClassName,
    label,
    labelClassName,
    required,
    ...textareaProps
  } = props;
  const invalid = Boolean(error);

  return (
    <FieldShell
      className={className}
      controlId={controlId}
      description={description}
      error={error}
      label={label}
      labelClassName={labelClassName}
      required={required}
    >
      <Textarea
        id={controlId}
        name={props.name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-24 rounded-xl bg-card shadow-xs",
          controlClassName,
          inputClassName,
        )}
        {...textareaProps}
      />
    </FieldShell>
  );
}

function SelectField(props: SelectFieldProps & { controlId: string }) {
  const {
    className,
    controlClassName,
    controlId,
    description,
    error,
    label,
    labelClassName,
    options,
    placeholder,
    required,
    ...selectProps
  } = props;
  const invalid = Boolean(error);

  return (
    <FieldShell
      className={className}
      controlId={controlId}
      description={description}
      error={error}
      label={label}
      labelClassName={labelClassName}
      required={required}
    >
      <Select {...selectProps}>
        <SelectTrigger
          id={controlId}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          className={cn("h-12 w-full rounded-xl bg-card", controlClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function BooleanField(props: BooleanFieldProps & { controlId: string }) {
  const {
    className,
    controlClassName,
    controlId,
    description,
    error,
    fieldType,
    label,
    labelClassName,
    required,
    onCheckedChange,
    ...booleanProps
  } = props;
  const invalid = Boolean(error);
  const checked = booleanProps.checked === true;

  return (
    <FieldShell
      className={className}
      controlId={controlId}
      description={description}
      error={error}
      inline
      label={label}
      labelClassName={labelClassName}
      required={required}
    >
      {fieldType === FormFieldType.SWITCH ? (
        <Switch
          id={controlId}
          name={props.name}
          checked={checked}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          className={cn("mt-1", controlClassName)}
          onCheckedChange={onCheckedChange}
        />
      ) : (
        <Checkbox
          id={controlId}
          name={props.name}
          checked={checked}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          className={cn("mt-1", controlClassName)}
          onCheckedChange={onCheckedChange}
        />
      )}
    </FieldShell>
  );
}

export function CustomFormField(props: CustomFormFieldProps) {
  const generatedId = useId();
  const controlId = props.id ?? props.name ?? generatedId;

  switch (props.fieldType) {
    case FormFieldType.TEXTAREA:
      return <TextareaField {...props} controlId={controlId} />;
    case FormFieldType.SELECT:
    case FormFieldType.MULTISELECT:
      return <SelectField {...props} controlId={controlId} />;
    case FormFieldType.CHECKBOX:
    case FormFieldType.SWITCH:
      return <BooleanField {...props} controlId={controlId} />;
    case FormFieldType.SKELETON:
      return props.renderSkeleton();
    default:
      return <TextField {...props} controlId={controlId} />;
  }
}

type TanStackFormFieldProps = Omit<
  CustomFormFieldProps,
  | "checked"
  | "defaultChecked"
  | "defaultValue"
  | "error"
  | "name"
  | "onBlur"
  | "onChange"
  | "onCheckedChange"
  | "onValueChange"
  | "value"
> & {
  field: AnyFieldApi;
  error?: React.ReactNode;
};

function getFieldError(field: AnyFieldApi, fallback?: React.ReactNode) {
  if (fallback) return fallback;

  const firstError = field.state.meta.errors[0];

  if (!firstError) return undefined;
  if (typeof firstError === "string") return firstError;
  if (
    typeof firstError === "object" &&
    firstError !== null &&
    "message" in firstError
  ) {
    return String(firstError.message);
  }

  return "Please check this field.";
}

export function TanStackFormField({
  field,
  error,
  ...props
}: TanStackFormFieldProps) {
  const fieldError = getFieldError(field, error);
  const name = String(field.name);

  if (
    props.fieldType === FormFieldType.CHECKBOX ||
    props.fieldType === FormFieldType.SWITCH
  ) {
    return (
      <CustomFormField
        {...props}
        id={props.id ?? name}
        name={name}
        checked={Boolean(field.state.value)}
        error={fieldError}
        onBlur={field.handleBlur}
        onCheckedChange={(checked) => {
          field.handleChange(checked);
        }}
      />
    );
  }

  if (
    props.fieldType === FormFieldType.SELECT ||
    props.fieldType === FormFieldType.MULTISELECT
  ) {
    return (
      <CustomFormField
        {...props}
        id={props.id ?? name}
        name={name}
        value={String(field.state.value ?? "")}
        error={fieldError}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
      />
    );
  }

  if (props.fieldType === FormFieldType.FILE_UPLOAD) {
    return (
      <CustomFormField
        {...props}
        id={props.id ?? name}
        name={name}
        error={fieldError}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.files?.[0] ?? null);
        }}
      />
    );
  }

  return (
    <CustomFormField
      {...props}
      id={props.id ?? name}
      name={name}
      value={String(field.state.value ?? "")}
      error={fieldError}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value);
      }}
    />
  );
}
