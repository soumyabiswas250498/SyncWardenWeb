import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paths } from "@/routes/paths";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { SyncWardenLogo } from "@/features/auth/components/syncwarden-logo";
import { useRealtimeConnection } from "@/realtime/use-realtime-connection";
import { useRealtimeStore } from "@/realtime/realtime-store";
import { useHeartbeat } from "../hooks/use-heartbeat";

const initialsOf = (name?: string | null): string => {
  if (!name) return "SW";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "SW";
};

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    "text-sm font-semibold hover:text-foreground",
    isActive ? "font-bold text-foreground" : "text-muted-foreground",
  );

interface AppShellProps {
  children: ReactNode;
  /**
   * "boxed" (default): centered content column for dashboard-style pages.
   * "full": edge-to-edge flex column filling the viewport (Messages screen).
   */
  layout?: "boxed" | "full";
}

/**
 * Shell for device-scoped pages: brand top bar, presence heartbeat, and the
 * singleton realtime socket. Mounting both hooks here means presence and
 * realtime delivery work on any device-scoped page.
 */
export const AppShell = ({ children, layout = "boxed" }: AppShellProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const connectionState = useRealtimeStore((state) => state.connectionState);

  useRealtimeConnection();
  // Align REST-reported presence with reality: the ws gateway marks us green
  // while connected, so don't have the heartbeat flap us back to yellow.
  useHeartbeat(connectionState === "open" ? "green" : "yellow");

  const handleSignOut = () => {
    // Sign out of this browser without revoking the device server-side: keep
    // the key so a later sign-in can re-activate the device session. The
    // ws-client's auth subscription closes the socket and clears share state.
    clearSession();
    toast.success("Signed out");
    void navigate(paths.signin, { replace: true });
  };

  return (
    <div
      className={cn(
        "sw-auth min-h-svh bg-background font-sans text-foreground",
        layout === "full" && "flex h-svh flex-col overflow-hidden",
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-7 py-4">
        <Link to={paths.messages} className="flex items-center gap-2.5">
          <SyncWardenLogo tone="light" />
          <span className="text-[16.5px] font-bold tracking-tight">SyncWarden</span>
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-4">
            <NavLink to={paths.messages} className={navLinkClass}>
              Messages
            </NavLink>
            <NavLink to={paths.devices} className={navLinkClass}>
              Devices
            </NavLink>
          </nav>
          <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
          <span className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.55_0.15_250_/_0.14)] text-[13px] font-bold text-[oklch(0.5_0.14_250)]">
            {initialsOf(user?.name)}
          </span>
        </div>
      </header>
      {layout === "full" ? (
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      ) : (
        <main className="mx-auto max-w-[820px] px-6 py-9">{children}</main>
      )}
    </div>
  );
};
