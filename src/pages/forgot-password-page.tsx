import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthSuccessScreen } from "@/features/auth/components/auth-ui";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { VerifyOtpForm } from "@/features/auth/components/verify-otp-form";

type Step =
  | { name: "email" }
  | { name: "verify"; email: string }
  | { name: "reset"; resetToken: string }
  | { name: "success" };

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ name: "email" });

  return (
    <AuthShell>
      {step.name === "email" && (
        <ForgotPasswordForm onSubmitted={(email) => setStep({ name: "verify", email })} />
      )}

      {step.name === "verify" && (
        <VerifyOtpForm
          email={step.email}
          purpose="forgot_password"
          onBack={() => setStep({ name: "email" })}
          onVerified={(data) => {
            if (!data.resetToken) {
              toast.error("Unable to verify code");
              return;
            }
            setStep({ name: "reset", resetToken: data.resetToken });
          }}
        />
      )}

      {step.name === "reset" && (
        <ResetPasswordForm resetToken={step.resetToken} onReset={() => setStep({ name: "success" })} />
      )}

      {step.name === "success" && (
        <AuthSuccessScreen
          title="Password updated"
          subtitle="Your password has been changed. Sign in with your new password."
          onContinue={() => void navigate("/signin", { replace: true })}
        />
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
