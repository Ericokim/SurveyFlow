import {
  CalendarDays,
  GraduationCap,
  type LucideIcon,
  MessageSquare,
  PieChart,
  Star,
  Users,
} from "lucide-react";

export type SurveyStatus = "published" | "draft" | "closed";
export type SurveyAccess = "Open Link" | "Whitelist Only";

export type SurveyOwner = {
  name: string;
  initials: string;
};

export type SurveyRow = {
  id: string;
  name: string;
  category: string;
  status: SurveyStatus;
  responses: number | null;
  completionRate: number | null;
  access: SurveyAccess;
  lastResponseDate: string | null;
  lastResponseTime: string | null;
  updatedAt: string;
  updatedTime: string;
  owner: SurveyOwner;
  icon: LucideIcon;
};

export const surveys: SurveyRow[] = [
  {
    id: "customer-satisfaction-q2",
    name: "Customer Satisfaction Q2 2024",
    category: "Customer Experience",
    status: "published",
    responses: 1248,
    completionRate: 62,
    access: "Open Link",
    lastResponseDate: "May 29, 2024",
    lastResponseTime: "2:15 PM",
    updatedAt: "May 29, 2024",
    updatedTime: "2:20 PM",
    owner: { name: "Sarah Johnson", initials: "SJ" },
    icon: Star,
  },
  {
    id: "employee-feedback",
    name: "Employee Feedback Survey",
    category: "Human Resources",
    status: "draft",
    responses: null,
    completionRate: null,
    access: "Whitelist Only",
    lastResponseDate: null,
    lastResponseTime: null,
    updatedAt: "May 27, 2024",
    updatedTime: "9:10 AM",
    owner: { name: "Michael Chen", initials: "MC" },
    icon: Users,
  },
  {
    id: "product-feedback-may",
    name: "Product Feedback – May",
    category: "Product Management",
    status: "published",
    responses: 856,
    completionRate: 71,
    access: "Open Link",
    lastResponseDate: "May 28, 2024",
    lastResponseTime: "4:42 PM",
    updatedAt: "May 28, 2024",
    updatedTime: "4:45 PM",
    owner: { name: "Emily Davis", initials: "ED" },
    icon: MessageSquare,
  },
  {
    id: "event-feedback-form",
    name: "Event Feedback Form",
    category: "Marketing",
    status: "closed",
    responses: 412,
    completionRate: 100,
    access: "Whitelist Only",
    lastResponseDate: "May 15, 2024",
    lastResponseTime: "11:03 AM",
    updatedAt: "May 15, 2024",
    updatedTime: "11:05 AM",
    owner: { name: "David Wilson", initials: "DW" },
    icon: CalendarDays,
  },
  {
    id: "training-evaluation",
    name: "Training Evaluation",
    category: "Learning & Development",
    status: "published",
    responses: 325,
    completionRate: 54,
    access: "Whitelist Only",
    lastResponseDate: "May 20, 2024",
    lastResponseTime: "1:18 PM",
    updatedAt: "May 21, 2024",
    updatedTime: "8:33 AM",
    owner: { name: "Jessica Lee", initials: "JL" },
    icon: GraduationCap,
  },
  {
    id: "market-research-2024",
    name: "Market Research 2024",
    category: "Research",
    status: "draft",
    responses: null,
    completionRate: null,
    access: "Open Link",
    lastResponseDate: null,
    lastResponseTime: null,
    updatedAt: "May 10, 2024",
    updatedTime: "3:22 PM",
    owner: { name: "Alex Martin", initials: "AM" },
    icon: PieChart,
  },
];

export type SurveyFilterOption = {
  value: string;
  label: string;
};

export const surveyStatusFilters: SurveyFilterOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
];

export const surveyOwnerFilters: SurveyFilterOption[] = [
  { value: "all", label: "All Owners" },
  { value: "Sarah Johnson", label: "Sarah Johnson" },
  { value: "Michael Chen", label: "Michael Chen" },
  { value: "Emily Davis", label: "Emily Davis" },
  { value: "David Wilson", label: "David Wilson" },
  { value: "Jessica Lee", label: "Jessica Lee" },
  { value: "Alex Martin", label: "Alex Martin" },
];

export const surveyAccessFilters: SurveyFilterOption[] = [
  { value: "all", label: "All Modes" },
  { value: "Open Link", label: "Open Link" },
  { value: "Whitelist Only", label: "Whitelist Only" },
];

export const surveyDateRangeFilters: SurveyFilterOption[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];
