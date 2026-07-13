import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { sendHeartbeat } from "../api/devices-api";
import type { DeviceStatus } from "../types";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Report device presence every 30s while the app is open and visible.
 * Pauses when the tab is hidden and fires an immediate beat on becoming
 * visible again. Only runs for device-scoped sessions (heartbeat requires
 * the device's own token). Status starts at "yellow" — green/local-network
 * detection arrives later with WebRTC.
 */
export const useHeartbeat = (status: DeviceStatus = "yellow"): void => {
  const scope = useAuthStore((state) => state.scope);
  const deviceId = useAuthStore((state) => state.deviceId);

  useEffect(() => {
    if (scope !== "device" || !deviceId) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | undefined;

    const beat = () => {
      void sendHeartbeat(deviceId, { status }).catch(() => {
        // Presence is best-effort; the response interceptor handles a
        // revoked/expired device.
      });
    };

    const start = () => {
      beat();
      timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    if (!document.hidden) {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scope, deviceId, status]);
};
