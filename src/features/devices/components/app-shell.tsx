import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { SyncWardenLogo } from "@/features/auth/components/syncwarden-logo";
import { useHeartbeat } from "../hooks/use-heartbeat";

const initialsOf = (name?: string | null): string => {
  if (!name) return "SW";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "SW";
};

/**
 * Shell for device-scoped pages: brand top bar + presence heartbeat. Mounting
 * useHeartbeat here means presence is reported on any device-scoped page.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  useHeartbeat("yellow");

  const handleSignOut = () => {
    // Sign out of this browser without revoking the device server-side: keep
    // the key so a later sign-in can re-activate the device session.
    clearSession();
    toast.success("Signed out");
    void navigate(paths.signin, { replace: true });
  };

  return (
    <div className="sw-auth min-h-svh bg-background font-sans text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-card px-7 py-4">
        <Link to={paths.dashboard} className="flex items-center gap-2.5">
          <SyncWardenLogo tone="light" />
          <span className="text-[16.5px] font-bold tracking-tight">SyncWarden</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to={paths.devices}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Devices
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
          <span className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.55_0.15_250_/_0.14)] text-[13px] font-bold text-[oklch(0.5_0.14_250)]">
            {initialsOf(user?.name)}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[820px] px-6 py-9">{children}</main>
    </div>
  );
};
