import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordScreen } from "@/pages/auth/ForgotPasswordScreen";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordScreen,
});
