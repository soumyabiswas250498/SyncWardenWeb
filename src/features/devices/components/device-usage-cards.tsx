import { cn } from "@/lib/utils";

interface UsageCardProps {
  label: string;
  used: number;
  limit: number;
}

const UsageCard = ({ label, used, limit }: UsageCardProps) => {
  const atLimit = used >= limit;
  const pct = Math.min(100, limit === 0 ? 0 : (used / limit) * 100);
  return (
    <div className="min-w-[128px] rounded-xl border border-border bg-card px-4 py-3">
      <div className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mb-2 flex items-baseline gap-1">
        <span className="text-lg font-bold">{used}</span>
        <span className="text-[13px] text-muted-foreground">/ {limit}</span>
      </div>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-[oklch(0.9_0.008_85)]">
        <div
          className={cn(
            "h-full rounded-full",
            atLimit ? "bg-[oklch(0.58_0.19_25)]" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

interface DeviceUsageCardsProps {
  permanentUsed: number;
  permanentLimit: number;
  temporaryUsed: number;
  temporaryLimit: number;
}

export const DeviceUsageCards = ({
  permanentUsed,
  permanentLimit,
  temporaryUsed,
  temporaryLimit,
}: DeviceUsageCardsProps) => (
  <div className="flex flex-wrap gap-2.5">
    <UsageCard label="Permanent" used={permanentUsed} limit={permanentLimit} />
    <UsageCard label="Temporary" used={temporaryUsed} limit={temporaryLimit} />
  </div>
);
