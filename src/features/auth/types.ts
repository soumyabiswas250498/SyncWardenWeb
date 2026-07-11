export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export type OtpPurpose = "email_verification" | "forgot_password";

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface OtpFlowData {
  email: string;
  purpose: OtpPurpose;
  otp: string | null;
  expiresInSeconds: number;
}

export interface RequestOtpPayload {
  email: string;
  purpose: OtpPurpose;
}

export interface VerifyOtpPayload {
  email: string;
  purpose: OtpPurpose;
  otp: string;
}

export interface VerifyOtpResponse {
  email: string;
  purpose: OtpPurpose;
  verified: true;
  verificationAction: "signup_completed" | "forgot_password_verified" | "otp_verified";
  user?: AuthUser;
  resetToken?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResetPayload {
  resetToken: string;
  newPassword: string;
}
