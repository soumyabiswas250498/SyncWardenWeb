import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revokeDevice } from "./devices-api";
import { devicesKeys } from "./use-devices";

export const useRevokeDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: devicesKeys.list() }),
  });
};
