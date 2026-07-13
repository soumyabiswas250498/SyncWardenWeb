import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/mocks/server";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { generateDeviceKeys, saveDeviceSession, getDeviceSession } from "@/lib/deviceIdentity";
import { api } from "@/lib/axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const payloadOf = (dpop: string | null | undefined): { htm: string; htu: string; jti: string } => {
  if (!dpop) throw new Error("missing DPoP header");
  const payloadSeg = dpop.split(".")[1] ?? "";
  return JSON.parse(atob(payloadSeg.replaceAll("-", "+").replaceAll("_", "/"))) as {
    htm: string;
    htu: string;
    jti: string;
  };
};

const jtiOf = (dpop: string | null | undefined): string => payloadOf(dpop).jti;

const setDeviceSession = () => {
  useAuthStore.getState().setDeviceSession("device-access-token", "device-1");
  useAuthStore.getState().setBootstrapping(false);
};

describe("axios device-scoped interceptor", () => {
  beforeEach(async () => {
    useAuthStore.getState().clearSession();
    await generateDeviceKeys();
    await saveDeviceSession({ deviceId: "device-1", refreshToken: "device-refresh-token" });
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("attaches a fresh DPoP proof with a unique jti on every request", async () => {
    setDeviceSession();
    const seen: string[] = [];
    server.use(
      http.get(`${API_BASE_URL}/devices`, ({ request }) => {
        seen.push(request.headers.get("DPoP") ?? "");
        return HttpResponse.json({ success: true, message: "ok", data: { devices: [] } });
      }),
    );

    await api.get("/devices");
    await api.get("/devices");

    expect(seen).toHaveLength(2);
    expect(jtiOf(seen[0])).not.toBe(jtiOf(seen[1]));
  });

  it("signs htu as the exact request URL, including the /api/v1 base path", async () => {
    setDeviceSession();
    let proof: string | null = null;
    server.use(
      http.get(`${API_BASE_URL}/devices`, ({ request }) => {
        proof = request.headers.get("DPoP");
        return HttpResponse.json({ success: true, message: "ok", data: { devices: [] } });
      }),
    );

    await api.get("/devices", { params: { page: 1 } });

    const { htm, htu } = payloadOf(proof);
    expect(htm).toBe("GET");
    // Exact string the backend compares against: scheme://host + full path
    // (with the base path), query stripped.
    expect(htu).toBe(`${API_BASE_URL}/devices`);
  });

  it("refreshes once under concurrent 401s and replays with a new proof", async () => {
    setDeviceSession();
    let refreshCount = 0;
    const proofJtis: string[] = [];
    let firstAttempt = true;

    server.use(
      http.post(`${API_BASE_URL}/auth/refresh-token`, ({ request }) => {
        refreshCount += 1;
        // The refresh itself must carry a DPoP proof for device sessions.
        proofJtis.push(jtiOf(request.headers.get("DPoP")));
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { accessToken: "fresh-access-token" },
        });
      }),
      http.get(`${API_BASE_URL}/devices`, ({ request }) => {
        proofJtis.push(jtiOf(request.headers.get("DPoP")));
        if (firstAttempt) {
          firstAttempt = false;
          return HttpResponse.json({ success: false, message: "expired" }, { status: 401 });
        }
        return HttpResponse.json({ success: true, message: "ok", data: { devices: [] } });
      }),
    );

    // Two concurrent requests both hit the initial 401.
    await Promise.all([api.get("/devices"), api.get("/devices")]);

    expect(refreshCount).toBe(1);
    // Every proof jti (initial attempts, refresh, replay) is unique — no reuse.
    expect(new Set(proofJtis).size).toBe(proofJtis.length);
    expect(useAuthStore.getState().accessToken).toBe("fresh-access-token");
  });

  it("retries once with a fresh proof on a DPoP rejection, without refreshing", async () => {
    setDeviceSession();
    let refreshCount = 0;
    const proofJtis: string[] = [];
    let firstAttempt = true;

    server.use(
      http.post(`${API_BASE_URL}/auth/refresh-token`, () => {
        refreshCount += 1;
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { accessToken: "fresh-access-token" },
        });
      }),
      http.get(`${API_BASE_URL}/devices`, ({ request }) => {
        proofJtis.push(jtiOf(request.headers.get("DPoP")));
        if (firstAttempt) {
          firstAttempt = false;
          return HttpResponse.json(
            { success: false, message: "Invalid DPoP proof", code: "DPOP_INVALID" },
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, message: "ok", data: { devices: [] } });
      }),
    );

    const response = await api.get("/devices");

    expect(response.status).toBe(200);
    // Exactly two attempts, each with its own single-use proof.
    expect(proofJtis).toHaveLength(2);
    expect(proofJtis[0]).not.toBe(proofJtis[1]);
    // A proof rejection must not burn a token refresh.
    expect(refreshCount).toBe(0);
    expect(useAuthStore.getState().scope).toBe("device");
  });

  it("tears down the device session when the DPoP retry is also rejected", async () => {
    setDeviceSession();
    const proofJtis: string[] = [];

    server.use(
      http.get(`${API_BASE_URL}/devices`, ({ request }) => {
        proofJtis.push(jtiOf(request.headers.get("DPoP")));
        return HttpResponse.json(
          { success: false, message: "Invalid DPoP proof", code: "DPOP_INVALID" },
          { status: 401 },
        );
      }),
    );

    await expect(api.get("/devices")).rejects.toBeTruthy();

    // One retry only — two attempts total, then give up.
    expect(proofJtis).toHaveLength(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().sessionNotice).toMatch(/no longer authorized/i);
    // The device session is gone so the app falls back to registration.
    expect(await getDeviceSession()).toBeNull();
  });

  it("clears the session and sets a notice on DEVICE_REVOKED", async () => {
    setDeviceSession();
    server.use(
      http.get(`${API_BASE_URL}/devices`, () =>
        HttpResponse.json(
          { success: false, message: "Device revoked", code: "DEVICE_REVOKED" },
          { status: 403 },
        ),
      ),
    );

    await expect(api.get("/devices")).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().sessionNotice).toMatch(/no longer authorized/i);
    // Device session (id + refresh token) is cleared from IndexedDB…
    expect(await getDeviceSession()).toBeNull();
  });
});
