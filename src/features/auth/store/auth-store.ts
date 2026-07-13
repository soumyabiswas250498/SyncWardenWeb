import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens, AuthUser } from "../types";

/**
 * Session scope:
 * - "user": tokens minted by /auth/login. Refresh token persists in
 *   localStorage (survives reload before the browser is a registered device).
 * - "device": tokens minted by /devices/register. Sender-constrained via DPoP;
 *   the refresh token lives ONLY in IndexedDB next to the device key, never
 *   here. Every request carries a fresh DPoP proof.
 */
export type SessionScope = "user" | "device";

interface AuthState {
  user: AuthUser | null;
  /** In-memory only — never persisted (see partialize). */
  accessToken: string | null;
  /** Persisted only for user-scoped sessions; null when scope is "device". */
  refreshToken: string | null;
  scope: SessionScope;
  deviceId: string | null;
  isAuthenticated: boolean;
  /** True while SessionBootstrap is restoring a session on load. */
  isBootstrapping: boolean;
  /** One-shot message shown on the signin/registration screens. */
  sessionNotice: string | null;
  setSession: (tokens: AuthTokens, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  setDeviceSession: (accessToken: string, deviceId: string) => void;
  setBootstrapping: (isBootstrapping: boolean) => void;
  setSessionNotice: (sessionNotice: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      scope: "user",
      deviceId: null,
      isAuthenticated: false,
      isBootstrapping: true,
      sessionNotice: null,
      setSession: (tokens, user) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          scope: "user",
          deviceId: null,
          isAuthenticated: true,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setDeviceSession: (accessToken, deviceId) =>
        set({
          accessToken,
          // Device refresh token is held in IndexedDB, not here.
          refreshToken: null,
          scope: "device",
          deviceId,
          isAuthenticated: true,
        }),
      setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
      setSessionNotice: (sessionNotice) => set({ sessionNotice }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          scope: "user",
          deviceId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "syncwarden-auth",
      // Access token is in-memory only. Device-scoped refresh tokens live in
      // IndexedDB, so only a user-scoped refresh token is ever persisted here.
      partialize: (state) => ({
        refreshToken: state.scope === "user" ? state.refreshToken : null,
        user: state.user,
        scope: state.scope,
        deviceId: state.deviceId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
