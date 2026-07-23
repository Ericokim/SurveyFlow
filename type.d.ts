import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

declare global {
  interface AppNavItem {
    name: string;
    title: string;
    to: string;
    hash?: string;
    sectionId?: "home" | "features" | "templates" | "pricing" | "resources";
    icon?: LucideIcon;
    /** Listed in the navbar but not yet routable. */
    pending?: boolean;
  }

  interface AppNavAction {
    title: string;
    to: string;
  }

  interface AuthBenefit {
    title: string;
    description: string;
    icon: LucideIcon;
    tone?: string;
  }

  interface AuthPreviewRow {
    title: string;
    tone: string;
    widthClassName: string;
  }

  interface AuthMarketingContent {
    title?: ReactNode;
    description: string;
    benefits: readonly AuthBenefit[];
  }

  interface Company {
    id: string;
    name: string;
    slug: string;
    createdAt?: string;
    updatedAt?: string;
  }

  /**
   * A person, not a tenant member. `companyId` and `role` deliberately live on
   * `Membership` instead — a user belongs to many workspaces with a different
   * role in each. See docs/specs/2026-07-23-multitenant-foundation.md.
   */
  interface User {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
  }

  /** The join between a person and a workspace. */
  interface Membership {
    id: string;
    userId: string;
    companyId: string;
    role: UserRole;
    invitedBy?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  type UserRole = "owner" | "admin" | "editor" | "viewer";

  type SurveyStatus = "draft" | "published" | "closed";

  type SurveyAccess = "open" | "whitelist";

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
