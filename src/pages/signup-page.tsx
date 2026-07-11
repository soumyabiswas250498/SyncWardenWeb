import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthSuccessScreen } from "@/features/auth/components/auth-ui";
import { SignupForm } from "@/features/auth/components/signup-form";
import { VerifyOtpForm } from "@/features/auth/components/verify-otp-form";

type Step = { name: "form" } | { name: "verify"; email: string } | { name: "success" };

const SignupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ name: "form" });

  return (
    <AuthShell>
      {step.name === "form" && <SignupForm onRegistered={(email) => setStep({ name: "verify", email })} />}

      {step.name === "verify" && (
        <VerifyOtpForm
          email={step.email}
          purpose="email_verification"
          onBack={() => setStep({ name: "form" })}
          onVerified={() => setStep({ name: "success" })}
        />
      )}

      {step.name === "success" && (
        <AuthSuccessScreen
          title="Account verified"
          subtitle="You're all set. Sign in to start registering your devices."
          onContinue={() => void navigate("/signin", { replace: true })}
        />
      )}
    </AuthShell>
  );
};

export default SignupPage;
