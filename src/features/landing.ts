import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  FileDown,
  LockKeyhole,
  MessageSquareText,
  MessagesSquare,
  QrCode,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";

/** Section IDs used by the landing page, navbar, and smooth-scroll events. */
export const landingSectionIds = [
  "home",
  "features",
  "templates",
  "pricing",
  "resources",
] as const;

export type LandingSectionId = (typeof landingSectionIds)[number];

export type LandingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type LandingTemplate = {
  title: string;
  description: string;
};

export type LandingPricingPlan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
};

export type LandingResource = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type LandingFaq = {
  question: string;
  answer: string;
};

/** Product capabilities shown in the Features section. */
export const landingFeatures = [
  {
    title: "Branded workspaces",
    description:
      "Give each client or department its own survey hub with logo, color, and workspace controls.",
    icon: BadgeCheck,
  },
  {
    title: "Survey builder",
    description:
      "Draft polished surveys fast with reusable question blocks and clear publishing states.",
    icon: MessageSquareText,
  },
  {
    title: "Whitelisted access",
    description:
      "Limit responses to approved contacts and keep sensitive feedback programs controlled.",
    icon: LockKeyhole,
  },
  {
    title: "SMS invitations",
    description:
      "Reach recipients where they already are with targeted SMS invites and follow-ups.",
    icon: MessagesSquare,
  },
  {
    title: "Analytics dashboard",
    description:
      "Track completion, trends, and survey health without digging through spreadsheets.",
    icon: BarChart3,
  },
  {
    title: "CSV exports",
    description:
      "Export clean response data for reporting, handoff, and downstream analysis.",
    icon: FileDown,
  },
] satisfies LandingFeature[];

/** Starter survey templates for common feedback workflows. */
export const landingTemplates = [
  "Customer satisfaction",
  "Employee engagement",
  "Event feedback",
  "Product feedback",
  "Market research",
  "Client intake",
].map((title, index) => ({
  title,
  description:
    index % 2 === 0
      ? "A ready-to-launch structure with proven questions, scoring, and response flow."
      : "A practical starting point your team can brand, edit, and publish in minutes.",
})) satisfies LandingTemplate[];

/** MVP-safe pricing copy until final packaging is decided. */
export const landingPricingPlans = [
  {
    name: "Starter",
    price: "Coming soon",
    description:
      "For small teams validating their first branded survey workflow.",
    features: ["1 workspace", "Core builder", "Link and QR sharing"],
  },
  {
    name: "Team",
    price: "Coming soon",
    description:
      "For teams running recurring feedback programs across contacts.",
    features: ["Multiple surveys", "SMS invitations", "Analytics dashboard"],
    featured: true,
  },
  {
    name: "Business",
    price: "Coming soon",
    description:
      "For organizations that need governance, exports, and support.",
    features: ["Client workspaces", "Whitelisted access", "CSV exports"],
  },
] satisfies LandingPricingPlan[];

/** Resource cards shown alongside the FAQ. */
export const landingResources = [
  {
    title: "Help center",
    description:
      "Short operational guides for building, sending, and reviewing surveys.",
    icon: BookOpen,
  },
  {
    title: "Survey design guide",
    description:
      "Question-writing patterns that improve response quality and completion.",
    icon: WandSparkles,
  },
  {
    title: "API documentation",
    description:
      "Integration notes for teams preparing automated survey workflows.",
    icon: QrCode,
  },
  {
    title: "Security checklist",
    description:
      "Controls for recipient access, organization data, and exports.",
    icon: ShieldCheck,
  },
] satisfies LandingResource[];

/** Customer-style proof labels for the hero trust marquee. */
export const trustedTeams = [
  "CareOps",
  "Northstar Clinics",
  "BrightHR",
  "FieldPulse",
  "Kinoko Studio",
  "Meridian CX",
] as const;

/** Stable keys for the visual star rating in the hero. */
export const ratingStars = [
  "star-1",
  "star-2",
  "star-3",
  "star-4",
  "star-5",
] as const;

/** Short FAQ entries for the Resources section. */
export const landingFaqs = [
  {
    question: "Can each client have a different branded survey experience?",
    answer:
      "Yes. SurveyFlow is built around workspaces, so client-facing surveys can carry their own brand details while your team keeps administration centralized.",
  },
  {
    question: "Can we restrict surveys to approved recipients?",
    answer:
      "Yes. Whitelisted access is part of the landing-page product direction and supports controlled feedback programs where open links are not enough.",
  },
  {
    question: "Is pricing final?",
    answer:
      "No. The current pricing section is intentionally MVP-safe and uses coming-soon labels until packaging is finalized.",
  },
] satisfies LandingFaq[];
