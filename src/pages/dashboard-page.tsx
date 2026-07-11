import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/features/auth/store/auth-store";

const DashboardPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = () => {
    clearSession();
    void navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Welcome{user ? `, ${user.name}` : ""}</CardTitle>
          <CardDescription>
            This is a placeholder dashboard. Device list, presence, and transfer UI will live here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
