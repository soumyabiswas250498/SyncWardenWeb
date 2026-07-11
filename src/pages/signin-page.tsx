import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

const LoginPage = () => (
  <div className="flex min-h-svh items-center justify-center p-4">
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to SyncWarden</CardTitle>
        <CardDescription>Enter your credentials to access your devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  </div>
);

export default LoginPage;
