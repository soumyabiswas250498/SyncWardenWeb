import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./protected-route";
import { RootLayout } from "./root-layout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    HydrateFallback: () => null,
    children: [
      {
        path: "/",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "/login",
        lazy: async () => {
          const { default: Component } = await import("@/pages/login-page");
          return { Component };
        },
      },
      {
        path: "/dashboard",
        lazy: async () => {
          const { default: DashboardPage } = await import("@/pages/dashboard-page");
          return {
            Component: () => (
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            ),
          };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const { default: Component } = await import("@/pages/not-found-page");
          return { Component };
        },
      },
    ],
  },
]);
