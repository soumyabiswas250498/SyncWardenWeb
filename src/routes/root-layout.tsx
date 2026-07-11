import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

export const RootLayout = () => (
  <>
    <Outlet />
    <Toaster />
  </>
);
