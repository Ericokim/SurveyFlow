import type { LucideIcon } from "lucide-react";

declare global {
  interface AppNavItem {
    name: string;
    title: string;
    to: string;
    hash?: string;
    sectionId?: "home" | "features" | "templates" | "pricing" | "resources";
    icon?: LucideIcon;
  }

  interface AppNavAction {
    title: string;
    to: string;
  }

  interface Company {
    id: string;
    name: string;
    slug: string;
    createdAt?: string;
    updatedAt?: string;
  }

  interface User {
    id: string;
    companyId: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt?: string;
    updatedAt?: string;
  }

  type UserRole = "owner" | "admin" | "member";

  type SurveyStatus = "draft" | "published" | "archived";

  interface SurveyQuestion {
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }

  interface Survey {
    id: string;
    companyId: string;
    title: string;
    description?: string;
    status: SurveyStatus;
    questions: SurveyQuestion[];
    createdBy: string;
    createdAt?: string;
    updatedAt?: string;
  }

  interface Recipient {
    id: string;
    companyId: string;
    surveyId: string;
    email?: string;
    phone?: string;
    name?: string;
    token: string;
    createdAt?: string;
    updatedAt?: string;
  }

  interface SurveyAnswer {
    questionId: string;
    value: unknown;
  }

  interface SurveyResponse {
    id: string;
    companyId: string;
    surveyId: string;
    recipientId?: string;
    answers: SurveyAnswer[];
    submittedAt: string;
  }

  type CommunicationChannel = "email" | "sms";
  type CommunicationStatus = "queued" | "sent" | "failed";

  interface Communication {
    id: string;
    companyId: string;
    surveyId?: string;
    recipientId?: string;
    channel: CommunicationChannel;
    to: string;
    status: CommunicationStatus;
    error?: string;
    sentAt?: string;
  }

  interface AuditLog {
    id: string;
    companyId: string;
    userId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
  }
}
