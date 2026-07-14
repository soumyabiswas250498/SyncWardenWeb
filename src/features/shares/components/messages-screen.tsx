import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useDevices } from "@/features/devices/api/use-devices";
import { useMediaQuery } from "@/lib/use-media-query";
import { useRealtimeStore } from "@/realtime/realtime-store";
import { selectTimeline, useSharesStore } from "../store/shares-store";
import { shareBelongsToThread } from "./messages-ui";
import { ConversationList } from "./conversation-list";
import { ThreadPane } from "./thread-pane";

/** Design breakpoint: below this the list and thread become separate views. */
const MOBILE_QUERY = "(max-width: 859px)";

const DELIVERY_POLL_INTERVAL_MS = 5_000;

export const MessagesScreen = () => {
  const myDeviceId = useAuthStore((state) => state.deviceId) ?? "";
  const devicesQuery = useDevices();
  const shares = useSharesStore((state) => state.shares);
  const lastReadAt = useSharesStore((state) => state.lastReadAt);
  const connectionState = useRealtimeStore((state) => state.connectionState);

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const timeline = useMemo(() => selectTimeline({ shares }), [shares]);

  // Other active devices, most of the screen keys off this list.
  const otherDevices = useMemo(
    () =>
      (devicesQuery.data ?? []).filter(
        (device) =>
          device.id !== myDeviceId && device.isActive && !device.isRevoked && !device.isExpired,
      ),
    [devicesQuery.data, myDeviceId],
  );

  useEffect(() => {
    void useSharesStore
      .getState()
      .loadHistory()
      .catch(() => {
        // Surfaced through historyStatus === "error" in the thread pane.
      });
  }, []);

  // Desktop default: the most recently active device thread (first device
  // when there are no shares yet). Mobile defaults to the list view.
  const defaultThreadId = useMemo(() => {
    if (otherDevices.length === 0) return null;
    for (const share of timeline) {
      const match = otherDevices.find((device) =>
        shareBelongsToThread(share, device.id, myDeviceId),
      );
      if (match) return match.id;
    }
    return otherDevices[0]?.id ?? null;
  }, [otherDevices, timeline, myDeviceId]);

  // Selection is derived, not synced: a selected device that disappears
  // (revoked elsewhere) falls back to the default gracefully.
  const deviceSelectionValid =
    selectedId !== null &&
    (!devicesQuery.isSuccess || otherDevices.some((device) => device.id === selectedId));
  const activeThreadId = deviceSelectionValid
    ? selectedId
    : isMobile
      ? null
      : defaultThreadId;

  // Opening (or receiving into) a thread marks it read.
  useEffect(() => {
    if (activeThreadId) {
      useSharesStore.getState().markThreadRead(activeThreadId);
    }
  }, [activeThreadId, timeline.length]);

  // The protocol has no delivery frame: poll the newest history page while a
  // sent share still has pending deliveries so ticks update on the sender.
  const hasPendingSent = useMemo(
    () =>
      timeline.some(
        (share) =>
          share.senderDeviceId === myDeviceId &&
          share.deliveries?.some((delivery) => delivery.status === "pending"),
      ),
    [timeline, myDeviceId],
  );
  useEffect(() => {
    if (!hasPendingSent || connectionState !== "open") return;
    const timer = setInterval(
      () => void useSharesStore.getState().refreshDeliveries(),
      DELIVERY_POLL_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [hasPendingSent, connectionState]);

  const selectedDevice = activeThreadId
    ? otherDevices.find((device) => device.id === activeThreadId)
    : undefined;

  const showList = !isMobile || activeThreadId === null;
  const showThread = !isMobile || activeThreadId !== null;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {showList && (
        <div
          className={
            isMobile ? "w-full" : "w-[320px] shrink-0 border-r border-border"
          }
        >
          <ConversationList
            devices={otherDevices}
            isLoading={devicesQuery.isLoading}
            isError={devicesQuery.isError}
            onRetryDevices={() => void devicesQuery.refetch()}
            timeline={timeline}
            myDeviceId={myDeviceId}
            lastReadAt={lastReadAt}
            selectedId={activeThreadId}
            onSelect={setSelectedId}
          />
        </div>
      )}
      {showThread &&
        (activeThreadId && selectedDevice ? (
          <ThreadPane
            key={activeThreadId}
            threadId={activeThreadId}
            device={selectedDevice}
            myDeviceId={myDeviceId}
            timeline={timeline}
            isMobile={isMobile}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13.5px] text-muted-foreground">
            Select a device to view the thread
          </div>
        ))}
    </div>
  );
};
