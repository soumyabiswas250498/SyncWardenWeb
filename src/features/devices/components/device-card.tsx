import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { paths } from "@/routes/paths";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { clearDeviceKeys } from "@/lib/deviceIdentity";
import type { Device, UpdateDevicePayload } from "../types";
import { useDevices } from "../api/use-devices";
import { useUpdateDevice } from "../api/use-update-device";
import { useRevokeDevice } from "../api/use-revoke-device";
import {
  DEVICE_ICON_MAP,
  DEVICE_ICON_OPTIONS,
  PLATFORM_ICON,
  PLATFORM_LABEL,
  STATUS_STYLE,
  formatExpiry,
  formatRelativeTime,
  getTakenIconCodes,
  resolveStatus,
} from "./device-ui";

interface DeviceRowProps {
  device: Device;
  /** When true this is the browser's own registered device. */
  isCurrent?: boolean;
  /** Force-show the revoke button even for the limit-reached inline list. */
  showRevoke?: boolean;
}

export const DeviceRow = ({ device, isCurrent = false, showRevoke = false }: DeviceRowProps) => {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(device.name);
  // null = no icon code (platform default icon).
  const [iconDraft, setIconDraft] = useState<string | null>(device.iconCode ?? null);

  const devicesQuery = useDevices();
  const updateMutation = useUpdateDevice();
  const revokeMutation = useRevokeDevice();
  const clearSession = useAuthStore((state) => state.clearSession);

  // Icons used by *other* devices are disabled so icons stay unique.
  const takenIconCodes = useMemo(
    () => getTakenIconCodes(devicesQuery.data ?? [], device.id),
    [devicesQuery.data, device.id],
  );

  const PlatformIcon = PLATFORM_ICON[device.platform];
  // icon (custom upload) > iconCode > platform default; see DEVICE_ICON_MAP.
  const Icon = DEVICE_ICON_MAP[device.iconCode ?? ""] ?? PlatformIcon;
  const status = resolveStatus(device);
  const statusStyle = STATUS_STYLE[status];
  const isTemporary = device.kind === "temporary";
  const canRevoke = showRevoke || !isCurrent;

  const submitEdit = () => {
    const trimmed = nameDraft.trim();
    const payload: UpdateDevicePayload = {};
    if (trimmed && trimmed !== device.name) {
      payload.name = trimmed;
    }
    if (iconDraft !== (device.iconCode ?? null)) {
      // Selecting "Default" clears the stored code (iconCode: null).
      payload.iconCode = iconDraft;
    }
    if (Object.keys(payload).length === 0) {
      setEditOpen(false);
      return;
    }
    updateMutation.mutate(
      { id: device.id, ...payload },
      {
        onSuccess: () => {
          toast.success("Device updated");
          setEditOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error, "Could not update device")),
      },
    );
  };

  const submitRevoke = () => {
    revokeMutation.mutate(device.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        if (isCurrent) {
          // Revoking the current device ends this browser's session entirely.
          void (async () => {
            await clearDeviceKeys();
            clearSession();
            toast.success("This device was revoked");
            void navigate(paths.signin, { replace: true });
          })();
          return;
        }
        toast.success(isTemporary ? "Temporary access ended" : "Device revoked");
      },
      onError: (error) => toast.error(getErrorMessage(error, "Could not revoke device")),
    });
  };

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4">
      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[oklch(0.55_0.15_250_/_0.08)]">
        <Icon className="size-[18px] text-[oklch(0.42_0.02_260)]" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold">{device.name}</span>
          {isCurrent && (
            <span className="rounded-full bg-[oklch(0.55_0.15_250_/_0.12)] px-2 py-0.5 text-[11.5px] font-bold text-[oklch(0.5_0.14_250)]">
              This device
            </span>
          )}
          {isTemporary && (
            <span className="rounded-full bg-[oklch(0.75_0.15_80_/_0.16)] px-2 py-0.5 text-[11.5px] font-bold text-[oklch(0.55_0.13_80)]">
              Temporary · {formatExpiry(device.expiresAt)}
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted-foreground">{PLATFORM_LABEL[device.platform]}</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={cn("size-[7px] shrink-0 rounded-full", statusStyle.dot)} />
          <span className={cn("text-[13px] font-semibold", statusStyle.text)}>
            {statusStyle.label}
          </span>
          <span className="text-[13px] text-muted-foreground">
            · {isCurrent ? "active now" : formatRelativeTime(device.lastSeenAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {!isCurrent && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${device.name}`}
            onClick={() => {
              setNameDraft(device.name);
              setIconDraft(device.iconCode ?? null);
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
        {canRevoke && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[oklch(0.55_0.19_25_/_0.25)] text-[oklch(0.5_0.19_25)] hover:bg-[oklch(0.55_0.19_25_/_0.08)] hover:text-[oklch(0.5_0.19_25)]"
            onClick={() => setConfirmOpen(true)}
          >
            {isTemporary ? "End access" : "Revoke"}
          </Button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit device</DialogTitle>
            <DialogDescription>
              Choose a name and icon you&apos;ll recognize.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIconDraft(null)}
              aria-pressed={iconDraft === null}
              aria-label="Default icon"
              className={cn(
                "flex size-11 items-center justify-center rounded-[10px] border-[1.5px] transition-colors",
                iconDraft === null
                  ? "border-primary bg-[oklch(0.55_0.15_250_/_0.08)] text-primary"
                  : "border-input bg-[oklch(0.995_0.002_85)] text-[oklch(0.45_0.02_260)]",
              )}
            >
              <PlatformIcon className="size-[19px]" aria-hidden="true" />
            </button>
            {DEVICE_ICON_OPTIONS.map(({ id, Icon: OptionIcon, label }) => {
              const selected = iconDraft === id;
              const taken = takenIconCodes.has(id) && !selected;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIconDraft(id)}
                  disabled={taken}
                  title={taken ? "Already used by another device" : undefined}
                  aria-pressed={selected}
                  aria-label={label}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-[10px] border-[1.5px] transition-colors",
                    selected
                      ? "border-primary bg-[oklch(0.55_0.15_250_/_0.08)] text-primary"
                      : "border-input bg-[oklch(0.995_0.002_85)] text-[oklch(0.45_0.02_260)]",
                    taken && "cursor-not-allowed opacity-35",
                  )}
                >
                  <OptionIcon className="size-[19px]" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <Input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            maxLength={120}
            aria-label="Device name"
            onKeyDown={(event) => {
              if (event.key === "Enter") submitEdit();
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isTemporary ? "End temporary access?" : "Revoke this device?"}
            </DialogTitle>
            <DialogDescription>
              {isCurrent
                ? `"${device.name}" is this browser. Revoking it signs you out here and you'll need to register again.`
                : isTemporary
                  ? `"${device.name}" will immediately lose access to your account. This can't be undone.`
                  : `"${device.name}" will be signed out and must sign in again to reconnect. Pending transfers to it will be cancelled.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitRevoke}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : isTemporary ? (
                "End access"
              ) : (
                "Revoke device"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
