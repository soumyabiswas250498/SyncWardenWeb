import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateDevicePayload } from "../types";
import { updateDevice } from "./devices-api";
import { devicesKeys } from "./use-devices";

export const useUpdateDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateDevicePayload) =>
      updateDevice(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: devicesKeys.list() }),
  });
};
