import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  LogOut,
  MessageSquareText,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

export const publicNavItems = [
  {
    name: "Home",
    title: "Home",
    to: "/",
    sectionId: "home",
    icon: Home,
  },
  {
    name: "Features",
    title: "Features",
    to: "/",
    sectionId: "features",
    icon: Sparkles,
  },
  {
    name: "Templates",
    title: "Templates",
    to: "/",
    sectionId: "templates",
    icon: LayoutTemplate,
  },
  {
    name: "Pricing",
    title: "Pricing",
    to: "/",
    sectionId: "pricing",
    icon: BadgeDollarSign,
  },
  {
    name: "Resources",
    title: "Resources",
    to: "/",
    sectionId: "resources",
    icon: BookOpen,
  },
] satisfies AppNavItem[];

export const appNavItems = [
  {
    name: "Dashboard",
    title: "Dashboard",
    to: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Surveys",
    title: "Surveys",
    to: "/app/surveys",
    icon: MessageSquareText,
  },
  {
    name: "Templates",
    title: "Templates",
    to: "/app/templates",
    icon: LayoutTemplate,
  },
  {
    name: "Contacts",
    title: "Contacts",
    to: "/app/contacts",
    icon: UsersRound,
  },
  {
    name: "Analytics",
    title: "Analytics",
    to: "/app/analytics",
    icon: BarChart3,
  },
] satisfies AppNavItem[];

export const navItems = publicNavItems;

export const authNavActions = {
  login: {
    title: "Log in",
    to: "/auth/login",
  },
  register: {
    title: "Get Started",
    to: "/auth/register",
  },
} as const;

export const workspaceNav = {
  name: "Acme Health",
  to: "/app/workspace/branding",
  icon: Building2,
} as const;

export const userMenuItems = [
  {
    title: "Profile",
    to: "/app/profile",
    icon: UserRound,
  },
  {
    title: "Workspace Settings",
    to: "/app/workspace/branding",
    icon: Settings,
  },
  {
    title: "Notifications",
    to: "/app/notifications",
    icon: Bell,
  },
  {
    title: "Support",
    to: "/app/support",
    icon: LifeBuoy,
  },
  {
    title: "Log out",
    to: "/auth/login",
    icon: LogOut,
  },
] as const;
