import { BarChart3, ShieldCheck, Tags } from "lucide-react";

export const authPreviewRows = [
  {
    title: "Customer satisfaction",
    tone: "text-chart-1 bg-chart-1/10",
    widthClassName: "w-48",
  },
  {
    title: "Event feedback",
    tone: "text-chart-4 bg-chart-4/10",
    widthClassName: "w-40",
  },
  {
    title: "Product insight",
    tone: "text-primary bg-primary/10",
    widthClassName: "w-36",
  },
] as const satisfies readonly AuthPreviewRow[];

export const authPreviewDots = Array.from(
  { length: 30 },
  (_, index) => `auth-preview-dot-${index}`,
);

export const signInAuthContent = {
  description: "Collect feedback, drive engagement, and make better decisions.",
  benefits: [
    {
      title: "Secure survey management",
      description:
        "Your data is protected with enterprise-grade security and privacy controls.",
      icon: ShieldCheck,
      tone: "text-chart-1 bg-chart-1/10",
    },
    {
      title: "Branded experiences",
      description:
        "Deliver on-brand surveys that build trust and strengthen your brand.",
      icon: Tags,
      tone: "text-primary bg-primary/10",
    },
    {
      title: "Powerful analytics",
      description:
        "Turn feedback into insights with real-time analytics and actionable reports.",
      icon: BarChart3,
      tone: "text-chart-1 bg-chart-1/10",
    },
  ],
} as const satisfies AuthMarketingContent;

export const signUpAuthContent = {
  description:
    "Create your workspace, invite your team, and launch branded surveys faster.",
  benefits: [
    {
      title: "Branded survey workspaces",
      description:
        "Create a workspace that keeps surveys, invites, branding, and reports organized.",
      icon: Tags,
      tone: "text-primary bg-primary/10",
    },
    {
      title: "Controlled respondent access",
      description:
        "Prepare private survey flows with team controls and respondent access rules.",
      icon: ShieldCheck,
      tone: "text-chart-1 bg-chart-1/10",
    },
    {
      title: "Analytics from day one",
      description:
        "Start every workspace with response tracking, completion views, and exports ready.",
      icon: BarChart3,
      tone: "text-primary bg-primary/10",
    },
  ],
} as const satisfies AuthMarketingContent;
