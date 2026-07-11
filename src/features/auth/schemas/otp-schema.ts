import { z } from "zod";

export const otpSchema = z.object({
  otp: z
    .string()
    .min(1, "Verification code is required")
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;
