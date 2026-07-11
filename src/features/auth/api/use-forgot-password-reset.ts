import { useMutation } from "@tanstack/react-query";
import { resetForgottenPassword } from "./auth-api";

export const useForgotPasswordReset = () =>
  useMutation({
    mutationFn: resetForgottenPassword,
  });
