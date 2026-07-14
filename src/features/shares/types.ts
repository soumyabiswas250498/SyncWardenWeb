export type ShareDeliveryStatus = "pending" | "delivered";

export interface ShareDelivery {
  deviceId: string;
  status: ShareDeliveryStatus;
  deliveredAt?: string;
}

/** A text share exactly as the REST API returns it. */
export interface Share {
  id: string;
  userId: string;
  senderDeviceId: string;
  contentType: "text";
  content: string;
  deliveries: ShareDelivery[];
  createdAt: string;
  expiresAt: string;
}

/**
 * A share as held in local state. WebSocket `share.new` frames carry only a
 * subset of the REST shape (no userId/expiresAt/deliveries), so those fields
 * are optional until a REST fetch fills them in.
 */
export interface ShareRecord {
  id: string;
  senderDeviceId: string;
  contentType: "text";
  content: string;
  createdAt: string;
  userId?: string;
  expiresAt?: string;
  /** Present on shares loaded via REST; undefined for ws-only received shares. */
  deliveries?: ShareDelivery[];
}

export interface CreateSharePayload {
  content: string;
  /** Omitted or empty = all other active devices. */
  targetDeviceIds?: string[];
}

export interface ShareResponse {
  share: Share;
}

export interface ShareListResponse {
  shares: Share[];
}

export interface ShareHistoryResponse {
  shares: Share[];
  nextCursor: string | null;
}
