import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getErrorCode, getErrorMessage } from "@/lib/get-error-message";
import { createDpopProof, clearDeviceSession, getDeviceSession } from "@/lib/deviceIdentity";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _dpopRetry?: boolean;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const { accessToken, scope } = useAuthStore.getState();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Device-scoped sessions attach a fresh, single-use DPoP proof to every
  // request. Because retries re-run this interceptor, each attempt gets its
  // own proof automatically.
  if (scope === "device") {
    // htu must be the exact URL axios requests. api.getUri() applies axios's
    // own baseURL+url joining — `new URL(url, baseURL)` must NOT be used here,
    // as it drops the base path (/api/v1) for absolute-path urls like
    // "/devices". Query params are stripped by createDpopProof.
    config.headers.set("DPoP", await createDpopProof(config.method ?? "get", api.getUri(config)));
  }

  return config;
});

const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
];

const DEVICE_SESSION_KILL_CODES = new Set(["DEVICE_REVOKED", "DEVICE_EXPIRED"]);

const DPOP_ERROR_CODES = new Set(["DPOP_REQUIRED", "DPOP_INVALID", "DPOP_REPLAYED"]);

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const { scope } = useAuthStore.getState();
  const refreshUrl = `${API_BASE_URL}/auth/refresh-token`;

  const refreshToken =
    scope === "device"
      ? (await getDeviceSession())?.refreshToken
      : useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  // A device-scoped refresh also requires a DPoP proof. Use a raw axios call
  // (not `api`) so we don't recurse through the interceptors.
  const headers: Record<string, string> = {};
  if (scope === "device") {
    headers.DPoP = await createDpopProof("POST", refreshUrl);
  }

  const response = await axios.post<ApiSuccessResponse<{ accessToken: string }>>(
    refreshUrl,
    { refreshToken },
    { headers },
  );

  const { accessToken } = response.data.data;
  useAuthStore.getState().setAccessToken(accessToken);

  return accessToken;
};

/**
 * Upgrade the current session to device scope using a device session already
 * stored in IndexedDB (i.e. this browser is a registered device). Returns
 * true on success. A stale/rejected device session is cleared so the caller
 * falls back to the registration flow.
 */
export const activateDeviceSession = async (): Promise<boolean> => {
  const session = await getDeviceSession();
  if (!session) {
    return false;
  }
  try {
    const refreshUrl = `${API_BASE_URL}/auth/refresh-token`;
    const dpop = await createDpopProof("POST", refreshUrl);
    const response = await axios.post<ApiSuccessResponse<{ accessToken: string }>>(
      refreshUrl,
      { refreshToken: session.refreshToken },
      { headers: { DPoP: dpop } },
    );
    useAuthStore.getState().setDeviceSession(response.data.data.accessToken, session.deviceId);
    return true;
  } catch {
    await clearDeviceSession().catch(() => {});
    return false;
  }
};

/**
 * Restore an access token on app load. The persisted store already carries
 * the scope (user/device) and, for device sessions, the interceptors read the
 * refresh token from IndexedDB. Returns true if a session was restored.
 * On failure the session is cleared so the app falls back to signin.
 */
export const restoreSession = async (): Promise<boolean> => {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    return false;
  }
  try {
    await refreshAccessToken();
    return true;
  } catch {
    useAuthStore.getState().clearSession();
    return false;
  }
};

/**
 * Tear down a device session the server has invalidated (revoked/expired).
 * Also used by the WebSocket client when the socket closes with 4403.
 */
export const handleDeviceSessionKilled = async (): Promise<void> => {
  // Keep the key pair — the same browser can re-register — but drop the
  // device id + refresh token and the in-memory session.
  await clearDeviceSession().catch(() => {});
  useAuthStore.getState().clearSession();
  useAuthStore
    .getState()
    .setSessionNotice("This device is no longer authorized. Sign in to register it again.");
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config;
    const code = getErrorCode(error);

    // The server revoked or expired this device: no refresh can recover it.
    if (code && DEVICE_SESSION_KILL_CODES.has(code)) {
      await handleDeviceSessionKilled();
      return Promise.reject(error);
    }

    // A rejected DPoP proof is not a token problem — don't refresh. Re-sign
    // once (deleting the header makes the request interceptor mint a fresh
    // proof with a new jti/iat). If a fresh proof is also rejected the key
    // binding itself is broken, so tear down the device session and route the
    // user back to registration.
    if (
      error.response?.status === 401 &&
      code &&
      DPOP_ERROR_CODES.has(code) &&
      originalRequest &&
      useAuthStore.getState().scope === "device"
    ) {
      if (originalRequest._dpopRetry) {
        await handleDeviceSessionKilled();
        return Promise.reject(error);
      }
      originalRequest._dpopRetry = true;
      originalRequest.headers.delete("DPoP");
      return api(originalRequest);
    }

    const isExcludedFromRefresh = AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH.some((endpoint) =>
      originalRequest?.url?.includes(endpoint),
    );

    const { scope, refreshToken } = useAuthStore.getState();
    const canRefresh = scope === "device" || Boolean(refreshToken);

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isExcludedFromRefresh ||
      !canRefresh
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Single-flight: concurrent 401s share one refresh.
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const accessToken = await refreshPromise;
      originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
      // Drop any stale DPoP proof so the request interceptor mints a fresh one
      // for the replay.
      originalRequest.headers.delete("DPoP");

      return api(originalRequest);
    } catch (refreshError) {
      if (getErrorCode(refreshError) && DEVICE_SESSION_KILL_CODES.has(getErrorCode(refreshError)!)) {
        await handleDeviceSessionKilled();
      } else {
        useAuthStore.getState().clearSession();
      }
      return Promise.reject(new Error(getErrorMessage(refreshError, "Session expired")));
    }
  },
);
