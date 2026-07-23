import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

/**
 * CopyButton Component
 * Shows a copy button with tooltip feedback
 * @param {string} textToCopy - The text to copy to clipboard
 * @param {string} tooltip - Tooltip text before copying
 * @param {string} successMessage - Tooltip text after successful copy
 * @param {string} variant - Button variant
 * @param {string} size - Button size
 * @param {string} className - Additional classes
 */
export function CopyButton({
  textToCopy,
  tooltip = "Copy to clipboard",
  successMessage = "Copied!",
  variant = "ghost",
  size = "icon",
  className = "",
  iconClassName = "h-4 w-4",
  onCopy,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);

      if (onCopy) {
        onCopy();
      }

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <Tooltip open={copied ? true : undefined}>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleCopy}
          className={className}
        >
          {copied ? (
            <Check className={`${iconClassName} text-primary`} />
          ) : (
            <Copy className={iconClassName} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{copied ? successMessage : tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
