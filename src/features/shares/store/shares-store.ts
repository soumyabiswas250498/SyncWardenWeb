import { create } from "zustand";
import { getShareHistory } from "../api/shares-api";
import type { Share, ShareRecord } from "../types";

const HISTORY_PAGE_SIZE = 20;

export type HistoryStatus = "idle" | "loading" | "loaded" | "loading-more" | "error";

interface SharesState {
  /** Merged timeline of sent + received shares, keyed by share id. */
  shares: Record<string, ShareRecord>;
  /**
   * Every share id ever stored. Survives local deletion, so an at-least-once
   * redelivery of a deleted share is still recognized as a duplicate.
   */
  seenShareIds: Set<string>;
  nextCursor: string | null;
  historyStatus: HistoryStatus;
  /** threadId ("all" or a deviceId) -> epoch ms the thread was last opened. */
  lastReadAt: Record<string, number>;
  /**
   * Merge one share into the timeline. Returns true when the id was never
   * seen before (i.e. this is not an at-least-once duplicate).
   */
  upsertShare: (share: ShareRecord) => boolean;
  upsertShares: (shares: Share[]) => void;
  removeShare: (id: string) => void;
  markThreadRead: (threadId: string) => void;
  /** First page of history. No-op if already loaded/loading. */
  loadHistory: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  /** Re-fetch the newest page to pick up delivery-status changes. */
  refreshDeliveries: () => Promise<void>;
  /** Wipe everything on logout/device removal so sessions never leak. */
  reset: () => void;
}

/** Merge, preferring the richer REST shape (deliveries et al.) over ws frames. */
const mergeRecord = (existing: ShareRecord | undefined, incoming: ShareRecord): ShareRecord =>
  existing
    ? {
        ...existing,
        ...incoming,
        deliveries: incoming.deliveries ?? existing.deliveries,
        userId: incoming.userId ?? existing.userId,
        expiresAt: incoming.expiresAt ?? existing.expiresAt,
      }
    : incoming;

const initialState = {
  shares: {} as Record<string, ShareRecord>,
  seenShareIds: new Set<string>(),
  nextCursor: null as string | null,
  historyStatus: "idle" as HistoryStatus,
  lastReadAt: {} as Record<string, number>,
};

export const useSharesStore = create<SharesState>()((set, get) => ({
  ...initialState,

  upsertShare: (share) => {
    const wasNew = !get().seenShareIds.has(share.id);
    set((state) => ({
      shares: { ...state.shares, [share.id]: mergeRecord(state.shares[share.id], share) },
      seenShareIds: wasNew ? new Set(state.seenShareIds).add(share.id) : state.seenShareIds,
    }));
    return wasNew;
  },

  upsertShares: (shares) => {
    if (shares.length === 0) return;
    set((state) => {
      const next = { ...state.shares };
      const seen = new Set(state.seenShareIds);
      for (const share of shares) {
        next[share.id] = mergeRecord(next[share.id], share);
        seen.add(share.id);
      }
      return { shares: next, seenShareIds: seen };
    });
  },

  removeShare: (id) => {
    set((state) => {
      if (!(id in state.shares)) return state;
      const next = { ...state.shares };
      delete next[id];
      // seenShareIds intentionally keeps the id (dedupe after deletion).
      return { shares: next };
    });
  },

  markThreadRead: (threadId) => {
    set((state) => ({ lastReadAt: { ...state.lastReadAt, [threadId]: Date.now() } }));
  },

  loadHistory: async () => {
    const { historyStatus } = get();
    if (historyStatus === "loading" || historyStatus === "loaded") return;
    set({ historyStatus: "loading" });
    try {
      const page = await getShareHistory({ limit: HISTORY_PAGE_SIZE });
      get().upsertShares(page.shares);
      set({ nextCursor: page.nextCursor, historyStatus: "loaded" });
    } catch (error) {
      set({ historyStatus: "error" });
      throw error;
    }
  },

  loadMoreHistory: async () => {
    const { nextCursor, historyStatus } = get();
    if (!nextCursor || historyStatus !== "loaded") return;
    set({ historyStatus: "loading-more" });
    try {
      const page = await getShareHistory({ limit: HISTORY_PAGE_SIZE, cursor: nextCursor });
      get().upsertShares(page.shares);
      set({ nextCursor: page.nextCursor, historyStatus: "loaded" });
    } catch (error) {
      set({ historyStatus: "loaded" });
      throw error;
    }
  },

  refreshDeliveries: async () => {
    if (get().historyStatus !== "loaded") return;
    try {
      const page = await getShareHistory({ limit: HISTORY_PAGE_SIZE });
      get().upsertShares(page.shares);
    } catch {
      // Best-effort: delivery ticks catch up on the next refresh.
    }
  },

  reset: () => {
    set({ ...initialState, seenShareIds: new Set(), lastReadAt: {}, shares: {} });
  },
}));

/** Timeline newest-first, for list previews and the merged "all" thread. */
export const selectTimeline = (state: Pick<SharesState, "shares">): ShareRecord[] =>
  Object.values(state.shares).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? 1 : -1),
  );
