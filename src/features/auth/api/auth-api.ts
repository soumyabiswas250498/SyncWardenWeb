import { api } from "@/lib/axios";
import type { ApiSuccessResponse } from "@/types/api";
import type { LoginFormValues } from "../schemas/login-schema";
import type { LoginResponse } from "../types";

export const login = async (payload: LoginFormValues): Promise<LoginResponse> => {
  const response = await api.post<ApiSuccessResponse<LoginResponse>>("/auth/login", payload);
  return response.data.data;
};
