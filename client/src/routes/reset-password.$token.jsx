import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordScreen } from "@/pages/auth/ResetPasswordScreen";

export const Route = createFileRoute("/reset-password/$token")({
  component: ResetPasswordScreen,
});
