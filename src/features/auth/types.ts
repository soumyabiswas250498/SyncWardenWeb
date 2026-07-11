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
