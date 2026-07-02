import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  ChevronDown,
  Menu,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  appNavItems,
  authNavActions,
  navItems,
  userMenuItems,
  workspaceNav,
} from "@/features/data";
import { cn } from "@/lib/utils";

type NavbarVariant = "auto" | "public" | "auth" | "app";

type NavbarProps = {
  name?: string;
  variant?: NavbarVariant;
};

type LandingSectionId = NonNullable<AppNavItem["sectionId"]>;

const landingSectionIds = [
  "home",
  "features",
  "templates",
  "pricing",
  "resources",
] satisfies LandingSectionId[];

export type NavigationSection = {
  title: string;
  href: string;
  isActive?: boolean;
};

function getNavbarVariant(pathname: string, variant: NavbarVariant) {
  if (variant !== "auto") return variant;

  if (pathname.startsWith("/app")) return "app";
  if (pathname.startsWith("/auth")) return "auth";

  return "public";
}

function normalizeHash(hash: string) {
  return hash.startsWith("#") ? hash.slice(1) : hash;
}

function requestSectionScroll(sectionId?: string) {
  if (!sectionId) return;

  window.dispatchEvent(
    new CustomEvent("surveyflow:scroll-to-section", {
      detail: { sectionId },
    }),
  );
}

function isLandingPath(pathname: string) {
  return pathname === "/" || pathname === "/landingPage";
}

function isActiveNavItem(
  pathname: string,
  hash: string,
  item: AppNavItem,
  activeSectionId: LandingSectionId,
) {
  const currentHash = normalizeHash(hash);

  if (item.sectionId) {
    return isLandingPath(pathname) && item.sectionId === activeSectionId;
  }

  if (item.hash) {
    return pathname === item.to && currentHash === item.hash;
  }

  if (item.to === "/") {
    return pathname === item.to && !currentHash;
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function getSectionIdFromEvent(event: Event) {
  const sectionId = (event as CustomEvent<{ sectionId?: string }>).detail
    ?.sectionId;

  return landingSectionIds.find((id) => id === sectionId);
}

function useActiveLandingSection(enabled: boolean) {
  const [activeSectionId, setActiveSectionId] =
    useState<LandingSectionId>("home");
  const manualSelectionUntil = useRef(0);

  const activateSection = useCallback((sectionId: LandingSectionId) => {
    manualSelectionUntil.current = window.performance.now() + 1400;
    setActiveSectionId(sectionId);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setActiveSectionId("home");
      return;
    }

    function handleScrollRequest(event: Event) {
      const sectionId = getSectionIdFromEvent(event);

      if (sectionId) activateSection(sectionId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (window.performance.now() < manualSelectionUntil.current) return;

        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              Math.abs(first.boundingClientRect.top) -
              Math.abs(second.boundingClientRect.top),
          )[0];

        if (visibleEntry?.target.id) {
          const sectionId = landingSectionIds.find(
            (id) => id === visibleEntry.target.id,
          );

          if (sectionId) setActiveSectionId(sectionId);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.2, 0.45, 0.7],
      },
    );

    for (const sectionId of landingSectionIds) {
      const section = document.getElementById(sectionId);

      if (section) observer.observe(section);
    }

    window.addEventListener(
      "surveyflow:scroll-to-section",
      handleScrollRequest,
    );

    return () => {
      observer.disconnect();
      window.removeEventListener(
        "surveyflow:scroll-to-section",
        handleScrollRequest,
      );
    };
  }, [enabled, activateSection]);

  return { activeSectionId, activateSection };
}

function Logo({
  name,
  enableSectionScroll,
  onSectionChange,
  variant,
}: {
  name: string;
  enableSectionScroll: boolean;
  onSectionChange: (sectionId: LandingSectionId) => void;
  variant: Exclude<NavbarVariant, "auto">;
}) {
  const isAuth = variant === "auth";
  const isPublic = variant === "public";
  const isCompact = isAuth || isPublic;

  return (
    <Link
      to="/"
      onClick={(event) => {
        if (enableSectionScroll) {
          event.preventDefault();
          onSectionChange("home");
          requestSectionScroll("home");
        }
      }}
      className={cn(
        "flex shrink-0 items-center",
        isCompact ? "gap-2" : "gap-3",
      )}
    >
      <img
        src={
          isCompact
            ? "/brand/logos/surveyflow-mark.png"
            : "/brand/logos/surveyflow-wordmark.png"
        }
        alt={name}
        className={cn(
          isCompact ? "size-8 rounded-lg sm:size-9" : "h-20 w-auto",
        )}
      />
      {isCompact ? (
        <span className="font-extrabold text-xl text-foreground tracking-normal sm:text-2xl">
          {name}
        </span>
      ) : null}
    </Link>
  );
}

function DesktopNavigation({
  items,
  pathname,
  hash,
  activeSectionId,
  onSectionChange,
  enableSectionScroll = false,
}: {
  items: AppNavItem[];
  pathname: string;
  hash: string;
  activeSectionId: LandingSectionId;
  onSectionChange: (sectionId: LandingSectionId) => void;
  enableSectionScroll?: boolean;
}) {
  return (
    <NavigationMenu viewport={false} className="hidden lg:flex">
      <NavigationMenuList className="gap-5 xl:gap-7">
        {items.map((item) => {
          const active = isActiveNavItem(pathname, hash, item, activeSectionId);
          const className = cn(
            "relative flex items-center px-1 font-semibold text-sm transition-colors hover:text-foreground",
            active ? "text-primary" : "text-muted-foreground",
          );

          return (
            <NavigationMenuItem key={item.name}>
              <NavigationMenuLink asChild>
                {enableSectionScroll && item.sectionId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSectionChange(item.sectionId);
                      requestSectionScroll(item.sectionId);
                    }}
                    className={className}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{item.title}</span>
                    {active ? (
                      <span className="-bottom-px absolute inset-x-0 h-0.5 rounded-full bg-primary" />
                    ) : null}
                  </button>
                ) : (
                  <Link to={item.to} hash={item.hash} className={className}>
                    <span>{item.title}</span>
                    {active ? (
                      <span className="-bottom-px absolute inset-x-0 h-0.5 rounded-full bg-primary" />
                    ) : null}
                  </Link>
                )}
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MobileNavLink({
  item,
  pathname,
  hash,
  activeSectionId,
  onSectionChange,
  enableSectionScroll = false,
}: {
  item: AppNavItem;
  pathname: string;
  hash: string;
  activeSectionId: LandingSectionId;
  onSectionChange: (sectionId: LandingSectionId) => void;
  enableSectionScroll?: boolean;
}) {
  const Icon = item.icon;
  const active = isActiveNavItem(pathname, hash, item, activeSectionId);
  const className = cn(
    "flex w-full items-center gap-3 rounded-md px-2 py-2 font-medium text-sm",
    active ? "bg-primary/10 text-primary" : "text-muted-foreground",
  );
  const content = (
    <>
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      <span>{item.title}</span>
    </>
  );

  if (enableSectionScroll && item.sectionId) {
    return (
      <button
        type="button"
        onClick={() => {
          onSectionChange(item.sectionId);
          requestSectionScroll(item.sectionId);
        }}
        className={className}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={item.to} hash={item.hash} className={className}>
      {content}
    </Link>
  );
}

function MobileMenu({
  variant,
  pathname,
  hash,
  activeSectionId,
  onSectionChange,
}: {
  variant: Exclude<NavbarVariant, "auto">;
  pathname: string;
  hash: string;
  activeSectionId: LandingSectionId;
  onSectionChange: (sectionId: LandingSectionId) => void;
}) {
  const items = variant === "app" ? appNavItems : navItems;
  const enableSectionScroll = variant === "public";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel>
          {variant === "app" ? "Workspace navigation" : "Navigation"}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {items.map((item) => (
          <DropdownMenuItem key={item.name} asChild>
            <MobileNavLink
              item={item}
              pathname={pathname}
              hash={hash}
              activeSectionId={activeSectionId}
              onSectionChange={onSectionChange}
              enableSectionScroll={enableSectionScroll}
            />
          </DropdownMenuItem>
        ))}

        {variant === "public" ? (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to={authNavActions.login.to} className="w-full">
                {authNavActions.login.title}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                to={authNavActions.register.to}
                className="w-full font-semibold text-primary"
              >
                {authNavActions.register.title}
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PublicActions() {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Button asChild variant="ghost" size="sm">
        <Link to={authNavActions.login.to}>{authNavActions.login.title}</Link>
      </Button>

      <Button asChild size="sm">
        <Link to={authNavActions.register.to}>
          {authNavActions.register.title}
        </Link>
      </Button>
    </div>
  );
}

function AuthActions({ pathname }: { pathname: string }) {
  const isRegister = pathname.includes("/register");

  return (
    <Link
      to={isRegister ? "/auth/login" : "/auth/register"}
      className="hidden rounded-md font-semibold text-primary text-sm transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:inline-flex"
    >
      {isRegister ? "Sign in" : "Create account"}
    </Link>
  );
}

function AppActions() {
  const WorkspaceIcon = workspaceNav.icon ?? Building2;

  return (
    <div className="hidden items-center gap-7 lg:flex">
      <Button
        variant="ghost"
        size="icon"
        className="size-10 text-foreground hover:bg-transparent"
        aria-label="Search"
      >
        <Search className="size-6" />
      </Button>

      <div className="flex h-10 w-[88px] items-center rounded-full border bg-card p-1 shadow-xs">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-foreground"
          aria-label="Light mode"
        >
          <Sun className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full bg-muted text-muted-foreground"
          aria-label="Dark mode"
        >
          <Moon className="size-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="relative size-10 text-foreground hover:bg-transparent"
        aria-label="Notifications"
      >
        <Bell className="size-6" />

        <span className="-right-0.5 -top-1 absolute flex size-5 items-center justify-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
          3
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 min-w-[190px] gap-2 rounded-lg px-5 font-semibold text-foreground shadow-xs"
          >
            <WorkspaceIcon className="size-4" />
            {workspaceNav.name}
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to={workspaceNav.to}>Workspace settings</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/app/workspace/users">Users & roles</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/app/workspace/audit-logs">Audit logs</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 gap-2 rounded-full px-2">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary/10 font-bold text-primary">
                EK
              </AvatarFallback>
            </Avatar>

            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div>
              <p className="font-semibold">Eric Kimathi</p>
              <p className="font-normal text-muted-foreground text-xs">Owner</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {userMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <DropdownMenuItem key={item.title} asChild>
                <Link to={item.to} className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {item.title}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Navbar({ name = "SurveyFlow", variant = "auto" }: NavbarProps) {
  const location = useRouterState({
    select: (state) => state.location,
  });

  const pathname = location.pathname;
  const hash = location.hash;
  const resolvedVariant = getNavbarVariant(pathname, variant);
  const desktopItems = resolvedVariant === "app" ? appNavItems : navItems;
  const enableSectionScroll =
    resolvedVariant === "public" && isLandingPath(pathname);
  const { activeSectionId, activateSection } =
    useActiveLandingSection(enableSectionScroll);

  return (
    <motion.header
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-border/80 border-b bg-background/95 backdrop-blur-xl"
    >
      <div
        className={cn(
          "mx-auto grid max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:px-8",
          resolvedVariant === "app" ? "h-20 gap-6 px-6" : "h-16",
        )}
      >
        <Logo
          name={name}
          enableSectionScroll={enableSectionScroll}
          onSectionChange={activateSection}
          variant={resolvedVariant}
        />

        <div className="flex justify-center">
          {resolvedVariant !== "auth" ? (
            <DesktopNavigation
              items={desktopItems}
              pathname={pathname}
              hash={hash}
              activeSectionId={activeSectionId}
              onSectionChange={activateSection}
              enableSectionScroll={enableSectionScroll}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          {resolvedVariant === "public" ? <PublicActions /> : null}
          {resolvedVariant === "auth" ? (
            <AuthActions pathname={pathname} />
          ) : null}
          {resolvedVariant === "app" ? <AppActions /> : null}

          {resolvedVariant !== "auth" ? (
            <MobileMenu
              variant={resolvedVariant}
              pathname={pathname}
              hash={hash}
              activeSectionId={activeSectionId}
              onSectionChange={activateSection}
            />
          ) : null}
        </div>
      </div>
    </motion.header>
  );
}

export default Navbar;
