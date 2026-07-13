import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerDevice } from "./devices-api";
import { devicesKeys } from "./use-devices";

export const useRegisterDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: devicesKeys.list() }),
  });
};
