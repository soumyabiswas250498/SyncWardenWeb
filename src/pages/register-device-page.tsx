import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterDeviceForm } from "@/features/devices/components/register-device-form";
import { activateDeviceSession } from "@/lib/axios";
import { getDeviceKeys } from "@/lib/deviceIdentity";
import { paths } from "@/routes/paths";

/**
 * If this browser already holds a device session (registered before, session
 * just not active in memory) we activate it and go straight to the dashboard.
 * Otherwise we show the registration form — flagging the key-loss case where
 * the user is logged in but the device key is gone.
 */
const RegisterDevicePage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "form">("checking");
  const [keyLoss, setKeyLoss] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (await activateDeviceSession()) {
        if (!cancelled) void navigate(paths.dashboard, { replace: true });
        return;
      }
      const keys = await getDeviceKeys();
      if (!cancelled) {
        setKeyLoss(!keys);
        setState("form");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AuthShell>
      {state === "form" ? (
        <RegisterDeviceForm keyLossRecovery={keyLoss} />
      ) : (
        <div className="py-10 text-center text-sm text-muted-foreground">Checking this device…</div>
      )}
    </AuthShell>
  );
};

export default RegisterDevicePage;
