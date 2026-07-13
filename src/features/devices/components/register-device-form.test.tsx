import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/mocks/server";
import { mockDevice } from "@/mocks/handlers";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getDeviceSession } from "@/lib/deviceIdentity";
import type { AuthUser } from "@/features/auth/types";
import { RegisterDeviceForm } from "./register-device-form";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const USER: AuthUser = {
  id: "user-1",
  name: "Sync Warden User",
  email: "user@example.com",
  phone: null,
  plan: "free",
  isEmailVerified: true,
  isPhoneVerified: false,
};

const signInUser = () => {
  useAuthStore
    .getState()
    .setSession({ accessToken: "user-access", refreshToken: "user-refresh" }, USER);
  useAuthStore.getState().setBootstrapping(false);
};

describe("RegisterDeviceForm", () => {
  beforeEach(() => {
    signInUser();
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("registers this browser and switches to a device session (happy path)", async () => {
    const user = userEvent.setup();
    let deviceListRequests = 0;
    server.use(
      http.get(`${API_BASE_URL}/devices`, () => {
        deviceListRequests += 1;
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { devices: [] },
        });
      }),
    );

    renderWithProviders(<RegisterDeviceForm />);

    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Device registered")).toBeInTheDocument();
    await waitFor(() => {
      expect(useAuthStore.getState().scope).toBe("device");
    });
    await waitFor(() => {
      expect(deviceListRequests).toBe(2);
    });
    expect(useAuthStore.getState().deviceId).toBe("device-1");
    expect(useAuthStore.getState().accessToken).toBe("device-access-token");
    // Device refresh token persisted to IndexedDB, not the store.
    expect(await getDeviceSession()).toEqual({
      deviceId: "device-1",
      refreshToken: "device-refresh-token",
    });
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it("sends the selected iconCode with the registration payload", async () => {
    const user = userEvent.setup();
    let registerBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API_BASE_URL}/devices/register`, async ({ request }) => {
        registerBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            success: true,
            message: "Device registered successfully",
            data: {
              device: mockDevice({ iconCode: String(registerBody.iconCode) }),
              accessToken: "device-access-token",
              refreshToken: "device-refresh-token",
            },
          },
          { status: 201 },
        );
      }),
      http.get(`${API_BASE_URL}/devices`, () =>
        HttpResponse.json({ success: true, message: "ok", data: { devices: [] } }),
      ),
    );

    renderWithProviders(<RegisterDeviceForm />);

    // "laptop" is preselected; pick a different icon to prove the choice is sent.
    await user.click(await screen.findByRole("button", { name: "Tablet" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Device registered")).toBeInTheDocument();
    expect(registerBody).toMatchObject({ iconCode: "tablet" });
  });

  it("disables icons already taken and defaults to the first free one", async () => {
    const user = userEvent.setup();
    let registerBody: Record<string, unknown> | undefined;
    server.use(
      http.get(`${API_BASE_URL}/devices`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            devices: [mockDevice({ id: "old-1", name: "Old Laptop", iconCode: "laptop" })],
          },
        }),
      ),
      http.post(`${API_BASE_URL}/devices/register`, async ({ request }) => {
        registerBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            success: true,
            message: "Device registered successfully",
            data: {
              device: mockDevice({ iconCode: String(registerBody.iconCode) }),
              accessToken: "device-access-token",
              refreshToken: "device-refresh-token",
            },
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<RegisterDeviceForm />);

    // "laptop" is used by another device: its button is disabled and the
    // default selection moves to the first free icon.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Laptop" })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Desktop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Device registered")).toBeInTheDocument();
    expect(registerBody).toMatchObject({ iconCode: "desktop" });
  });

  it("shows the device list to revoke on DEVICE_LIMIT_REACHED", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE_URL}/devices/register`, () =>
        HttpResponse.json(
          { success: false, message: "Device limit reached", code: "DEVICE_LIMIT_REACHED" },
          { status: 403 },
        ),
      ),
      http.get(`${API_BASE_URL}/devices`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { devices: [mockDevice({ id: "old-1", name: "Old Laptop" })] },
        }),
      ),
    );

    renderWithProviders(<RegisterDeviceForm />);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Device limit reached")).toBeInTheDocument();
    expect(await screen.findByText("Old Laptop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    expect(useAuthStore.getState().scope).toBe("user");
  });

  it("shows the key-loss recovery note when recovering", async () => {
    renderWithProviders(<RegisterDeviceForm keyLossRecovery />);

    expect(
      await screen.findByText(/device key wasn't found/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/previous device entry can be revoked/i)).toBeInTheDocument();
  });
});
