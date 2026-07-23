import { v4 as uuidv4 } from "uuid";

// New seed surveys focused on linear and non-linear flows
const seedSurveys = [
  {
    title: "New Employee Onboarding Feedback (Non-Linear)",
    description:
      "Branching flow to evaluate onboarding experience with conditional follow-ups and early exit for blockers.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#2563eb",
    thankYouMessage:
      "Thanks for helping us improve onboarding! Your feedback reaches the People team directly.",
    isWhitelistEnabled: false,
    currentVersion: 1,
    publishedVersion: null,
    captureMetadata: true,
  },
  {
    title: "Customer Satisfaction Pulse (Mostly Linear)",
    description:
      "Short pulse survey to measure satisfaction after recent interaction. Mostly linear with a conditional comment.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#0ea5e9",
    thankYouMessage: "Thank you for your time!",
    isWhitelistEnabled: true,
    currentVersion: 1,
    publishedVersion: null,
    captureMetadata: false,
  },
  {
    title: "Internal Tool Feedback (Advanced Non-Linear)",
    description:
      "Stress-test survey for navigation rules, section jumps, and visibility on internal tools usage.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#7c3aed",
    thankYouMessage: "We appreciate your feedback on our internal tools.",
    isWhitelistEnabled: true,
    currentVersion: 1,
    publishedVersion: null,
    captureMetadata: true,
  },
  {
    title: "Internet Experience Questionnaire",
    description:
      "Survey to understand internet usage, service performance, and future demand.",
    status: "draft",
    publicId: uuidv4(),
    themeColor: "#1d4ed8",
    thankYouMessage: "Thank you for sharing your internet experience!",
    isWhitelistEnabled: false,
    currentVersion: 1,
    publishedVersion: null,
    captureMetadata: true,
  },
];

export default seedSurveys;
