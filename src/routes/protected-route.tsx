import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth-store";

export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
