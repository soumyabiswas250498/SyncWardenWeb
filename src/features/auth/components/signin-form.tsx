import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignin } from "../api/use-signin";
import { useAuthStore } from "../store/auth-store";
import { signinSchema, type SigninFormValues } from "../schemas/signin-schema";
import {
    AuthSubmitButton,
    PasswordField,
    authFieldLabelClass,
    authInputClass,
    authLinkClass,
} from "./auth-ui";

export const SigninForm = () => {
    const navigate = useNavigate();
    const setSession = useAuthStore((state) => state.setSession);
    const signinMutation = useSignin();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SigninFormValues>({
        resolver: zodResolver(signinSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = handleSubmit((values) => {
        signinMutation.mutate(values, {
            onSuccess: (data) => {
                setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
                toast.success("Signed in successfully");
                void navigate("/dashboard", { replace: true });
            },
            onError: (error) => {
                toast.error(getErrorMessage(error, "Unable to sign in"));
            },
        });
    });

    return (
        <div className="animate-[sw-fade-in_0.35s_ease]">
            <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Welcome back</h1>
            <p className="mb-7 text-[14.5px] text-muted-foreground">Sign in to manage your devices and transfers.</p>

            <form onSubmit={(event) => void onSubmit(event)} noValidate>
                <FieldGroup>
                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="email" className={authFieldLabelClass}>
                            Email
                        </FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            className={authInputClass}
                            {...register("email")}
                        />
                        <FieldError errors={[errors.email]} />
                    </Field>

                    <div>
                        <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="password" className={cn(authFieldLabelClass, "mb-0")}>
                                Password
                            </FieldLabel>
                            <Link to="/forgot-password" className={cn(authLinkClass, "text-[13px]")}>
                                Forgot password?
                            </Link>
                        </div>
                        <PasswordField
                            id="password"
                            label="Password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            registration={register("password")}
                            error={errors.password}
                            hideLabel
                        />
                    </div>

                    <AuthSubmitButton
                        pending={signinMutation.isPending}
                        label="Sign in"
                        pendingLabel="Signing in…"
                        className="mt-0"
                    />
                </FieldGroup>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className={authLinkClass}>
                    Sign up
                </Link>
            </div>
        </div>
    );
};
