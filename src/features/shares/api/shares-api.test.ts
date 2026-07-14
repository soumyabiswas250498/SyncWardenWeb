import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "@/mocks/server";
import { getErrorCode } from "@/lib/get-error-message";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  SHARE_MAX_CONTENT_BYTES,
  ShareTooLargeError,
  createShare,
  shareContentByteLength,
} from "./shares-api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

describe("createShare", () => {
  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("counts UTF-8 bytes, not string length", () => {
    // "€" is one JS char but three UTF-8 bytes.
    expect(shareContentByteLength("€")).toBe(3);
    expect(shareContentByteLength("abc")).toBe(3);
  });

  it("rejects oversized content locally with the server's SHARE_TOO_LARGE code", async () => {
    let requested = false;
    server.use(
      http.post(`${API_BASE_URL}/shares`, () => {
        requested = true;
        return HttpResponse.json({ success: true, message: "ok", data: {} });
      }),
    );

    // 34_000 "€" chars = 102_000 bytes: over the byte limit while the string
    // length (34_000) is far below it.
    const content = "€".repeat(34_000);
    expect(content.length).toBeLessThan(SHARE_MAX_CONTENT_BYTES);

    const attempt = createShare({ content });
    await expect(attempt).rejects.toBeInstanceOf(ShareTooLargeError);
    await expect(attempt).rejects.toSatisfy(
      (error: unknown) => getErrorCode(error) === "SHARE_TOO_LARGE",
    );
    expect(requested).toBe(false);
  });

  it("omits targetDeviceIds when broadcasting and sends it when targeting", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE_URL}/shares`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          {
            success: true,
            message: "ok",
            data: {
              share: {
                id: "share-1",
                userId: "u1",
                senderDeviceId: "device-1",
                contentType: "text",
                content: "hi",
                deliveries: [],
                createdAt: new Date().toISOString(),
                expiresAt: new Date().toISOString(),
              },
            },
          },
          { status: 201 },
        );
      }),
    );

    await createShare({ content: "hi" });
    await createShare({ content: "hi", targetDeviceIds: [] });
    await createShare({ content: "hi", targetDeviceIds: ["device-2"] });

    expect(bodies[0]).not.toHaveProperty("targetDeviceIds");
    expect(bodies[1]).not.toHaveProperty("targetDeviceIds");
    expect(bodies[2]).toMatchObject({ targetDeviceIds: ["device-2"], contentType: "text" });
  });
});
