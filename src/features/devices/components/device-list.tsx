import { TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useDevices } from "../api/use-devices";
import { getPlanLimits } from "../constants";
import { DeviceRow } from "./device-card";
import { DeviceUsageCards } from "./device-usage-cards";

export const DeviceList = () => {
  const user = useAuthStore((state) => state.user);
  const currentDeviceId = useAuthStore((state) => state.deviceId);
  const { data: devices, isLoading, isError, error } = useDevices();

  const limits = getPlanLimits(user?.plan);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive">{getErrorMessage(error, "Could not load devices")}</p>
      </div>
    );
  }

  const list = devices ?? [];
  const active = list.filter((d) => !d.isRevoked);
  const permanentUsed = active.filter((d) => d.kind === "permanent").length;
  const temporaryUsed = active.filter((d) => d.kind === "temporary").length;
  const limitReached = permanentUsed >= limits.permanent;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devices are added when you sign in — choose to register or use temporarily.
          </p>
        </div>
        <DeviceUsageCards
          permanentUsed={permanentUsed}
          permanentLimit={limits.permanent}
          temporaryUsed={temporaryUsed}
          temporaryLimit={limits.temporary}
        />
      </div>

      {limitReached && (
        <div className="flex items-start gap-3 rounded-xl border border-[oklch(0.55_0.19_25_/_0.25)] bg-[oklch(0.55_0.19_25_/_0.08)] p-3.5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[oklch(0.5_0.19_25)]" aria-hidden="true" />
          <p className="text-[13.5px] leading-relaxed text-[oklch(0.4_0.05_25)]">
            <span className="font-bold">
              Permanent device limit reached ({permanentUsed}/{limits.permanent}).
            </span>{" "}
            Revoke a device to register a new one at your next sign-in.
          </p>
        </div>
      )}

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-7 text-center text-[13.5px] leading-relaxed text-muted-foreground">
          No devices yet. The next time you sign in from a new device, you&apos;ll be asked to
          register it here or use it temporarily.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((device) => (
            <DeviceRow key={device.id} device={device} isCurrent={device.id === currentDeviceId} />
          ))}
        </div>
      )}
    </div>
  );
};
