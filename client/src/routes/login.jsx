import {
  createFileRoute,
  Link,
  Navigate,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLogin } from "@/lib/queries";
import { loginSchema } from "@/lib/schemas/authSchemas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form/FormError";

/**
 * Login Route
 */

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute({ className, ...props }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { mutate: login, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("sessionExpiredNotified");
    sessionStorage.removeItem("authRedirecting");
    sessionStorage.removeItem("sessionExpiredAt");
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data) => {
    login(data, {
      onSuccess: () => navigate({ to: "/surveys" }),
    });
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/surveys" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div
        className={cn("flex flex-col gap-6 w-full max-w-md", className)}
        {...props}
      >
        {/* App Branding */}
        <div className="text-center">
          <img
            src="/brand/logos/surveyflow-wordmark.svg"
            alt="SurveyFlow"
            className="mx-auto h-9 w-auto"
          />
        </div>

        <Card className="shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your survey dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    {...register("email")}
                  />
                  <FormError error={errors.email} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormError error={errors.password} />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign in"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {/* <Link
                  to="/forgot-password"
                  className="underline underline-offset-4 text-muted-foreground hover:text-foreground"
                >
                  Forgot your password?
                </Link> */}
              </div>
              <div className="mt-2 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* App company*/}
        <div className="text-sm text-muted-foreground text-center">
          Powered by{" "}
          <span className="font-normal text-muted-foreground">
            surveytool.co
          </span>
        </div>
      </div>
    </div>
  );
}
