import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Define color palettes
const colorPalettes = {
  gray: "bg-gray-100 text-gray-800 dark:bg-transparent dark:text-gray-400 border border-gray-400",
  green:
    "bg-primary/15 text-primary dark:bg-transparent dark:text-primary border border-primary/40",
  red: "bg-red-100 text-red-800 dark:bg-transparent dark:text-red-400 border border-red-400",
  yellow:
    "bg-yellow-100 text-yellow-800 dark:bg-transparent dark:text-yellow-400 border border-yellow-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-transparent dark:text-blue-400 border border-blue-400",
  purple:
    "bg-purple-100 text-purple-800 dark:bg-transparent dark:text-purple-400 border border-purple-400",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-transparent dark:text-orange-400 border border-orange-400",
  amber:
    "bg-amber-100 text-amber-800 dark:bg-transparent dark:text-amber-400 border border-amber-400",
  rose: "bg-rose-100 text-rose-800 dark:bg-transparent dark:text-rose-400 border border-rose-400",
  fuchsia:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-transparent dark:text-fuchsia-400 border border-fuchsia-400",
  lime: "bg-lime-100 text-lime-800 dark:bg-transparent dark:text-lime-400 border border-lime-400",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-transparent dark:text-cyan-400 border border-cyan-400",
  emerald:
    "bg-primary/15 text-primary dark:bg-transparent dark:text-primary border border-primary/40",
  teal: "bg-teal-100 text-teal-800 dark:bg-transparent dark:text-teal-400 border border-teal-400",
};

// Categorize variants by their color palette - Survey-specific mappings
const variantColorMappings = {
  green: [
    "success",
    "published",
    "active",
    "verified",
    "completed",
    "true",
    "yes",
    "accepted",
    "complete",
    "new",
  ],
  red: [
    "error",
    "closed",
    "inactive",
    "failed",
    "deleted",
    "false",
    "no",
    "damaged",
    "incomplete",
    "unverified",
  ],
  yellow: ["warning", "draft", "pending", "scheduled", "suspended"],
  blue: ["info", "preview", "testing", "paused", "dispatched"],
  purple: ["archived", "template", "basic", "invoice", "delivered"],
  orange: ["cashless", "returned", "manual"],
  amber: ["pending", "partial"],
  rose: ["urgent", "critical"],
  fuchsia: ["disposed"],
  lime: ["collected", "consolidated"],
  cyan: ["received", "processing"],
  emerald: ["converted"],
  teal: ["reviewed"],
  gray: ["default", "none", "unknown"],
};

// Generate variant object
const generateVariants = () => {
  const variants = {};

  // First, add direct color palette access (e.g., variant="red", variant="blue")
  Object.entries(colorPalettes).forEach(([color, styles]) => {
    variants[color] = styles;
  });

  // Then loop through each color group for semantic variants
  Object.entries(variantColorMappings).forEach(([color, variantList]) => {
    // For each variant, assign the color palette
    variantList.forEach((variant) => {
      variants[variant] = colorPalettes[color];
    });
  });

  return variants;
};

const badgeVariants = cva(
  "cursor-pointer inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: generateVariants(),
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const CustomBadge = ({ children, variant, className, ...props }) => {
  // Auto-detect variant if not provided
  const autoVariant =
    typeof children === "string"
      ? children.toLowerCase().replace(/\s+/g, "")
      : variant;

  return (
    <div
      className={cn(
        badgeVariants({
          variant: variant || autoVariant,
          className,
        })
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default CustomBadge;
