import { useMutation } from "@tanstack/react-query";
import { registerUser } from "./auth-api";

export const useSignup = () =>
  useMutation({
    mutationFn: registerUser,
  });
