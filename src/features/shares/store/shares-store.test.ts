import { beforeEach, describe, expect, it } from "vitest";
import type { Share, ShareRecord } from "../types";
import { selectTimeline, useSharesStore } from "./shares-store";

const wsShare = (overrides: Partial<ShareRecord> = {}): ShareRecord => ({
  id: "share-1",
  senderDeviceId: "device-2",
  contentType: "text",
  content: "hello",
  createdAt: "2026-07-13T10:00:00.000Z",
  ...overrides,
});

const restShare = (overrides: Partial<Share> = {}): Share => ({
  id: "share-1",
  userId: "user-1",
  senderDeviceId: "device-2",
  contentType: "text",
  content: "hello",
  deliveries: [{ deviceId: "device-1", status: "pending" }],
  createdAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2026-07-14T10:00:00.000Z",
  ...overrides,
});

describe("shares store", () => {
  beforeEach(() => {
    useSharesStore.getState().reset();
  });

  it("dedupes by shareId: only the first upsert reports a new share", () => {
    const store = useSharesStore.getState();
    expect(store.upsertShare(wsShare())).toBe(true);
    // At-least-once redelivery of the same id is not new.
    expect(store.upsertShare(wsShare())).toBe(false);
    expect(Object.keys(useSharesStore.getState().shares)).toHaveLength(1);
  });

  it("keeps REST-only fields when a ws duplicate arrives afterwards", () => {
    const store = useSharesStore.getState();
    store.upsertShares([restShare()]);
    store.upsertShare(wsShare());

    const merged = useSharesStore.getState().shares["share-1"];
    expect(merged?.deliveries).toEqual([{ deviceId: "device-1", status: "pending" }]);
    expect(merged?.expiresAt).toBe("2026-07-14T10:00:00.000Z");
  });

  it("upgrades a ws-received share with delivery data from REST", () => {
    const store = useSharesStore.getState();
    store.upsertShare(wsShare());
    store.upsertShares([
      restShare({ deliveries: [{ deviceId: "device-1", status: "delivered" }] }),
    ]);

    expect(useSharesStore.getState().shares["share-1"]?.deliveries).toEqual([
      { deviceId: "device-1", status: "delivered" },
    ]);
  });

  it("still recognizes a share as seen after local deletion", () => {
    const store = useSharesStore.getState();
    store.upsertShare(wsShare());
    store.removeShare("share-1");

    expect(useSharesStore.getState().shares["share-1"]).toBeUndefined();
    // Redelivery after deletion must not count as new (no duplicate ack side
    // effects, no resurrection as "unread").
    expect(useSharesStore.getState().upsertShare(wsShare())).toBe(false);
  });

  it("orders the merged timeline newest first", () => {
    const store = useSharesStore.getState();
    store.upsertShare(wsShare({ id: "older", createdAt: "2026-07-13T09:00:00.000Z" }));
    store.upsertShare(wsShare({ id: "newer", createdAt: "2026-07-13T11:00:00.000Z" }));

    const timeline = selectTimeline(useSharesStore.getState());
    expect(timeline.map((share) => share.id)).toEqual(["newer", "older"]);
  });

  it("reset wipes shares, dedupe set, and cursors", () => {
    const store = useSharesStore.getState();
    store.upsertShare(wsShare());
    store.markThreadRead("all");
    store.reset();

    const state = useSharesStore.getState();
    expect(state.shares).toEqual({});
    expect(state.lastReadAt).toEqual({});
    expect(state.upsertShare(wsShare())).toBe(true);
  });
});
