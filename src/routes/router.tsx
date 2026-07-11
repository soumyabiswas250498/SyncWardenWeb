import { createBrowserRouter, Navigate } from "react-router-dom";
import { paths } from "./paths";
import { ProtectedRoute } from "./protected-route";
import { RootLayout } from "./root-layout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    HydrateFallback: () => null,
    children: [
      {
        path: paths.home,
        element: <Navigate to={paths.dashboard} replace />,
      },
      {
        path: paths.signin,
        lazy: async () => {
          const { default: Component } = await import("@/pages/signin-page");
          return { Component };
        },
      },
      {
        path: paths.signup,
        lazy: async () => {
          const { default: Component } = await import("@/pages/signup-page");
          return { Component };
        },
      },
      {
        path: paths.forgotPassword,
        lazy: async () => {
          const { default: Component } = await import("@/pages/forgot-password-page");
          return { Component };
        },
      },
      {
        path: paths.dashboard,
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
        path: paths.notFound,
        lazy: async () => {
          const { default: Component } = await import("@/pages/not-found-page");
          return { Component };
        },
      },
    ],
  },
]);
