import { FileQuestion, Mail, Shield, HelpCircle, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Unified Footer Component
 * KISS + DRY + Production-ready
 */

const BRAND = {
  name: "SurveyFlow",
  proName: "SurveyFlow",
  company: "surveytool.co",
  email: "support@surveytool.co",
};

const FOOTER_LINKS = [
  {
    label: "Privacy",
    href: "#",
    icon: Shield,
  },
  {
    label: "Terms",
    href: "#",
    icon: FileQuestion,
  },
  {
    label: "Help",
    href: "#",
    icon: HelpCircle,
  },
  {
    label: "Contact",
    href: `#`,
    icon: Mail,
  },
];

export function Footer({ variant = "default", className }) {
  const year = new Date().getFullYear();

  /* -----------------------------------------------------
   * Minimal Footer
   * --------------------------------------------------- */

  if (variant === "minimal") {
    return (
      <footer
        className={cn(
          "mt-0 lg:mt-auto w-full border-t border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80",
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 sm:gap-2 font-semibold text-foreground">
              {/* <FileQuestion className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" /> */}
              <span className="whitespace-nowrap">{BRAND.name}</span>
            </div>

            <span className="hidden xs:inline text-muted-foreground/50">•</span>

            <span className="hidden xs:inline text-center sm:whitespace-nowrap">
              {BRAND.company}
            </span>

            <span className="hidden xs:inline text-muted-foreground/50">•</span>

            <span className="whitespace-nowrap">© {year}</span>
          </div>
        </div>
      </footer>
    );
  }

  /* -----------------------------------------------------
   * Default Footer
   * --------------------------------------------------- */

  return (
    <footer
      className={cn(
        "mt-0 lg:mt-auto w-full border-t border-border bg-background",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-4">
        {/* Main Row */}
        <div className="flex flex-col items-center text-center gap-3 sm:gap-4 text-xs sm:text-sm lg:flex-row lg:items-center lg:justify-between lg:text-left">
          {/* Branding */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {/* <FileQuestion className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" /> */}

            <div className="flex flex-col leading-tight">
              {/* <span className="font-bold text-sm sm:text-base text-foreground">
                {BRAND.proName}
              </span> */}

              <span className="text-sm text-muted-foreground">
                Powered by{" "}
                <span className="text-muted-foreground">{BRAND.company}</span>
              </span>
            </div>
          </div>

          {/* Links (Desktop & Tablet) */}
          <nav className="hidden lg:flex items-center gap-4 lg:gap-5">
            {FOOTER_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Copyright */}
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground order-last sm:order-0">
            <span className="whitespace-nowrap">© {year}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline whitespace-nowrap">
              All Rights Reserved
            </span>
          </div>
        </div>

        {/* Mobile Links */}
        <div className="mt-2 pt-2 border-t border-border/40 lg:hidden">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
