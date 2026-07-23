import { useState } from "react";
import { useValidateAccess } from "../../lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Shield } from "lucide-react";
import {
  ALREADY_COMPLETED_MESSAGE,
  isAlreadyCompletedMessage,
} from "../../lib/utils/respondentAccess";

/**
 * Whitelist Gate
 * Identifier validation for restricted surveys
 */

export function WhitelistGate({
  survey,
  publicId,
  onAccessGranted,
  onAlreadyCompleted,
  onAccessError,
}) {
  const [identifier, setIdentifier] = useState("");
  const { mutate: validateAccess, isPending, error } = useValidateAccess();
  const rawErrorMessage = error?.response?.data?.status?.message || "";
  const isAlreadyCompleted = isAlreadyCompletedMessage(rawErrorMessage);
  const errorMessage = isAlreadyCompleted
    ? ALREADY_COMPLETED_MESSAGE
    : rawErrorMessage ||
      "This email or phone is not approved for this closed-ended survey.";

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) return;

    validateAccess(
      { publicId, identifier: normalizedIdentifier },
      {
        onSuccess: (result) => {
          onAccessGranted(normalizedIdentifier, result);
        },
        onError: (requestError) => {
          const message =
            requestError?.response?.data?.status?.message ||
            "Unable to validate this survey access.";

          if (isAlreadyCompletedMessage(message)) {
            onAlreadyCompleted?.(normalizedIdentifier);
            return;
          }

          onAccessError?.(message);
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>{survey.title}</CardTitle>
          <CardDescription>
            This survey is restricted. Please enter your whitelisted email or
            phone to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Whitelisted Email or Phone</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="email@example.com or 25470000000"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isPending}
                autoFocus
                className={"placeholder:text-muted-foreground/70 placeholder:text-sm placeholder:items-center"}
              />
              {error && (
                <p className="text-sm text-red-600">
                  {errorMessage}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verifying..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
