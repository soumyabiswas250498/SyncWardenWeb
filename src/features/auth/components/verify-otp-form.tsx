import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRequestOtp } from "../api/use-request-otp";
import { useVerifyOtp } from "../api/use-verify-otp";
import { otpSchema, type OtpFormValues } from "../schemas/otp-schema";
import type { OtpPurpose, VerifyOtpResponse } from "../types";
import { AuthSubmitButton, authBackLinkClass, authOtpBoxClass } from "./auth-ui";

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

interface VerifyOtpFormProps {
  email: string;
  purpose: OtpPurpose;
  onVerified: (data: VerifyOtpResponse) => void;
  onBack?: () => void;
}

export const VerifyOtpForm = ({ email, purpose, onVerified, onBack }: VerifyOtpFormProps) => {
  const verifyOtpMutation = useVerifyOtp();
  const requestOtpMutation = useRequestOtp();
  const [cooldown, setCooldown] = useState(0);
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    setValue("otp", digits.join(""), { shouldValidate: false });
  }, [digits, setValue]);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setInterval(() => {
      setCooldown((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = handleSubmit((values) => {
    verifyOtpMutation.mutate(
      { email, purpose, otp: values.otp },
      {
        onSuccess: onVerified,
        onError: (error) => {
          toast.error(getErrorMessage(error, "Unable to verify code"));
        },
      },
    );
  });

  const handleResend = () => {
    requestOtpMutation.mutate(
      { email, purpose },
      {
        onSuccess: () => {
          toast.success("A new code has been sent");
          setCooldown(RESEND_COOLDOWN_SECONDS);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "Unable to resend code"));
        },
      },
    );
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/[^0-9]/g, "").slice(-1);
    setDigits((previous) => {
      const next = [...previous];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="animate-[sw-fade-in_0.35s_ease]">
      {onBack && (
        <button type="button" onClick={onBack} className={authBackLinkClass}>
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          <span>Back</span>
        </button>
      )}
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Enter verification code</h1>
      <p className="mb-7 text-[14.5px] leading-relaxed text-muted-foreground">
        We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
      </p>

      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <Field data-invalid={!!errors.otp}>
          <div className="flex justify-between gap-2">
            {digits.map((value, index) => (
              <Input
                key={index}
                ref={(element) => {
                  boxRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                aria-invalid={!!errors.otp}
                value={value}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={handleKeyDown(index)}
                className={authOtpBoxClass}
              />
            ))}
          </div>
          <FieldError errors={[errors.otp]} className="mt-2.5" />
        </Field>

        <AuthSubmitButton pending={verifyOtpMutation.isPending} label="Verify" pendingLabel="Verifying…" />
      </form>

      <div className="mt-[18px] text-center text-[13.5px] text-muted-foreground">
        <Button
          type="button"
          variant="link"
          disabled={requestOtpMutation.isPending || cooldown > 0}
          onClick={handleResend}
          className="h-auto p-0 text-[13.5px] font-semibold no-underline disabled:text-muted-foreground disabled:opacity-100"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>
      </div>
    </div>
  );
};
