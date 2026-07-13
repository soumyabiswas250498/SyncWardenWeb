import {
  Globe,
  Laptop,
  Monitor,
  Puzzle,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import type { Device, DevicePlatform, DeviceStatus } from "../types";

export const PLATFORM_ICON: Record<DevicePlatform, LucideIcon> = {
  chrome_extension: Puzzle,
  android: Smartphone,
  ios: Smartphone,
};

/**
 * The app's static icon set for `iconCode`. The backend stores the code
 * without validating it, so this list is the source of truth for valid codes;
 * unknown codes fall back to the platform default in `resolveDeviceIcon`.
 */
export const DEVICE_ICON_OPTIONS = [
  { id: "laptop", Icon: Laptop, label: "Laptop" },
  { id: "desktop", Icon: Monitor, label: "Desktop" },
  { id: "phone", Icon: Smartphone, label: "Phone" },
  { id: "tablet", Icon: Tablet, label: "Tablet" },
  { id: "browser", Icon: Globe, label: "Browser" },
] as const;

/**
 * iconCode → icon lookup. Display precedence per the backend guide: custom
 * uploaded `icon` wins over `iconCode`, which wins over the platform default.
 * Custom image rendering (presigned download URL) isn't built yet, so `icon`
 * currently falls through to the next tier; unknown codes fall back to
 * `PLATFORM_ICON[device.platform]`.
 */
export const DEVICE_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  DEVICE_ICON_OPTIONS.map(({ id, Icon }) => [id, Icon]),
);

/**
 * Icon codes already used by other (non-revoked) devices. Pickers disable
 * these so every device keeps a unique icon; pass `excludeId` when editing a
 * device so its own code stays selectable.
 */
export const getTakenIconCodes = (devices: Device[], excludeId?: string): Set<string> =>
  new Set(
    devices
      .filter((device) => !device.isRevoked && device.id !== excludeId)
      .map((device) => device.iconCode)
      .filter((code): code is string => Boolean(code)),
  );

export const PLATFORM_LABEL: Record<DevicePlatform, string> = {
  chrome_extension: "Browser / Extension",
  android: "Android",
  ios: "iOS",
};

interface StatusStyle {
  label: string;
  dot: string;
  text: string;
}

/** oklch tokens shared with the Claude Design device screens. */
export const STATUS_STYLE: Record<DeviceStatus, StatusStyle> = {
  green: {
    label: "Online · local network",
    dot: "bg-[oklch(0.62_0.17_145)]",
    text: "text-[oklch(0.5_0.16_145)]",
  },
  yellow: {
    label: "Online · remote",
    dot: "bg-[oklch(0.72_0.15_80)]",
    text: "text-[oklch(0.55_0.13_80)]",
  },
  red: {
    label: "Offline",
    dot: "bg-[oklch(0.58_0.19_25)]",
    text: "text-[oklch(0.5_0.19_25)]",
  },
};

export const resolveStatus = (device: Device): DeviceStatus => {
  if (device.isRevoked || device.isExpired || !device.isActive) return "red";
  return device.lastKnownStatus ?? "yellow";
};

/** Dependency-free relative time ("2m ago", "just now"). */
export const formatRelativeTime = (iso?: string): string => {
  if (!iso) return "never seen";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "never seen";
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diffMs < min) return "just now";
  if (diffMs < hr) return `${Math.round(diffMs / min)}m ago`;
  if (diffMs < day) return `${Math.round(diffMs / hr)}h ago`;
  return `${Math.round(diffMs / day)}d ago`;
};

/** Countdown label for temporary devices ("expires in 1h 42m" / "expired"). */
export const formatExpiry = (iso?: string): string => {
  if (!iso) return "";
  const remaining = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(remaining) || remaining <= 0) return "expired";
  const min = 60_000;
  const hr = 60 * min;
  const h = Math.floor(remaining / hr);
  const m = Math.round((remaining % hr) / min);
  return h <= 0 ? `expires in ${m}m` : `expires in ${h}h ${m}m`;
};
