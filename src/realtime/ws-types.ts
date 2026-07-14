/**
 * SyncWarden WebSocket protocol v1 frame types.
 * Contract: SyncWarden docs/ws-protocol.md.
 */

export interface ShareNewPayload {
  shareId: string;
  senderDeviceId: string;
  contentType: "text";
  content: string;
  createdAt: string;
}

export interface PresenceUpdatePayload {
  deviceId: string;
  status: "green" | "red";
  lastSeenAt: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

interface FrameEnvelope<TType extends string, TPayload> {
  type: TType;
  id: string;
  ts: number;
  payload: TPayload;
}

export type ServerFrame =
  | FrameEnvelope<"share.new", ShareNewPayload>
  | FrameEnvelope<"presence.update", PresenceUpdatePayload>
  | FrameEnvelope<"error", ErrorPayload>;

export type ClientFrame = FrameEnvelope<"share.ack", { shareId: string }>;

/** Close codes the server uses; anything else is treated as a network drop. */
export const WS_CLOSE_PROTOCOL_VIOLATION = 4400;
export const WS_CLOSE_INVALID_TICKET = 4401;
export const WS_CLOSE_UNAUTHORIZED = 4403;
export const WS_CLOSE_SUPERSEDED = 4409;
