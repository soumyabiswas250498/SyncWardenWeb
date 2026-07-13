import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paths } from "@/routes/paths";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { AppShell } from "@/features/devices/components/app-shell";

const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Welcome{user ? `, ${user.name}` : ""}</CardTitle>
          <CardDescription>
            This browser is registered as a device. Manage your devices, presence, and transfers
            from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={paths.devices}>Manage devices</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default DashboardPage;
