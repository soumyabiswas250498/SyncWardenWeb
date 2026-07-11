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
