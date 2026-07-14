import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Loader2, SendHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorCode } from "@/lib/get-error-message";
import type { Device } from "@/features/devices/types";
import { devicesKeys } from "@/features/devices/api/use-devices";
import {
  DEVICE_ICON_MAP,
  PLATFORM_ICON,
  STATUS_STYLE,
  formatRelativeTime,
  resolveStatus,
} from "@/features/devices/components/device-ui";
import {
  SHARE_MAX_CONTENT_BYTES,
  createShare,
  deleteShare,
  shareContentByteLength,
} from "../api/shares-api";
import { useSharesStore } from "../store/shares-store";
import type { ShareRecord } from "../types";
import {
  SHARE_MAX_BYTES_LABEL,
  deliveryLabel,
  formatByteCount,
  formatShareTime,
  shareBelongsToThread,
  shareErrorMessage,
} from "./messages-ui";

/** Byte counter appears once the draft crosses this share of the limit. */
const BYTE_FEEDBACK_THRESHOLD = 0.8;

interface ThreadPaneProps {
  threadId: string;
  device: Device;
  myDeviceId: string;
  /** Merged timeline, newest first. */
  timeline: ShareRecord[];
  isMobile: boolean;
  onBack: () => void;
}

const MessageBubble = ({
  share,
  threadId,
  isSent,
  onDelete,
  isDeleting,
}: {
  share: ShareRecord;
  threadId: string;
  isSent: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) => {
  const delivery = isSent ? deliveryLabel(share, threadId) : null;

  return (
    <div className={cn("group flex items-center gap-1.5", isSent ? "justify-end" : "justify-start")}>
      {isSent && (
        <DeleteShareButton share={share} onDelete={onDelete} isDeleting={isDeleting} />
      )}
      <div
        className={cn(
          "max-w-[360px] animate-in fade-in slide-in-from-bottom-1 rounded-[14px] px-3 pt-[9px] pb-[7px]",
          isSent
            ? "rounded-br-[4px] bg-[oklch(0.55_0.15_250)] text-[oklch(0.99_0.003_85)]"
            : "rounded-bl-[4px] border border-border bg-card text-foreground",
        )}
      >
        {/* Received content is untrusted: rendered strictly as text. */}
        <div className="text-[13.5px] leading-[1.45] break-words whitespace-pre-wrap">
          {share.content}
        </div>
        <div className={cn("mt-1 text-right text-[10.5px]", isSent ? "opacity-75" : "opacity-55")}>
          {formatShareTime(share.createdAt)}
          {delivery && ` · ${delivery}`}
        </div>
      </div>
      {!isSent && (
        <DeleteShareButton share={share} onDelete={onDelete} isDeleting={isDeleting} />
      )}
    </div>
  );
};

const DeleteShareButton = ({
  share,
  onDelete,
  isDeleting,
}: {
  share: ShareRecord;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) => (
  <button
    type="button"
    aria-label="Delete message"
    disabled={isDeleting}
    onClick={() => onDelete(share.id)}
    className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[oklch(0.58_0.19_25_/_0.1)] hover:text-[oklch(0.5_0.19_25)] focus-visible:opacity-100 disabled:opacity-40"
  >
    {isDeleting ? (
      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
    ) : (
      <Trash2 className="size-3.5" aria-hidden="true" />
    )}
  </button>
);

export const ThreadPane = ({
  threadId,
  device,
  myDeviceId,
  timeline,
  isMobile,
  onBack,
}: ThreadPaneProps) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevThreadRef = useRef(threadId);

  const nextCursor = useSharesStore((state) => state.nextCursor);
  const historyStatus = useSharesStore((state) => state.historyStatus);

  // Chronological (oldest → newest) for chat rendering.
  const messages = useMemo(
    () =>
      timeline
        .filter((share) => shareBelongsToThread(share, threadId, myDeviceId))
        .slice()
        .reverse(),
    [timeline, threadId, myDeviceId],
  );

  // Stick to the bottom on thread switch and on new messages (unless the
  // user has scrolled up to read history).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threadChanged = prevThreadRef.current !== threadId;
    prevThreadRef.current = threadId;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (threadChanged || nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [threadId, messages.length]);

  const draftBytes = shareContentByteLength(draft);
  const overLimit = draftBytes > SHARE_MAX_CONTENT_BYTES;
  const showByteFeedback = draftBytes > SHARE_MAX_CONTENT_BYTES * BYTE_FEEDBACK_THRESHOLD;
  const canSend = draft.trim().length > 0 && !overLimit && !isSending;

  const send = async () => {
    if (!canSend) return;
    const content = draft.trim();
    setIsSending(true);
    try {
      const share = await createShare({ content, targetDeviceIds: [threadId] });
      useSharesStore.getState().upsertShare(share);
      setDraft("");
    } catch (error) {
      if (getErrorCode(error) === "SHARE_TARGET_INVALID") {
        void queryClient.invalidateQueries({ queryKey: devicesKeys.list() });
      }
      toast.error(shareErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteShare(id);
      useSharesStore.getState().removeShare(id);
    } catch (error) {
      if (getErrorCode(error) === "SHARE_NOT_FOUND") {
        // Already gone server-side — drop the stale local copy silently.
        useSharesStore.getState().removeShare(id);
      } else {
        toast.error(shareErrorMessage(error));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const loadEarlier = () => {
    const el = scrollRef.current;
    const previousHeight = el?.scrollHeight ?? 0;
    void useSharesStore
      .getState()
      .loadMoreHistory()
      .then(() => {
        // Keep the viewport anchored on the message the user was reading.
        requestAnimationFrame(() => {
          if (el) el.scrollTop += el.scrollHeight - previousHeight;
        });
      })
      .catch(() => toast.error("Couldn't load earlier messages"));
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void send();
  };

  const HeaderIcon = DEVICE_ICON_MAP[device.iconCode ?? ""] ?? PLATFORM_ICON[device.platform];
  const status = resolveStatus(device);
  const statusLabel =
    status === "red"
      ? `Offline · last seen ${formatRelativeTime(device.lastSeenAt)}`
      : STATUS_STYLE[status].label;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-5 py-3">
        {isMobile && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to device list"
            className="-ml-1 flex rounded p-1 text-[oklch(0.4_0.02_85)]"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[oklch(0.55_0.15_250_/_0.08)]">
          <HeaderIcon className="size-4 text-[oklch(0.42_0.02_260)]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-bold">{device.name}</div>
          <div className="flex items-center gap-[5px]">
            <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_STYLE[status].dot)} />
            <span className="truncate text-[12.5px] text-muted-foreground">{statusLabel}</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="sw-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-[18px]"
      >
        {historyStatus === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[13.5px] text-muted-foreground">
            <span>Couldn&apos;t load message history.</span>
            <button
              type="button"
              className="font-semibold text-[oklch(0.5_0.14_250)]"
              onClick={() => void useSharesStore.getState().loadHistory().catch(() => {})}
            >
              Try again
            </button>
          </div>
        ) : historyStatus === "loading" || historyStatus === "idle" ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-[13.5px] text-muted-foreground">
            No messages yet. Send something to {device.name}.
          </div>
        ) : (
          <>
            {nextCursor && (
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={loadEarlier}
                  disabled={historyStatus === "loading-more"}
                  className="rounded-full border border-border bg-card px-3 py-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  {historyStatus === "loading-more" ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            )}
            {messages.map((share) => (
              <MessageBubble
                key={share.id}
                share={share}
                threadId={threadId}
                isSent={share.senderDeviceId === myDeviceId}
                onDelete={(id) => void handleDelete(id)}
                isDeleting={deletingId === share.id}
              />
            ))}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <input
            name="message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder={`Message ${device.name}`}
            aria-label="Message"
            className="min-w-0 flex-1 rounded-[20px] border border-border bg-background px-4 py-[9px] text-[13.5px] outline-none placeholder:text-muted-foreground focus-visible:border-ring"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
              canSend
                ? "cursor-pointer bg-[oklch(0.55_0.15_250)] text-[oklch(0.99_0.003_85)]"
                : "bg-[oklch(0.88_0.008_85)] text-[oklch(0.65_0.015_85)]",
            )}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendHorizontal className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {showByteFeedback && (
          <p
            className={cn(
              "mt-1.5 text-right text-[11.5px]",
              overLimit ? "font-semibold text-[oklch(0.5_0.19_25)]" : "text-muted-foreground",
            )}
          >
            {formatByteCount(draftBytes)} / {SHARE_MAX_BYTES_LABEL}
            {overLimit && " — too large to send"}
          </p>
        )}
      </div>
    </div>
  );
};
