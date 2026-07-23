import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AuthPageShell, GoogleMark } from "@/components/shared/AuthPageShell";
import {
  FormFieldType,
  TanStackFormField,
} from "@/components/shared/inputs/custom-form-field";
import { FormError } from "@/components/shared/inputs/form-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signInAuthContent } from "@/constants/auth";
import { toSafeRedirect } from "@/features/auth/redirect";
import { loginSchema } from "@/features/auth/schemas";
import { loginUser } from "@/features/auth/server";

/** The shared schema plus the UI-only "remember me" checkbox. */
const signInSchema = loginSchema.extend({ remember: z.boolean() });

type SignInValues = z.input<typeof signInSchema>;

export const Route = createFileRoute("/auth/login")({
  validateSearch: z.object({
    /**
     * Set by the workspace guard so sign-in returns you where you were.
     *
     * Attacker-controllable — a phishing link can put anything here. Narrowed
     * to same-origin paths at parse time and re-checked with `toSafeRedirect`
     * before navigating.
     */
    redirect: z
      .string()
      .regex(/^\/(?!\/)/)
      .optional()
      .catch(undefined),
  }),
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
  const { redirect } = Route.useSearch();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    } satisfies SignInValues,
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      try {
        const { workspaceSlug } = await loginUser({
          data: { email: value.email, password: value.password },
        });

        // Re-validated here, not just at parse time: never navigate to a
        // caller-supplied destination without confirming it stays on-origin.
        const safeRedirect = toSafeRedirect(redirect);

        if (safeRedirect) {
          await navigate({ href: safeRedirect });
          return;
        }

        await navigate({
          to: "/app/$workspaceSlug/dashboard",
          params: { workspaceSlug },
        });
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
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
          <FormError message={serverError} />

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
