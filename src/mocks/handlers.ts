import { HttpResponse, http } from "msw";
import type {
  ForgotPasswordResetPayload,
  LoginResponse,
  OtpFlowData,
  OtpPurpose,
  RegisterPayload,
  RequestOtpPayload,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from "@/features/auth/types";
import type { ApiSuccessResponse } from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MOCK_OTP = "123456";

export const handlers = [
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.password.length < 8) {
      return HttpResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 },
      );
    }

    const response: ApiSuccessResponse<LoginResponse> = {
      success: true,
      message: "User signed in successfully",
      data: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "mock-user-id",
          name: "Sync Warden User",
          email: body.email,
          phone: null,
          plan: "free",
          isEmailVerified: true,
          isPhoneVerified: false,
        },
      },
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as RegisterPayload;

    const response: ApiSuccessResponse<OtpFlowData> = {
      success: true,
      message: "Signup initiated successfully",
      data: {
        email: body.email,
        purpose: "email_verification",
        otp: MOCK_OTP,
        expiresInSeconds: 300,
      },
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/auth/request-otp`, async ({ request }) => {
    const body = (await request.json()) as RequestOtpPayload;

    const response: ApiSuccessResponse<OtpFlowData> = {
      success: true,
      message: "OTP generated successfully",
      data: {
        email: body.email,
        purpose: body.purpose,
        otp: MOCK_OTP,
        expiresInSeconds: 300,
      },
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/auth/verify-otp`, async ({ request }) => {
    const body = (await request.json()) as VerifyOtpPayload;

    if (body.otp !== MOCK_OTP) {
      return HttpResponse.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    const purpose: OtpPurpose = body.purpose;

    const data: VerifyOtpResponse =
      purpose === "email_verification"
        ? {
            email: body.email,
            purpose,
            verified: true,
            verificationAction: "signup_completed",
            user: {
              id: "mock-user-id",
              name: "Sync Warden User",
              email: body.email,
              phone: null,
              plan: "free",
              isEmailVerified: true,
              isPhoneVerified: false,
            },
          }
        : {
            email: body.email,
            purpose,
            verified: true,
            verificationAction: "forgot_password_verified",
            resetToken: "mock-reset-token",
          };

    const response: ApiSuccessResponse<VerifyOtpResponse> = {
      success: true,
      message: "OTP verified successfully",
      data,
    };

    return HttpResponse.json(response, { status: purpose === "email_verification" ? 201 : 200 });
  }),

  http.post(`${API_BASE_URL}/auth/forgot-password`, () => {
    return HttpResponse.json(
      { success: true, message: "If that email exists, a reset code has been sent" },
      { status: 200 },
    );
  }),

  http.post(`${API_BASE_URL}/auth/forgot-password/reset`, async ({ request }) => {
    const body = (await request.json()) as ForgotPasswordResetPayload;

    if (body.resetToken !== "mock-reset-token") {
      return HttpResponse.json(
        { success: false, message: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    return HttpResponse.json(
      { success: true, message: "Password reset successfully" },
      { status: 200 },
    );
  }),
];
