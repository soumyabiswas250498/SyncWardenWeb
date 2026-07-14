import { api } from "@/lib/axios";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  CreateSharePayload,
  Share,
  ShareHistoryResponse,
  ShareListResponse,
  ShareResponse,
} from "../types";

/**
 * Mirrors the backend's SHARE_MAX_CONTENT_BYTES default. The server counts
 * UTF-8 bytes, not JavaScript string length — validate the same way here.
 */
export const SHARE_MAX_CONTENT_BYTES = 100_000;

const encoder = new TextEncoder();

export const shareContentByteLength = (content: string): number =>
  encoder.encode(content).byteLength;

/**
 * Client-side rejection that mirrors the server's SHARE_TOO_LARGE error, so
 * the UI maps it through the same `code` path as API failures
 * (see getErrorCode).
 */
export class ShareTooLargeError extends Error {
  readonly code = "SHARE_TOO_LARGE";
  readonly byteLength: number;

  constructor(byteLength: number) {
    super(
      `Share content is ${byteLength} bytes; the limit is ${SHARE_MAX_CONTENT_BYTES} bytes`,
    );
    this.name = "ShareTooLargeError";
    this.byteLength = byteLength;
  }
}

export const createShare = async (payload: CreateSharePayload): Promise<Share> => {
  const byteLength = shareContentByteLength(payload.content);
  if (byteLength > SHARE_MAX_CONTENT_BYTES) {
    throw new ShareTooLargeError(byteLength);
  }

  const response = await api.post<ApiSuccessResponse<ShareResponse>>("/shares", {
    content: payload.content,
    contentType: "text",
    // Strict validation: omit the key entirely for "all other devices".
    ...(payload.targetDeviceIds?.length ? { targetDeviceIds: payload.targetDeviceIds } : {}),
  });
  return response.data.data.share;
};

/** Shares whose delivery to *this* device is still pending. Does not ack. */
export const getPendingShares = async (): Promise<Share[]> => {
  const response = await api.get<ApiSuccessResponse<ShareListResponse>>("/shares/pending");
  return response.data.data.shares;
};

export const getShareHistory = async (
  params: { limit?: number; cursor?: string } = {},
): Promise<ShareHistoryResponse> => {
  const response = await api.get<ApiSuccessResponse<ShareHistoryResponse>>("/shares", {
    params: {
      ...(params.limit !== undefined ? { limit: params.limit } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
    },
  });
  return response.data.data;
};

export const deleteShare = async (id: string): Promise<void> => {
  await api.delete(`/shares/${id}`);
};
