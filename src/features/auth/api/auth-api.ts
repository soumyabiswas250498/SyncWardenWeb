import { api } from "@/lib/axios";
import type { ApiSuccessResponse } from "@/types/api";
import type { SigninFormValues } from "../schemas/signin-schema";
import type { ForgotPasswordFormValues } from "../schemas/forgot-password-schema";
import type {
  ForgotPasswordResetPayload,
  LoginResponse,
  OtpFlowData,
  RegisterPayload,
  RequestOtpPayload,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from "../types";

export const login = async (payload: SigninFormValues): Promise<LoginResponse> => {
  const response = await api.post<ApiSuccessResponse<LoginResponse>>("/auth/login", payload);
  return response.data.data;
};

export const registerUser = async (payload: RegisterPayload): Promise<OtpFlowData> => {
  const response = await api.post<ApiSuccessResponse<OtpFlowData>>("/auth/register", payload);
  return response.data.data;
};

export const requestOtp = async (payload: RequestOtpPayload): Promise<OtpFlowData> => {
  const response = await api.post<ApiSuccessResponse<OtpFlowData>>("/auth/request-otp", payload);
  return response.data.data;
};

export const verifyOtp = async (payload: VerifyOtpPayload): Promise<VerifyOtpResponse> => {
  const response = await api.post<ApiSuccessResponse<VerifyOtpResponse>>(
    "/auth/verify-otp",
    payload,
  );
  return response.data.data;
};

export const forgotPassword = async (payload: ForgotPasswordFormValues): Promise<void> => {
  await api.post<ApiSuccessResponse>("/auth/forgot-password", payload);
};

export const resetForgottenPassword = async (
  payload: ForgotPasswordResetPayload,
): Promise<void> => {
  await api.post<ApiSuccessResponse>("/auth/forgot-password/reset", payload);
};
