import { useEffect, type PropsWithChildren } from "react";
import { restoreSession } from "@/lib/axios";
import { useAuthStore } from "@/features/auth/store/auth-store";

/**
 * Restores a session on load. The access token is in-memory only, so on every
 * reload we exchange the persisted refresh token (user-scoped, in localStorage)
 * or the device refresh token (device-scoped, in IndexedDB) for a fresh access
 * token. Children render immediately; `isBootstrapping` gates ProtectedRoute so
 * there's no redirect flicker before the session is known.
 */
export const SessionBootstrap = ({ children }: PropsWithChildren) => {
  const setBootstrapping = useAuthStore((state) => state.setBootstrapping);

  useEffect(() => {
    let cancelled = false;
    void restoreSession().finally(() => {
      if (!cancelled) {
        setBootstrapping(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [setBootstrapping]);

  return children;
};
