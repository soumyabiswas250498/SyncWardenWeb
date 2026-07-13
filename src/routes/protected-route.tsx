import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  // Wait for session restore to finish before deciding — avoids a redirect
  // flicker on reload while the access token is being refreshed.
  if (isBootstrapping) {
    return (
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};
