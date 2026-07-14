import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { ensureConnected } from "./ws-client";

/**
 * Holds the singleton realtime socket open while a device-scoped session is
 * active. Mounted in AppShell so every device page keeps the same connection;
 * there is deliberately no cleanup — the socket survives route changes and is
 * torn down by the ws-client's auth subscription on logout/device removal.
 */
export const useRealtimeConnection = (): void => {
  const scope = useAuthStore((state) => state.scope);
  const deviceId = useAuthStore((state) => state.deviceId);

  useEffect(() => {
    if (scope === "device" && deviceId) {
      ensureConnected();
    }
  }, [scope, deviceId]);
};
