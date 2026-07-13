import { useQuery } from "@tanstack/react-query";
import { listDevices } from "./devices-api";

export const devicesKeys = {
  all: ["devices"] as const,
  list: () => [...devicesKeys.all, "list"] as const,
};

export const useDevices = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: devicesKeys.list(),
    queryFn: listDevices,
    enabled: options?.enabled ?? true,
  });
