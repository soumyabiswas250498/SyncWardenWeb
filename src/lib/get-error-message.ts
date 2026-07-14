import { isAxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";

export const getErrorMessage = (error: unknown, fallback = "Something went wrong"): string => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

/** Machine-readable error code from the API envelope, if present. */
export const getErrorCode = (error: unknown): string | undefined => {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data.code;
  }

  // Local errors that mirror server codes (e.g. client-side SHARE_TOO_LARGE
  // pre-validation) carry a `code` property so the UI maps them identically.
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return undefined;
};
