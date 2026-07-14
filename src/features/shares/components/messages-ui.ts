import { getErrorCode, getErrorMessage } from "@/lib/get-error-message";
import { SHARE_MAX_CONTENT_BYTES } from "../api/shares-api";
import type { ShareRecord } from "../types";

/**
 * Baseline for unread counts: anything older than app start (i.e. loaded from
 * history) is considered read; only live-arriving shares count as unread
 * until their thread is opened.
 */
export const SESSION_START_MS = Date.now();

/**
 * Thread membership. A received share lives in its sender's thread; a sent
 * share lives in every recipient's thread (per-recipient delivery status is
 * shown there).
 */
export const shareBelongsToThread = (
  share: ShareRecord,
  threadId: string,
  myDeviceId: string,
): boolean => {
  if (share.senderDeviceId === myDeviceId) {
    return share.deliveries?.some((delivery) => delivery.deviceId === threadId) ?? false;
  }
  return share.senderDeviceId === threadId;
};

/** Delivery indicator for a sent bubble: the thread device's own status. */
export const deliveryLabel = (share: ShareRecord, threadId: string): string | null => {
  const delivery = share.deliveries?.find((entry) => entry.deviceId === threadId);
  if (!delivery) return null;
  return delivery.status === "delivered" ? "Delivered ✓" : "Pending";
};

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "9:02 AM" today, "Yesterday", "Jul 12", "Jul 12, 2025". */
export const formatShareTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (sameDay(date, now)) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const formatByteCount = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export const SHARE_MAX_BYTES_LABEL = formatByteCount(SHARE_MAX_CONTENT_BYTES);

/** UI messages for share error codes, per the integration guide's table. */
export const shareErrorMessage = (error: unknown): string => {
  switch (getErrorCode(error)) {
    case "SHARE_TARGET_INVALID":
      return "That device can no longer receive shares. The device list was refreshed — pick a recipient again.";
    case "SHARE_NO_RECIPIENTS":
      return "No other active devices are available to receive this.";
    case "SHARE_TOO_LARGE":
      return `Message is too large — the limit is ${SHARE_MAX_BYTES_LABEL} of text.`;
    default:
      return getErrorMessage(error, "Could not send the message");
  }
};
