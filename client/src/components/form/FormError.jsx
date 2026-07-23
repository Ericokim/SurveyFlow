/**
 * FormError Component
 * Reusable error message display for form fields
 */
export function FormError({ error }) {
  if (!error) return null;

  return <p className="text-sm text-red-600">{error.message}</p>;
}
