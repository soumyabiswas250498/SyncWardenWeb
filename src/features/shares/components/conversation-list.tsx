import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { paths } from "@/routes/paths";
import type { Device } from "@/features/devices/types";
import {
  DEVICE_ICON_MAP,
  PLATFORM_ICON,
  STATUS_STYLE,
  resolveStatus,
} from "@/features/devices/components/device-ui";
import { useRealtimeStore } from "@/realtime/realtime-store";
import type { ShareRecord } from "../types";
import { SESSION_START_MS, formatShareTime, shareBelongsToThread } from "./messages-ui";

interface ConversationListProps {
  devices: Device[];
  isLoading: boolean;
  isError: boolean;
  onRetryDevices: () => void;
  /** Merged timeline, newest first. */
  timeline: ShareRecord[];
  myDeviceId: string;
  lastReadAt: Record<string, number>;
  selectedId: string | null;
  onSelect: (threadId: string) => void;
}

/** Unobtrusive connection pill; hidden entirely while the socket is open. */
const ConnectionPill = () => {
  const connectionState = useRealtimeStore((state) => state.connectionState);
  const connectionDetail = useRealtimeStore((state) => state.connectionDetail);

  if (connectionState === "open") return null;

  const label =
    connectionDetail === "offline"
      ? "Offline"
      : connectionDetail === "superseded"
        ? "Active in another tab"
        : connectionState === "connecting"
          ? "Connecting…"
          : connectionState === "reconnecting"
            ? "Reconnecting…"
            : "Disconnected";

  const isError = connectionDetail === "offline" || connectionState === "closed";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold",
        isError
          ? "bg-[oklch(0.58_0.19_25_/_0.12)] text-[oklch(0.5_0.19_25)]"
          : "bg-[oklch(0.75_0.15_80_/_0.16)] text-[oklch(0.55_0.13_80)]",
      )}
    >
      {label}
    </span>
  );
};

interface RowShape {
  threadId: string;
  name: string;
  device: Device;
  lastShare?: ShareRecord;
  unreadCount: number;
}

const ConversationRow = ({
  row,
  myDeviceId,
  isSelected,
  onSelect,
}: {
  row: RowShape;
  myDeviceId: string;
  isSelected: boolean;
  onSelect: (threadId: string) => void;
}) => {
  const { device, lastShare } = row;
  const Icon = DEVICE_ICON_MAP[device.iconCode ?? ""] ?? PLATFORM_ICON[device.platform];
  const preview = lastShare
    ? `${lastShare.senderDeviceId === myDeviceId ? "You: " : ""}${lastShare.content}`
    : "No messages yet";

  return (
    <button
      type="button"
      onClick={() => onSelect(row.threadId)}
      className={cn(
        "mb-0.5 flex w-full items-start gap-3 rounded-[10px] p-[11px_10px] text-left",
        isSelected ? "bg-[oklch(0.55_0.15_250_/_0.1)]" : "hover:bg-[oklch(0.55_0.15_250_/_0.05)]",
      )}
    >
      <div className="relative flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[oklch(0.55_0.15_250_/_0.08)]">
        <Icon className="size-[17px] text-[oklch(0.42_0.02_260)]" aria-hidden="true" />
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card",
            STATUS_STYLE[resolveStatus(device)].dot,
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13.5px] font-bold">{row.name}</span>
          {lastShare && (
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              {formatShareTime(lastShare.createdAt)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
            {preview}
          </span>
          {row.unreadCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[9px] bg-[oklch(0.55_0.15_250)] px-[5px] text-[11px] font-bold text-[oklch(0.99_0.003_85)]">
              {row.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export const ConversationList = ({
  devices,
  isLoading,
  isError,
  onRetryDevices,
  timeline,
  myDeviceId,
  lastReadAt,
  selectedId,
  onSelect,
}: ConversationListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo<RowShape[]>(() => {
    const unreadIn = (threadId: string): number => {
      const readCutoff = lastReadAt[threadId] ?? SESSION_START_MS;
      return timeline.filter(
        (share) =>
          share.senderDeviceId !== myDeviceId &&
          shareBelongsToThread(share, threadId, myDeviceId) &&
          Date.parse(share.createdAt) > readCutoff,
      ).length;
    };

    const deviceRows = devices
      .filter(
        (device) =>
          !searchQuery || device.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((device) => ({
        threadId: device.id,
        name: device.name,
        device,
        lastShare: timeline.find((share) =>
          shareBelongsToThread(share, device.id, myDeviceId),
        ),
        unreadCount: unreadIn(device.id),
      }));

    // Devices ordered by most recent thread activity.
    deviceRows.sort(
      (a, b) =>
        (b.lastShare ? Date.parse(b.lastShare.createdAt) : 0) -
        (a.lastShare ? Date.parse(a.lastShare.createdAt) : 0),
    );
    return deviceRows;
  }, [devices, timeline, myDeviceId, lastReadAt, searchQuery]);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="shrink-0 p-[16px_16px_12px]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[19px] font-bold tracking-tight">Devices</h2>
          <ConnectionPill />
        </div>
        <div className="flex items-center gap-2 rounded-[10px] border border-border bg-background px-3 py-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            name="device-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search devices"
            aria-label="Search devices"
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="sw-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="flex flex-col gap-2 px-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-[38px] rounded-[10px]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-3 pt-4 text-center">
            <p className="mb-2 text-[13px] text-muted-foreground">Couldn&apos;t load devices.</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetryDevices}>
              Try again
            </Button>
          </div>
        ) : devices.length === 0 ? (
          <div className="px-3 pt-4 text-center text-[13px] text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">No other devices yet</p>
            <p>
              Register another device to start sharing.{" "}
              <Link to={paths.devices} className="font-semibold">
                Manage devices
              </Link>
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 pt-4 text-center text-[13px] text-muted-foreground">
            No devices match &quot;{searchQuery}&quot;.
          </p>
        ) : (
          rows.map((row) => (
            <ConversationRow
              key={row.threadId}
              row={row}
              myDeviceId={myDeviceId}
              isSelected={row.threadId === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};
