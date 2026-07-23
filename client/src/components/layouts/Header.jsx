import React, { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../hooks/useAuth";
import { useUser } from "../../hooks/useUser";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  LogOut,
  User as UserIcon,
  Settings,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUpdatePreferences } from "../../lib/queries/auth";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const Header = () => {
  const { logout } = useAuth();
  const { user, role } = useUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { mutate: updatePreferences, isPending: isUpdatingTheme } =
    useUpdatePreferences();

  const preferredTheme = user?.preferences?.theme || "light";
  const selectedTheme = theme || preferredTheme;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const localTheme = window.localStorage.getItem("vite-ui-theme");
    // Device-local preference always wins when present.
    if (localTheme) return;

    // Fallback only for fresh devices/browsers with no local theme.
    if (!preferredTheme) return;
    if (theme !== preferredTheme) {
      setTheme(preferredTheme);
    }
  }, [preferredTheme, theme, setTheme]);

  const handleLogout = () => {
    logout();
    // toast.success("Logged out successfully");
    // Use hard refresh to ensure complete state reset
    window.location.replace("/login");
  };

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);

    if (!user || preferredTheme === nextTheme) return;

    updatePreferences({
      theme: nextTheme,
    });
  };

  return (
    <header className="w-full bg-background border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-4 md:px-6 py-4 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/surveys" className="flex items-center" aria-label="SurveyFlow">
            <img
              src="/brand/logos/surveyflow-wordmark.svg"
              alt="SurveyFlow"
              className="h-8 sm:h-9 md:h-10 w-auto"
            />
          </Link>
          {/* <nav className="flex gap-4">
              <Link
                to="/surveys"
                className="text-sm text-gray-600 hover:text-gray-900"
                activeProps={{ className: "text-gray-900 font-medium" }}
              >
                Surveys
              </Link>
            </nav> */}
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 rounded-full h-10 w-10 border border-border bg-card hover:bg-accent"
              >
                <div className="h-9 w-9 rounded-full border border-primary/30 bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                  {user?.name?.[0]?.toUpperCase() || (
                    <UserIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-0">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-semibold text-foreground">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || role}
                </p>
              </div>
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Theme
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={
                          selectedTheme === "light" ? "default" : "outline"
                        }
                        size="sm"
                        className="h-8 px-2"
                        disabled={isUpdatingTheme}
                        onClick={() => handleThemeChange("light")}
                      >
                        <Sun className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>Light</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={
                          selectedTheme === "dark" ? "default" : "outline"
                        }
                        size="sm"
                        className="h-8 px-2"
                        disabled={isUpdatingTheme}
                        onClick={() => handleThemeChange("dark")}
                      >
                        <Moon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>Dark</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={
                          selectedTheme === "system" ? "default" : "outline"
                        }
                        size="sm"
                        className="h-8 px-2"
                        disabled={isUpdatingTheme}
                        onClick={() => handleThemeChange("system")}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>System</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="py-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={() => navigate({ to: "/settings" })}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
};

export default Header;
