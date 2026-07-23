/** Form-level error banner. Renders nothing when there is no message. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm"
    >
      {message}
    </p>
  );
}
