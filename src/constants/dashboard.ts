import {
  BarChart3,
  Building2,
  ClipboardList,
  Clock3,
  CloudUpload,
  FilePlus2,
  Grid2X2,
  Heart,
  type LucideIcon,
  MessageCircleQuestion,
  Percent,
  ShoppingCart,
  UsersRound,
} from "lucide-react";

export type SurveyStatus = "active" | "draft" | "closed";

export type DashboardMetric = {
  title: string;
  value: string;
  trend: string;
  trendLabel: string;
  direction: "up" | "down";
  icon: LucideIcon;
  tone: "primary" | "chart";
  sparkline: number[];
};

export type RecentSurvey = {
  id: string;
  title: string;
  category: string;
  status: SurveyStatus;
  responses: number | null;
  responseRate: number | null;
  updatedAt: string;
  updatedTime: string;
  icon: LucideIcon;
  tone: "primary" | "chart";
};

export type ResponsePoint = {
  date: string;
  responses: number;
};

export type TopSurvey = {
  rank: number;
  title: string;
  responseRate: number;
  trend: string;
};

export type QuickAction = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "primary" | "chart";
};

export const dashboardMetrics: DashboardMetric[] = [
  {
    title: "Total Surveys",
    value: "128",
    trend: "12%",
    trendLabel: "vs last 30 days",
    direction: "up",
    icon: ClipboardList,
    tone: "primary",
    sparkline: [21, 26, 24, 32, 34, 39, 30, 36, 44, 41, 46, 43, 55],
  },
  {
    title: "Total Responses",
    value: "24,532",
    trend: "18%",
    trendLabel: "vs last 30 days",
    direction: "up",
    icon: UsersRound,
    tone: "chart",
    sparkline: [28, 36, 42, 41, 46, 43, 52, 47, 68, 58, 76, 70, 91],
  },
  {
    title: "Response Rate",
    value: "68.4%",
    trend: "6.7%",
    trendLabel: "vs last 30 days",
    direction: "up",
    icon: Percent,
    tone: "chart",
    sparkline: [34, 48, 58, 45, 39, 44, 50, 41, 39, 47, 62],
  },
  {
    title: "Avg. Completion Time",
    value: "4m 32s",
    trend: "8%",
    trendLabel: "vs last 30 days",
    direction: "down",
    icon: Clock3,
    tone: "primary",
    sparkline: [36, 42, 60, 65, 49, 55, 61, 66, 43, 49, 55, 52, 64],
  },
];

export const recentSurveys: RecentSurvey[] = [
  {
    id: "patient-satisfaction-q2",
    title: "Patient Satisfaction Q2 2024",
    category: "Customer Experience",
    status: "active",
    responses: 1248,
    responseRate: 72.6,
    updatedAt: "May 20, 2024",
    updatedTime: "2:15 PM",
    icon: ClipboardList,
    tone: "primary",
  },
  {
    id: "employee-engagement",
    title: "Employee Engagement Survey",
    category: "Human Resources",
    status: "active",
    responses: 3856,
    responseRate: 65.3,
    updatedAt: "May 19, 2024",
    updatedTime: "10:30 AM",
    icon: Heart,
    tone: "chart",
  },
  {
    id: "nps-may",
    title: "NPS Survey - May 2024",
    category: "Customer Experience",
    status: "active",
    responses: 2145,
    responseRate: 71.2,
    updatedAt: "May 18, 2024",
    updatedTime: "4:45 PM",
    icon: MessageCircleQuestion,
    tone: "primary",
  },
  {
    id: "product-feedback-beta",
    title: "Product Feedback - Beta",
    category: "Product",
    status: "draft",
    responses: null,
    responseRate: null,
    updatedAt: "May 16, 2024",
    updatedTime: "9:10 AM",
    icon: ShoppingCart,
    tone: "chart",
  },
  {
    id: "healthcare-services",
    title: "Healthcare Services Survey",
    category: "Operations",
    status: "closed",
    responses: 1892,
    responseRate: 64.8,
    updatedAt: "May 14, 2024",
    updatedTime: "11:20 AM",
    icon: Building2,
    tone: "primary",
  },
];

export const responsePoints: ResponsePoint[] = [
  { date: "Apr 22", responses: 540 },
  { date: "Apr 23", responses: 540 },
  { date: "Apr 24", responses: 720 },
  { date: "Apr 25", responses: 1180 },
  { date: "Apr 26", responses: 910 },
  { date: "Apr 27", responses: 900 },
  { date: "Apr 28", responses: 850 },
  { date: "Apr 29", responses: 1490 },
  { date: "Apr 30", responses: 1010 },
  { date: "May 1", responses: 900 },
  { date: "May 2", responses: 1550 },
  { date: "May 3", responses: 1420 },
  { date: "May 4", responses: 2630 },
  { date: "May 5", responses: 1610 },
  { date: "May 6", responses: 910 },
  { date: "May 7", responses: 1430 },
  { date: "May 8", responses: 1180 },
  { date: "May 9", responses: 880 },
  { date: "May 10", responses: 980 },
  { date: "May 11", responses: 720 },
  { date: "May 12", responses: 1280 },
  { date: "May 13", responses: 980 },
  { date: "May 14", responses: 1180 },
  { date: "May 20", responses: 2060 },
];

export const topSurveys: TopSurvey[] = [
  {
    rank: 1,
    title: "Patient Satisfaction Q2 2024",
    responseRate: 72.6,
    trend: "9.3%",
  },
  {
    rank: 2,
    title: "NPS Survey - May 2024",
    responseRate: 71.2,
    trend: "7.8%",
  },
  {
    rank: 3,
    title: "Employee Engagement Survey",
    responseRate: 65.3,
    trend: "5.6%",
  },
  {
    rank: 4,
    title: "Healthcare Services Survey",
    responseRate: 64.8,
    trend: "4.1%",
  },
  {
    rank: 5,
    title: "Product Feedback - Beta",
    responseRate: 58.2,
    trend: "3.2%",
  },
];

export const quickActions: QuickAction[] = [
  {
    title: "Create Survey",
    description: "Build a new survey from scratch",
    icon: FilePlus2,
    tone: "primary",
  },
  {
    title: "Import Contacts",
    description: "Upload or sync your contact list",
    icon: CloudUpload,
    tone: "chart",
  },
  {
    title: "Browse Templates",
    description: "Explore expert-made survey templates",
    icon: Grid2X2,
    tone: "primary",
  },
  {
    title: "View Analytics",
    description: "Dive into detailed insights and reports",
    icon: BarChart3,
    tone: "chart",
  },
];
