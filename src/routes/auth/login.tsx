import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
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
import { signInAuthContent } from "@/features/auth";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean(),
});

type SignInValues = z.input<typeof signInSchema>;

export const Route = createFileRoute("/auth/login")({
  component: SignInRoute,
});

function SignInRoute() {
  return (
    <AuthPageShell {...signInAuthContent} formLabel="Sign in form">
      <SignInForm />
    </AuthPageShell>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    } satisfies SignInValues,
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: ({ value }) => {
      void value;
      void navigate({ to: "/dashboard" });
    },
  });

  return (
    <Card className="w-full max-w-[358px] min-w-0 overflow-hidden rounded-2xl border-border/80 bg-card/95 py-0 shadow-xl shadow-foreground/10 sm:max-w-[590px] md:rounded-3xl">
      <CardHeader className="items-center px-5 pt-6 text-center sm:px-7 md:px-8 md:pt-8">
        <CardTitle>
          <h1 className="font-extrabold text-2xl text-foreground tracking-normal sm:text-3xl xl:text-4xl">
            Welcome back
          </h1>
        </CardTitle>
        <CardDescription className="text-sm">
          Sign in to your SurveyFlow account
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-6 sm:px-7 sm:pb-7 md:px-8 md:pb-8">
        <form
          className="flex w-full min-w-0 flex-col gap-3.5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <TanStackFormField
                field={field}
                fieldType={FormFieldType.INPUT}
                label="Email address"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="you@yourcompany.com"
                required
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <TanStackFormField
                field={field}
                fieldType={FormFieldType.PASSWORD}
                label="Password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                required
              />
            )}
          </form.Field>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <form.Field name="remember">
              {(field) => (
                <TanStackFormField
                  field={field}
                  fieldType={FormFieldType.CHECKBOX}
                  label="Remember me"
                  labelClassName="font-medium"
                />
              )}
            </form.Field>

            <Link
              to="/auth/forgot-password"
              className="rounded-md font-semibold text-primary text-sm transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl font-bold">
            Sign In
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

          <p className="mx-auto max-w-sm text-center text-muted-foreground text-sm leading-6">
            By signing in, you agree to our{" "}
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
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
