import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "./auth-api";

export const useForgotPassword = () =>
  useMutation({
    mutationFn: forgotPassword,
  });
