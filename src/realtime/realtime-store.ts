import { create } from "zustand";

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

/**
 * Why the connection is not (or no longer) open — drives the unobtrusive
 * status pill on the Messages screen.
 */
export type ConnectionDetail =
  | "offline" // browser reports no network
  | "superseded" // 4409: another tab/window owns this device's socket
  | "unauthorized" // 4403: device revoked/expired
  | "protocol" // 4400: client bug, retries stopped
  | null;

interface RealtimeState {
  connectionState: ConnectionState;
  connectionDetail: ConnectionDetail;
  setConnectionState: (connectionState: ConnectionState, detail?: ConnectionDetail) => void;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  connectionState: "closed",
  connectionDetail: null,
  setConnectionState: (connectionState, detail = null) =>
    set({ connectionState, connectionDetail: detail }),
}));
