import { useMutation } from "@tanstack/react-query";
import { requestOtp } from "./auth-api";

export const useRequestOtp = () =>
  useMutation({
    mutationFn: requestOtp,
  });
