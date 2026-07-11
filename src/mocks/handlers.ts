import { HttpResponse, http } from "msw";
import type { LoginResponse } from "@/features/auth/types";
import type { ApiSuccessResponse } from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
];
