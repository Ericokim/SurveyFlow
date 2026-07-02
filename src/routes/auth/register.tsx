import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Mail, UserRound } from "lucide-react";
import { z } from "zod";

import { AuthPageShell, GoogleMark } from "@/components/shared/AuthPageShell";
import {
  FormFieldType,
  TanStackFormField,
} from "@/components/shared/inputs/custom-form-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signUpAuthContent } from "@/features/auth";

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required."),
    organization: z.string().trim().min(1, "Organization is required."),
    email: z.string().trim().email("Enter a valid work email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    terms: z.boolean().refine((value) => value, {
      message: "Accept the terms to continue.",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignUpValues = z.input<typeof signUpSchema>;

export const Route = createFileRoute("/auth/register")({
  component: RegisterRoute,
});

function RegisterRoute() {
  return (
    <AuthPageShell {...signUpAuthContent} formLabel="Sign up form">
      <SignUpForm />
    </AuthPageShell>
  );
}

function SignUpForm() {
  const form = useForm({
    defaultValues: {
      fullName: "",
      organization: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    } satisfies SignUpValues,
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: ({ value }) => {
      void value;
    },
  });

  return (
    <Card className="w-full max-w-[358px] min-w-0 overflow-hidden rounded-2xl border-border/80 bg-card/95 py-0 shadow-xl shadow-foreground/10 sm:max-w-[590px] md:rounded-3xl">
      <CardHeader className="items-center px-5 pt-5 text-center sm:px-7 md:px-8 md:pt-6">
        <CardTitle>
          <h1 className="font-extrabold text-2xl text-foreground tracking-normal sm:text-3xl xl:text-4xl">
            Create your account
          </h1>
        </CardTitle>
        <CardDescription className="text-sm">
          Start your SurveyFlow workspace
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 sm:px-7 md:px-8 md:pb-6">
        <form
          className="flex w-full min-w-0 flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <form.Field name="fullName">
              {(field) => (
                <TanStackFormField
                  field={field}
                  fieldType={FormFieldType.INPUT}
                  label="Full name"
                  icon={UserRound}
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  required
                />
              )}
            </form.Field>

            <form.Field name="organization">
              {(field) => (
                <TanStackFormField
                  field={field}
                  fieldType={FormFieldType.INPUT}
                  label="Organization"
                  icon={Building2}
                  autoComplete="organization"
                  placeholder="Northstar Research"
                  required
                />
              )}
            </form.Field>
          </div>

          <form.Field name="email">
            {(field) => (
              <TanStackFormField
                field={field}
                fieldType={FormFieldType.INPUT}
                label="Work email"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="you@yourcompany.com"
                required
              />
            )}
          </form.Field>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <form.Field name="password">
              {(field) => (
                <TanStackFormField
                  field={field}
                  fieldType={FormFieldType.PASSWORD}
                  label="Password"
                  autoComplete="new-password"
                  placeholder="Create password"
                  required
                />
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <TanStackFormField
                  field={field}
                  fieldType={FormFieldType.PASSWORD}
                  label="Confirm password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  required
                />
              )}
            </form.Field>
          </div>

          <form.Field name="terms">
            {(field) => (
              <TanStackFormField
                field={field}
                fieldType={FormFieldType.CHECKBOX}
                required
                labelClassName="min-w-0 max-w-full flex-wrap break-words font-normal text-muted-foreground text-xs leading-5 sm:text-sm"
                label={
                  <>
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="font-semibold text-primary hover:text-primary/80"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="font-semibold text-primary hover:text-primary/80"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </>
                }
              />
            )}
          </form.Field>

          <Button type="submit" className="h-11 w-full rounded-xl font-bold">
            Create Account
          </Button>

          <div className="flex items-center gap-5">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-sm">or</span>
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl font-semibold"
          >
            <GoogleMark />
            Continue with Google
          </Button>

          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
