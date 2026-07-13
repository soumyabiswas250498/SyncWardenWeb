import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SessionBootstrap } from "@/components/session-bootstrap";

export const RootLayout = () => (
  <SessionBootstrap>
    <Outlet />
    <Toaster />
  </SessionBootstrap>
);
