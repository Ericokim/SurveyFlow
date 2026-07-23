import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/schemas/authSchemas";
import { useForgotPassword } from "@/lib/queries/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ForgotPasswordScreen() {
  const { mutate: forgotPassword, isPending } = useForgotPassword();
  const [sentTo, setSentTo] = useState("");

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data) => {
    forgotPassword(
      { email: data.email },
      { onSuccess: () => setSentTo(data.email) }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col gap-6 w-full max-w-md">
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
            {sentTo ? (
              <>
                <div className="flex justify-center mb-2">
                  <div className="rounded-full bg-primary/10 p-3">
                    <MailCheck className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  We&apos;ve sent a reset link to{" "}
                  <span className="font-medium text-foreground">{sentTo}</span>.
                  The link expires in 10 minutes.
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-xl">Forgot your password?</CardTitle>
                <CardDescription>
                  Enter your email and we&apos;ll send you a reset link
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {sentTo ? (
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSentTo("")}
                >
                  Try a different email
                </Button>
                <div className="text-center text-sm">
                  <Link
                    to="/login"
                    className="underline underline-offset-4 text-muted-foreground hover:text-foreground"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="flex flex-col gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="m@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isPending}
                    >
                      {isPending ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    <Link
                      to="/login"
                      className="underline underline-offset-4 text-muted-foreground hover:text-foreground"
                    >
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

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
