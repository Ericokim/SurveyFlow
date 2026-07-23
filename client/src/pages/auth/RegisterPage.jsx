import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useRegister } from "../../lib/queries";
import { registerSchema } from "../../lib/schemas/authSchemas";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { FormError } from "../../components/form/FormError";

export function RegisterPage({ className, ...props }) {
  const navigate = useNavigate();
  const { mutate: register, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
    },
  });

  // Watch password fields for real-time comparison
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const onSubmit = (data) => {
    // Remove confirmPassword before sending to backend
    const { confirmPassword, ...registerData } = data;

    register(registerData, {
      onSuccess: () => {
        navigate({ to: "/surveys" });
      },
      onError: (err) => {
        // Parse backend validation errors and map to form fields
        if (err?.response?.data?.errors) {
          err.response.data.errors.forEach((error) => {
            setError(error.field, { message: error.message });
          });
        }
      },
    });
  };

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
            <CardTitle className="text-xl">Create an account</CardTitle>
            <CardDescription>
              Enter your information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    {...registerField("name")}
                  />
                  <FormError error={errors.name} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    {...registerField("email")}
                  />
                  <FormError error={errors.email} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Acme Inc"
                    {...registerField("companyName")}
                  />
                  <FormError error={errors.companyName} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...registerField("password")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with 1 uppercase, 1 lowercase,
                    and 1 number
                  </p>
                  <FormError error={errors.password} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      {...registerField("confirmPassword")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {/* Show real-time validation feedback */}
                  {confirmPassword && password && !errors.confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      ✓ Passwords match
                    </p>
                  )}
                  <FormError error={errors.confirmPassword} />
                </div>

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Creating account..." : "Create account"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="underline underline-offset-4">
                  Sign in
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
