import { type PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { paths } from "./paths";

/**
 * Gate for pages that need a device-scoped session (device management,
 * transfers). An authenticated user whose browser is not yet a registered
 * device is sent to the registration screen. Assumes it renders inside
 * ProtectedRoute, which already handles bootstrapping + unauthenticated.
 */
export const RequireDevice = ({ children }: PropsWithChildren) => {
  const scope = useAuthStore((state) => state.scope);

  if (scope !== "device") {
    return <Navigate to={paths.registerDevice} replace />;
  }

  return children;
};
