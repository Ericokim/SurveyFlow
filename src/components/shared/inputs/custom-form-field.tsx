import type { AnyFieldApi } from "@tanstack/form-core";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const FormFieldType = {
  INPUT: "input",
  PASSWORD: "password",
  CHECKBOX: "checkbox",
} as const;

export type FormFieldTypeValue =
  (typeof FormFieldType)[keyof typeof FormFieldType];

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

export type CustomFormFieldProps = BaseFieldProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "id" | "name" | "className" | "type" | "required"
  > & {
    type?: React.HTMLInputTypeAttribute;
    onCheckedChange?: (checked: boolean) => void;
  };

type SupportTextProps = {
  description?: React.ReactNode;
  error?: React.ReactNode;
};

function SupportText({ description, error }: SupportTextProps) {
  const content = error ?? description;

  if (!content) return null;

  return (
    <p
      className={cn(
        "text-sm leading-6",
        error ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {content}
    </p>
  );
}

type FieldShellProps = BaseFieldProps & {
  children: React.ReactNode;
  controlId: string;
  inline?: boolean;
};

function FieldShell({
  children,
  className,
  controlId,
  description,
  error,
  inline,
  label,
  labelClassName,
  required,
}: FieldShellProps) {
  if (!label) return <div className={className}>{children}</div>;

  if (inline) {
    return (
      <div className={cn("flex items-start gap-3", className)}>
        {children}
        <div className="min-w-0 flex-1">
          <Label
            htmlFor={controlId}
            className={cn("font-normal leading-6", labelClassName)}
          >
            {label}
            {required ? <span className="sr-only"> required</span> : null}
          </Label>
          <SupportText description={description} error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={controlId} className={labelClassName}>
        {label}
        {required ? <span className="sr-only"> required</span> : null}
      </Label>
      {children}
      <SupportText description={description} error={error} />
    </div>
  );
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
        "relative flex h-11 min-w-0 items-center overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow]",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        "data-[invalid]:border-destructive data-[invalid]:ring-2 data-[invalid]:ring-destructive/15",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PasswordToggle({
  label,
  onClick,
  visible,
}: {
  label?: React.ReactNode;
  onClick: () => void;
  visible: boolean;
}) {
  const fieldName =
    typeof label === "string" ? label.toLowerCase() : "password";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground hover:text-foreground"
      aria-label={visible ? `Hide ${fieldName}` : `Show ${fieldName}`}
      onClick={onClick}
    >
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  );
}

function TextInputField(props: CustomFormFieldProps & { controlId: string }) {
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
    type = "text",
    ...inputProps
  } = props;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = fieldType === FormFieldType.PASSWORD;
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
      <FieldFrame invalid={invalid} className={controlClassName}>
        {Icon ? (
          <Icon
            aria-hidden="true"
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 size-5 text-muted-foreground"
          />
        ) : null}

        <Input
          {...inputProps}
          id={controlId}
          name={props.name}
          type={isPassword && !showPassword ? "password" : type}
          required={required}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          className={cn(
            "sf-auth-input h-full min-w-0 rounded-xl border-0 bg-transparent shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 aria-invalid:border-transparent aria-invalid:ring-0 aria-invalid:ring-offset-0 md:text-sm",
            Icon ? "pl-12" : "pl-4",
            isPassword ? "pr-12" : "pr-4",
            inputClassName,
          )}
        />

        {isPassword ? (
          <PasswordToggle
            label={label}
            visible={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          />
        ) : null}
      </FieldFrame>
    </FieldShell>
  );
}

function CheckboxField(props: CustomFormFieldProps & { controlId: string }) {
  const {
    className,
    controlClassName,
    controlId,
    description,
    error,
    label,
    labelClassName,
    onCheckedChange,
    required,
    ...inputProps
  } = props;
  const invalid = Boolean(error);

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
      <Checkbox
        id={controlId}
        name={props.name}
        checked={inputProps.checked === true}
        required={required}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        className={cn("mt-1", controlClassName)}
        onBlur={inputProps.onBlur}
        onCheckedChange={(checked) => onCheckedChange?.(checked === true)}
      />
    </FieldShell>
  );
}

export function CustomFormField(props: CustomFormFieldProps) {
  const generatedId = useId();
  const controlId = props.id ?? props.name ?? generatedId;

  if (props.fieldType === FormFieldType.CHECKBOX) {
    return <CheckboxField {...props} controlId={controlId} />;
  }

  return <TextInputField {...props} controlId={controlId} />;
}

type TanStackFormFieldProps = Omit<
  CustomFormFieldProps,
  | "checked"
  | "defaultChecked"
  | "error"
  | "name"
  | "onBlur"
  | "onChange"
  | "onCheckedChange"
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
  const name = String(field.name);
  const fieldError = getFieldError(field, error);
  const sharedProps = {
    ...props,
    id: props.id ?? name,
    name,
    error: fieldError,
    onBlur: field.handleBlur,
  };

  if (props.fieldType === FormFieldType.CHECKBOX) {
    return (
      <CustomFormField
        {...sharedProps}
        checked={Boolean(field.state.value)}
        onCheckedChange={(checked) => field.handleChange(checked)}
      />
    );
  }

  return (
    <CustomFormField
      {...sharedProps}
      value={String(field.state.value ?? "")}
      onChange={(event) => field.handleChange(event.target.value)}
    />
  );
}
