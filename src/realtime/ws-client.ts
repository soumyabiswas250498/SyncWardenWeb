/**
 * Singleton WebSocket connection manager for the SyncWarden realtime gateway.
 *
 * Auth model: browsers can't attach Authorization/DPoP headers to a WebSocket
 * handshake, so every attempt first calls POST /ws/ticket over the DPoP-bound
 * axios client and connects with the returned single-use ticket in the query
 * string (the only credential ever allowed in a URL). Tickets are never
 * reused: each (re)connect fetches a fresh one.
 *
 * Exactly one socket is held per device session. The socket outlives route
 * changes; it closes only on logout/device removal (auth-store subscription)
 * or terminal close codes. Incoming shares are saved to the shares store
 * BEFORE they are acknowledged, and acks are idempotent, so at-least-once
 * redelivery after reconnects is deduplicated by shareId.
 */
import { api, handleDeviceSessionKilled } from "@/lib/axios";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { devicesKeys } from "@/features/devices/api/use-devices";
import type { Device } from "@/features/devices/types";
import { getPendingShares } from "@/features/shares/api/shares-api";
import { useSharesStore } from "@/features/shares/store/shares-store";
import type { ApiSuccessResponse } from "@/types/api";
import { useRealtimeStore, type ConnectionDetail } from "./realtime-store";
import {
  WS_CLOSE_INVALID_TICKET,
  WS_CLOSE_PROTOCOL_VIOLATION,
  WS_CLOSE_SUPERSEDED,
  WS_CLOSE_UNAUTHORIZED,
  type PresenceUpdatePayload,
  type ServerFrame,
  type ShareNewPayload,
} from "./ws-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;
/** A connection open this long resets the backoff counter. */
const STABLE_CONNECTION_MS = 15_000;
/** Presence "green" means the device is about to ack pending deliveries. */
const DELIVERY_REFRESH_AFTER_PRESENCE_MS = 1_500;

/** ws(s):// URL for the gateway, derived from the configured API origin. */
export const buildWebSocketUrl = (apiBaseUrl: string, ticket: string): string => {
  const url = new URL(`${apiBaseUrl.replace(/\/+$/, "")}/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("ticket", ticket);
  return url.toString();
};

/** ~1s, 2s, 4s, 8s, 16s… capped at 30s, with ±25% jitter. */
export const reconnectDelayMs = (attempt: number, random: () => number = Math.random): number => {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** Math.min(attempt, 10), BACKOFF_CAP_MS);
  return Math.round(base * (0.75 + random() * 0.5));
};

let socket: WebSocket | null = null;
/** True while a session should hold a connection (cleared by disconnect). */
let desired = false;
/** True while a connect() is in its ticket-fetch phase (no socket yet). */
let connecting = false;
/** Bumped on disconnect to invalidate in-flight async continuations. */
let generation = 0;
let attempts = 0;
let everOpened = false;
/** One-shot immediate retry after a 4401 before falling back to backoff. */
let usedImmediateTicketRetry = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let stableTimer: ReturnType<typeof setTimeout> | null = null;
let watchersInstalled = false;

const setState = (
  state: "connecting" | "open" | "reconnecting" | "closed",
  detail: ConnectionDetail = null,
): void => useRealtimeStore.getState().setConnectionState(state, detail);

const clearRetryTimer = (): void => {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
};

const clearStableTimer = (): void => {
  if (stableTimer) clearTimeout(stableTimer);
  stableTimer = null;
};

const sendAck = (ws: WebSocket, shareId: string): void => {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "share.ack",
      id: crypto.randomUUID(),
      ts: Date.now(),
      payload: { shareId },
    }),
  );
};

/**
 * Belt-and-braces catch-up after (re)connect: the server pushes unacked
 * shares itself, but we also pull /shares/pending once, dedupe by shareId in
 * the store, and ack every share that is now safely stored. Acks are
 * idempotent, so overlapping with the server's own push is harmless.
 */
const syncPendingShares = async (ws: WebSocket): Promise<void> => {
  try {
    const pending = await getPendingShares();
    const store = useSharesStore.getState();
    for (const share of pending) {
      store.upsertShare(share);
      sendAck(ws, share.id);
    }
  } catch {
    console.warn("[realtime] pending-share catch-up failed; server push still applies");
  }
};

/** Patch ONLY the matching device — never rebuild the list from one frame. */
const patchDevicePresence = (payload: PresenceUpdatePayload): void => {
  if (typeof payload?.deviceId !== "string") return;
  const listKey = devicesKeys.list();
  const devices = queryClient.getQueryData<Device[]>(listKey);
  if (!devices) return;
  if (!devices.some((device) => device.id === payload.deviceId)) {
    // Unknown device (registered elsewhere while we were connected): refetch.
    void queryClient.invalidateQueries({ queryKey: listKey });
    return;
  }
  queryClient.setQueryData<Device[]>(listKey, (old) =>
    old?.map((device) =>
      device.id === payload.deviceId
        ? { ...device, lastKnownStatus: payload.status, lastSeenAt: payload.lastSeenAt }
        : device,
    ),
  );
  if (payload.status === "green") {
    // The device that just connected is about to ack its pending deliveries.
    setTimeout(
      () => void useSharesStore.getState().refreshDeliveries(),
      DELIVERY_REFRESH_AFTER_PRESENCE_MS,
    );
  }
};

const handleShareNew = (ws: WebSocket, payload: ShareNewPayload): void => {
  if (typeof payload?.shareId !== "string") {
    console.warn("[realtime] ignoring malformed share.new frame");
    return;
  }
  // Save FIRST (synchronous store write, deduped by shareId), ack after.
  // Duplicates are acked too: a redelivery means the server never recorded
  // the previous ack, and acking is idempotent.
  useSharesStore.getState().upsertShare({
    id: payload.shareId,
    senderDeviceId: payload.senderDeviceId,
    contentType: payload.contentType,
    content: payload.content,
    createdAt: payload.createdAt,
  });
  sendAck(ws, payload.shareId);
};

const handleMessage = (ws: WebSocket, event: MessageEvent): void => {
  let frame: ServerFrame;
  try {
    frame = JSON.parse(String(event.data)) as ServerFrame;
  } catch {
    console.warn("[realtime] ignoring non-JSON server frame");
    return;
  }
  if (typeof frame !== "object" || frame === null || typeof frame.type !== "string") {
    console.warn("[realtime] ignoring malformed server frame");
    return;
  }

  switch (frame.type) {
    case "share.new":
      handleShareNew(ws, frame.payload);
      break;
    case "presence.update":
      patchDevicePresence(frame.payload);
      break;
    case "error":
      // Protocol errors indicate a client bug; log the code, never retry-loop.
      console.warn("[realtime] server error frame:", frame.payload?.code);
      break;
    default:
      // Unknown types are ignored for forward compatibility.
      break;
  }
};

const scheduleReconnect = (detail: ConnectionDetail = null): void => {
  if (!desired || retryTimer) return;
  attempts += 1;
  setState("reconnecting", detail);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void connect();
  }, reconnectDelayMs(attempts - 1));
};

const handleClose = (ws: WebSocket, event: CloseEvent): void => {
  if (socket !== ws) return;
  socket = null;
  clearStableTimer();
  if (!desired) {
    setState("closed");
    return;
  }

  switch (event.code) {
    case WS_CLOSE_PROTOCOL_VIOLATION:
      // Client bug — stop the loop; reconnecting would just repeat it.
      desired = false;
      setState("closed", "protocol");
      console.error("[realtime] socket closed with 4400 (protocol violation); not reconnecting");
      break;
    case WS_CLOSE_INVALID_TICKET:
      if (!usedImmediateTicketRetry) {
        usedImmediateTicketRetry = true;
        setState("reconnecting");
        void connect();
      } else {
        scheduleReconnect();
      }
      break;
    case WS_CLOSE_UNAUTHORIZED:
      // Device revoked/expired: stop, clear the device session, back to auth.
      desired = false;
      setState("closed", "unauthorized");
      void handleDeviceSessionKilled();
      break;
    case WS_CLOSE_SUPERSEDED:
      // A newer connection for this device exists (another tab). Stay passive.
      desired = false;
      setState("closed", "superseded");
      break;
    default:
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        // Paused until the browser's online event; no timers while offline.
        setState("reconnecting", "offline");
      } else {
        scheduleReconnect();
      }
  }
};

const connect = async (): Promise<void> => {
  if (!desired || connecting || socket) return;
  connecting = true;
  const gen = generation;
  setState(everOpened ? "reconnecting" : "connecting");

  let ticket: string;
  try {
    // Fresh ticket for every attempt (single-use). The axios interceptors
    // attach the device access token + a fresh DPoP proof, and transparently
    // refresh the access token once on 401.
    const response = await api.post<ApiSuccessResponse<{ ticket: string; expiresIn: number }>>(
      "/ws/ticket",
    );
    ticket = response.data.data.ticket;
  } catch {
    connecting = false;
    if (gen !== generation || !desired) return;
    if (useAuthStore.getState().scope !== "device") {
      // The response interceptor tore the session down (revoked/expired).
      disconnect();
      return;
    }
    scheduleReconnect();
    return;
  }

  if (gen !== generation || !desired) {
    connecting = false;
    return;
  }

  const ws = new WebSocket(buildWebSocketUrl(API_BASE_URL, ticket));
  socket = ws;
  connecting = false;

  ws.onopen = () => {
    if (socket !== ws) return;
    everOpened = true;
    setState("open");
    clearStableTimer();
    stableTimer = setTimeout(() => {
      attempts = 0;
      usedImmediateTicketRetry = false;
    }, STABLE_CONNECTION_MS);
    void syncPendingShares(ws);
    void useSharesStore.getState().refreshDeliveries();
    // Presence changed while we were away; refetch once rather than trusting
    // a stale cache. Individual updates then arrive as presence.update frames.
    void queryClient.invalidateQueries({ queryKey: devicesKeys.list() });
  };
  ws.onmessage = (event) => {
    if (socket !== ws) return;
    handleMessage(ws, event);
  };
  ws.onclose = (event) => handleClose(ws, event);
  // Errors always precede a close event; handleClose owns the retry policy.
  ws.onerror = () => {};
};

const handleOffline = (): void => {
  if (!desired) return;
  clearRetryTimer();
  // An open socket will surface its own close (1006) shortly; the offline
  // branch in handleClose then parks us until the online event.
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setState("reconnecting", "offline");
  }
};

const handleOnline = (): void => {
  if (!desired || socket || connecting || retryTimer) return;
  void connect();
};

const installWatchers = (): void => {
  if (watchersInstalled) return;
  watchersInstalled = true;
  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);
  // Logout / device removal: close the socket and drop realtime state so
  // nothing leaks into the next session.
  useAuthStore.subscribe((state, prev) => {
    const wasDeviceSession = prev.scope === "device" && prev.isAuthenticated;
    const isDeviceSession = state.scope === "device" && state.isAuthenticated;
    if (wasDeviceSession && !isDeviceSession) {
      disconnect();
      useSharesStore.getState().reset();
    }
  });
};

/**
 * Idempotent: safe to call from any device-scoped screen. Reuses the live
 * socket if one exists; otherwise starts the connect loop.
 */
export const ensureConnected = (): void => {
  if (useAuthStore.getState().scope !== "device") return;
  installWatchers();
  desired = true;
  if (socket || connecting || retryTimer) return;
  void connect();
};

export const disconnect = (): void => {
  desired = false;
  generation += 1;
  connecting = false;
  attempts = 0;
  everOpened = false;
  usedImmediateTicketRetry = false;
  clearRetryTimer();
  clearStableTimer();
  const ws = socket;
  socket = null;
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.close(1000, "client disconnect");
  }
  setState("closed");
};
