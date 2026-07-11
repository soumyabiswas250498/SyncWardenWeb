import { useMutation } from "@tanstack/react-query";
import { verifyOtp } from "./auth-api";

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: verifyOtp,
  });
