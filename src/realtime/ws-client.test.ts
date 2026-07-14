import { describe, expect, it } from "vitest";
import { buildWebSocketUrl, reconnectDelayMs } from "./ws-client";

describe("buildWebSocketUrl", () => {
  it("derives ws:// from an http API base and appends /ws with the ticket", () => {
    const url = new URL(buildWebSocketUrl("http://localhost:5001/api/v1", "abc123"));
    expect(url.protocol).toBe("ws:");
    expect(url.host).toBe("localhost:5001");
    expect(url.pathname).toBe("/api/v1/ws");
    expect(url.searchParams.get("ticket")).toBe("abc123");
  });

  it("derives wss:// from an https API base", () => {
    expect(buildWebSocketUrl("https://sync.example.com/api/v1", "t")).toMatch(
      /^wss:\/\/sync\.example\.com\/api\/v1\/ws\?ticket=t$/,
    );
  });

  it("tolerates a trailing slash on the base URL", () => {
    expect(new URL(buildWebSocketUrl("http://localhost:5001/api/v1/", "t")).pathname).toBe(
      "/api/v1/ws",
    );
  });
});

describe("reconnectDelayMs", () => {
  const noJitter = () => 0.5; // midpoint => exact base delay

  it("backs off exponentially from ~1s", () => {
    expect(reconnectDelayMs(0, noJitter)).toBe(1_000);
    expect(reconnectDelayMs(1, noJitter)).toBe(2_000);
    expect(reconnectDelayMs(2, noJitter)).toBe(4_000);
    expect(reconnectDelayMs(4, noJitter)).toBe(16_000);
  });

  it("caps at 30s even for huge attempt counts", () => {
    expect(reconnectDelayMs(5, noJitter)).toBe(30_000);
    expect(reconnectDelayMs(50, noJitter)).toBe(30_000);
  });

  it("jitters within ±25% of the base delay", () => {
    expect(reconnectDelayMs(0, () => 0)).toBe(750);
    expect(reconnectDelayMs(0, () => 1)).toBe(1_250);
  });
});
