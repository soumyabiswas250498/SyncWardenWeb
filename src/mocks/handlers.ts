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
import type {
  Device,
  DeviceListResponse,
  RegisterDeviceResponse,
} from "@/features/devices/types";
import type {
  Share,
  ShareHistoryResponse,
  ShareListResponse,
  ShareResponse,
} from "@/features/shares/types";
import type { ApiSuccessResponse } from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MOCK_OTP = "123456";

export const mockDevice = (overrides: Partial<Device> = {}): Device => ({
  id: "device-1",
  name: "Work Laptop",
  platform: "chrome_extension",
  kind: "permanent",
  isRevoked: false,
  isActive: true,
  isExpired: false,
  lastKnownStatus: "yellow",
  lastSeenAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockShare = (overrides: Partial<Share> = {}): Share => ({
  id: "share-1",
  userId: "mock-user-id",
  senderDeviceId: "device-1",
  contentType: "text",
  content: "hello from mock",
  deliveries: [{ deviceId: "device-2", status: "pending" }],
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  ...overrides,
});

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

  http.get(`${API_BASE_URL}/devices`, () => {
    const response: ApiSuccessResponse<DeviceListResponse> = {
      success: true,
      message: "Devices fetched successfully",
      data: { devices: [] },
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/devices/register`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      kind: "permanent" | "temporary";
      iconCode?: string;
    };

    // Mirrors the backend: iconCode is required (1-32 chars after trim).
    if (!body.iconCode?.trim()) {
      return HttpResponse.json(
        { success: false, message: "Validation failed: iconCode: Icon code is required" },
        { status: 400 },
      );
    }

    const response: ApiSuccessResponse<RegisterDeviceResponse> = {
      success: true,
      message: "Device registered successfully",
      data: {
        device: mockDevice({ name: body.name, kind: body.kind, iconCode: body.iconCode }),
        accessToken: "device-access-token",
        refreshToken: "device-refresh-token",
      },
    };
    return HttpResponse.json(response, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/devices/:id`, async ({ request, params }) => {
    const body = (await request.json()) as { name?: string; iconCode?: string | null };

    if (body.name === undefined && body.iconCode === undefined) {
      return HttpResponse.json(
        { success: false, message: "At least one of name or iconCode must be provided" },
        { status: 400 },
      );
    }
    if (body.iconCode !== undefined && body.iconCode !== null && !body.iconCode.trim()) {
      return HttpResponse.json(
        { success: false, message: "Validation failed: iconCode: Icon code is required" },
        { status: 400 },
      );
    }

    const device = mockDevice({ id: String(params.id) });
    if (body.name !== undefined) device.name = body.name;
    if (body.iconCode !== undefined) {
      // `null` clears the code; the backend then omits the key entirely.
      if (body.iconCode === null) delete device.iconCode;
      else device.iconCode = body.iconCode;
    }

    const response: ApiSuccessResponse<{ device: Device }> = {
      success: true,
      message: "Device updated successfully",
      data: { device },
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/shares`, async ({ request }) => {
    const body = (await request.json()) as { content: string; targetDeviceIds?: string[] };

    // Mirrors the backend's UTF-8 byte limit (SHARE_MAX_CONTENT_BYTES).
    if (new TextEncoder().encode(body.content).byteLength > 100_000) {
      return HttpResponse.json(
        { success: false, message: "Share content is too large", code: "SHARE_TOO_LARGE" },
        { status: 400 },
      );
    }

    const targets = body.targetDeviceIds?.length ? body.targetDeviceIds : ["device-2"];
    const response: ApiSuccessResponse<ShareResponse> = {
      success: true,
      message: "Share created successfully",
      data: {
        share: mockShare({
          id: `share-${Math.random().toString(36).slice(2, 10)}`,
          content: body.content,
          deliveries: targets.map((deviceId) => ({ deviceId, status: "pending" as const })),
        }),
      },
    };
    return HttpResponse.json(response, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/shares/pending`, () => {
    const response: ApiSuccessResponse<ShareListResponse> = {
      success: true,
      message: "Pending shares fetched successfully",
      data: { shares: [] },
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/shares`, () => {
    const response: ApiSuccessResponse<ShareHistoryResponse> = {
      success: true,
      message: "Shares fetched successfully",
      data: { shares: [], nextCursor: null },
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.delete(`${API_BASE_URL}/shares/:id`, ({ params }) => {
    if (params.id === "missing-share") {
      return HttpResponse.json(
        { success: false, message: "Share not found", code: "SHARE_NOT_FOUND" },
        { status: 404 },
      );
    }
    return HttpResponse.json(
      { success: true, message: "Share deleted successfully" },
      { status: 200 },
    );
  }),
];
