import { cn } from "../../../lib/utils";

/**
 * EditorMainCanvas
 * Central editing area with clean, document-like flow
 * Note: Parent container handles max-width and horizontal padding
 */
export function EditorMainCanvas({ children, className }) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
