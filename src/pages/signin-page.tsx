import { AuthShell } from "@/features/auth/components/auth-shell";
import { SigninForm } from "@/features/auth/components/signin-form";

const SigninPage = () => (
  <AuthShell>
    <SigninForm />
  </AuthShell>
);

export default SigninPage;
