import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getErrorCode, getErrorMessage } from "@/lib/get-error-message";
import { paths } from "@/routes/paths";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  clearDeviceKeys,
  detectDeviceDefaults,
  generateDeviceKeys,
  getDeviceKeys,
  saveDeviceSession,
} from "@/lib/deviceIdentity";
import { authInputClass, authPrimaryButtonClass } from "@/features/auth/components/auth-ui";
import { useDevices } from "../api/use-devices";
import { useRegisterDevice } from "../api/use-register-device";
import { getPlanLimits } from "../constants";
import type { DeviceKind, EcPublicJwk } from "../types";
import { DeviceRow } from "./device-card";
import { DEVICE_ICON_OPTIONS, getTakenIconCodes } from "./device-ui";

const DURATION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 4, label: "4 hours" },
  { value: 24, label: "24 hours" },
];

interface RegisterDeviceFormProps {
  /** Shown after a key-loss recovery routes the user here. */
  keyLossRecovery?: boolean;
}

export const RegisterDeviceForm = ({ keyLossRecovery = false }: RegisterDeviceFormProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setDeviceSession = useAuthStore((state) => state.setDeviceSession);

  const defaults = useMemo(() => detectDeviceDefaults(), []);
  // The user's explicit icon choice; until they pick, the default is derived
  // from the device list (first icon not already taken).
  const [chosenIcon, setChosenIcon] = useState<string | null>(null);
  const [name, setName] = useState(defaults.name);
  const [kind, setKind] = useState<DeviceKind>("permanent");
  const [durationHours, setDurationHours] = useState(4);
  const [nameError, setNameError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<{ temporary: boolean; label: string } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const devicesQuery = useDevices();
  const registerMutation = useRegisterDevice();

  const limits = getPlanLimits(user?.plan);
  const devices = devicesQuery.data ?? [];
  const permanentUsed = devices.filter((d) => d.kind === "permanent" && !d.isRevoked).length;
  const existingTemp = devices.find((d) => d.kind === "temporary" && d.isActive);

  const takenIconCodes = useMemo(
    () => getTakenIconCodes(devicesQuery.data ?? []),
    [devicesQuery.data],
  );
  // If every icon is taken the picker stays fully enabled — blocking
  // registration would be worse than a duplicate.
  const allIconsTaken = DEVICE_ICON_OPTIONS.every(({ id }) => takenIconCodes.has(id));
  const iconCode =
    chosenIcon ??
    DEVICE_ICON_OPTIONS.find(({ id }) => !takenIconCodes.has(id))?.id ??
    DEVICE_ICON_OPTIONS[0].id;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Give this device a name");
      return;
    }
    setNameError(null);

    try {
      // Reuse an existing key pair if present (e.g. registered before but the
      // device session was lost); otherwise generate a fresh one.
      const existing = await getDeviceKeys();
      const identity = existing ?? (await generateDeviceKeys());
      const publicKey: EcPublicJwk = identity.publicJwk;

      const result = await registerMutation.mutateAsync({
        name: trimmed,
        platform: defaults.platform,
        kind,
        iconCode,
        publicKey,
        ...(kind === "temporary" ? { durationHours } : {}),
      });

      await saveDeviceSession({
        deviceId: result.device.id,
        refreshToken: result.refreshToken,
      });
      setDeviceSession(result.accessToken, result.device.id);
      setRegistered({
        temporary: kind === "temporary",
        label: DURATION_OPTIONS.find((o) => o.value === durationHours)?.label.toLowerCase() ?? "",
      });
    } catch (error) {
      if (getErrorCode(error) === "DEVICE_LIMIT_REACHED") {
        setLimitReached(true);
        void devicesQuery.refetch();
        toast.error("Device limit reached. Revoke a device to continue.");
        return;
      }
      toast.error(getErrorMessage(error, "Could not register this device"));
    }
  };

  const goToDashboard = () => void navigate(paths.dashboard, { replace: true });

  if (registered) {
    return (
      <div className="animate-[sw-fade-in_0.35s_ease] py-5 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[oklch(0.72_0.17_145_/_0.14)]">
          <Check className="size-6 text-[oklch(0.5_0.16_145)]" strokeWidth={3} aria-hidden="true" />
        </div>
        <div className="mb-2 text-2xl font-bold tracking-tight">
          {registered.temporary ? "Temporary access granted" : "Device registered"}
        </div>
        <div className="mb-7 text-[14.5px] leading-relaxed text-muted-foreground">
          {registered.temporary
            ? `"${name.trim()}" can sync for the next ${registered.label}.`
            : `"${name.trim()}" now has full access to your account.`}
        </div>
        <Button type="button" onClick={goToDashboard} className={authPrimaryButtonClass}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="animate-[sw-fade-in_0.35s_ease]">
        <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Device limit reached</h1>
        <p className="mb-6 text-[14.5px] leading-relaxed text-muted-foreground">
          You&apos;ve used all {limits.permanent} permanent device slots. Revoke one below, then
          register this device.
        </p>
        <div className="flex flex-col gap-3">
          {devices
            .filter((d) => !d.isRevoked)
            .map((device) => (
              <DeviceRow key={device.id} device={device} showRevoke />
            ))}
        </div>
        <Button
          type="button"
          onClick={() => {
            setLimitReached(false);
            void submit();
          }}
          className={authPrimaryButtonClass}
        >
          Try registering again
        </Button>
      </div>
    );
  }

  const isPending = registerMutation.isPending;

  return (
    <div className="animate-[sw-fade-in_0.35s_ease]">
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Register this device</h1>
      <p className="mb-6 text-[14.5px] leading-relaxed text-muted-foreground">
        You&apos;re signing in from{" "}
        <span className="font-semibold text-foreground/80">{defaults.name}</span> for the first
        time. Give it a name and icon.
      </p>

      {keyLossRecovery && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-[oklch(0.75_0.15_80_/_0.3)] bg-[oklch(0.75_0.15_80_/_0.12)] p-3.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[oklch(0.5_0.13_80)]" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-[oklch(0.42_0.09_80)]">
            This browser&apos;s device key wasn&apos;t found, so it&apos;s treated as new. Your
            previous device entry can be revoked from the device list after you register.
          </p>
        </div>
      )}

      <label className="mb-2 block text-[13px] font-semibold text-foreground/80">Device icon</label>
      <div className="mb-4 flex gap-2">
        {DEVICE_ICON_OPTIONS.map(({ id, Icon, label }) => {
          const selected = iconCode === id;
          const taken = takenIconCodes.has(id) && !allIconsTaken && !selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setChosenIcon(id)}
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
              <Icon className="size-[19px]" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <label htmlFor="device-name" className="mb-1.5 block text-[13px] font-semibold text-foreground/80">
        Device name
      </label>
      <Input
        id="device-name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (nameError) setNameError(null);
        }}
        placeholder="e.g. Work Laptop"
        aria-invalid={!!nameError}
        className={authInputClass}
      />
      {nameError && <p className="mt-1.5 text-[12.5px] text-[oklch(0.55_0.19_25)]">{nameError}</p>}

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-input p-4">
        <div>
          <div className="mb-0.5 text-sm font-bold">Mark as temporary device</div>
          <div className="text-[12.5px] leading-snug text-muted-foreground">
            For devices you don&apos;t own. Limited access, expires automatically, doesn&apos;t use a
            device slot.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={kind === "temporary"}
          aria-label="Mark as temporary device"
          onClick={() => setKind((k) => (k === "temporary" ? "permanent" : "temporary"))}
          className={cn(
            "relative h-6 w-[42px] shrink-0 rounded-full transition-colors",
            kind === "temporary" ? "bg-primary" : "bg-[oklch(0.85_0.01_85)]",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] size-[18px] rounded-full bg-white shadow-sm transition-all",
              kind === "temporary" ? "left-[21px]" : "left-[3px]",
            )}
          />
        </button>
      </div>

      {kind === "temporary" ? (
        <div className="mt-3.5">
          <label
            htmlFor="device-duration"
            className="mb-1.5 block text-[13px] font-semibold text-foreground/80"
          >
            Expires after
          </label>
          <select
            id="device-duration"
            value={durationHours}
            onChange={(event) => setDurationHours(Number(event.target.value))}
            className={cn(authInputClass, "w-full cursor-pointer")}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {existingTemp && (
            <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-[oklch(0.75_0.15_80_/_0.3)] bg-[oklch(0.75_0.15_80_/_0.12)] p-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[oklch(0.5_0.13_80)]" aria-hidden="true" />
              <p className="text-[12.5px] leading-relaxed text-[oklch(0.42_0.09_80)]">
                You already have an active temporary device (
                <span className="font-bold">{existingTemp.name}</span>). Registering another may
                require ending its access.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-muted-foreground">
          Uses 1 of your device slots · {permanentUsed}/{limits.permanent} used
        </p>
      )}

      <Button
        type="button"
        onClick={() => void submit()}
        disabled={isPending}
        className={authPrimaryButtonClass}
      >
        {isPending ? (
          <>
            <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
            <span className="sr-only">Registering…</span>
          </>
        ) : (
          "Continue"
        )}
      </Button>

      <button
        type="button"
        onClick={async () => {
          await clearDeviceKeys();
          useAuthStore.getState().clearSession();
          void navigate(paths.signin, { replace: true });
        }}
        className="mt-4 w-full text-center text-[13px] font-semibold text-muted-foreground hover:text-foreground"
      >
        Not now — sign out
      </button>
    </div>
  );
};
