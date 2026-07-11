import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});

const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
];

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post<ApiSuccessResponse<{ accessToken: string }>>(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
    { refreshToken },
  );

  const { accessToken } = response.data.data;
  useAuthStore.getState().setAccessToken(accessToken);

  return accessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config;

    const isExcludedFromRefresh = AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH.some((endpoint) =>
      originalRequest?.url?.includes(endpoint),
    );

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isExcludedFromRefresh ||
      !useAuthStore.getState().refreshToken
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const accessToken = await refreshPromise;
      originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);

      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(new Error(getErrorMessage(refreshError, "Session expired")));
    }
  },
);
