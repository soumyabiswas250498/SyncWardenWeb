import { createBrowserRouter, Navigate } from "react-router-dom";
import { paths } from "./paths";
import { ProtectedRoute } from "./protected-route";
import { RequireDevice } from "./require-device";
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
        path: paths.registerDevice,
        lazy: async () => {
          const { default: RegisterDevicePage } = await import("@/pages/register-device-page");
          return {
            Component: () => (
              <ProtectedRoute>
                <RegisterDevicePage />
              </ProtectedRoute>
            ),
          };
        },
      },
      {
        path: paths.dashboard,
        lazy: async () => {
          const { default: DashboardPage } = await import("@/pages/dashboard-page");
          return {
            Component: () => (
              <ProtectedRoute>
                <RequireDevice>
                  <DashboardPage />
                </RequireDevice>
              </ProtectedRoute>
            ),
          };
        },
      },
      {
        path: paths.devices,
        lazy: async () => {
          const { default: DevicesPage } = await import("@/pages/devices-page");
          return {
            Component: () => (
              <ProtectedRoute>
                <RequireDevice>
                  <DevicesPage />
                </RequireDevice>
              </ProtectedRoute>
            ),
          };
        },
      },
      {
        path: paths.messages,
        lazy: async () => {
          const { default: MessagesPage } = await import("@/pages/messages-page");
          return {
            Component: () => (
              <ProtectedRoute>
                <RequireDevice>
                  <MessagesPage />
                </RequireDevice>
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
