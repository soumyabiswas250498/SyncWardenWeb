import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignup } from "../api/use-signup";
import { signupSchema, type SignupFormValues } from "../schemas/signup-schema";
import {
    AuthSubmitButton,
    PasswordField,
    PhoneNumberField,
    authFieldLabelClass,
    authInputClass,
    authLinkClass,
} from "./auth-ui";

interface SignupFormProps {
    onRegistered: (email: string) => void;
}

export const SignupForm = ({ onRegistered }: SignupFormProps) => {
    const signupMutation = useSignup();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
    });

    const onSubmit = handleSubmit((values) => {
        const payload = {
            name: values.name,
            email: values.email,
            password: values.password,
            phone: values.phone,
        };
        signupMutation.mutate(payload, {
            onSuccess: (data) => {
                toast.success("We sent you a verification code");
                onRegistered(data.email);
            },
            onError: (error) => {
                toast.error(getErrorMessage(error, "Unable to sign up"));
            },
        });
    });

    return (
        <div className="animate-[sw-fade-in_0.35s_ease]">
            <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Create your account</h1>
            <p className="mb-7 text-[14.5px] text-muted-foreground">Set up SyncWarden to start syncing your devices.</p>

            <form onSubmit={(event) => void onSubmit(event)} noValidate>
                <FieldGroup className="gap-0 [&>[data-slot=field]]:gap-1">
                    <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="name" className={authFieldLabelClass}>
                            Full name
                        </FieldLabel>
                        <Input
                            id="name"
                            placeholder="Jordan Lee"
                            autoComplete="name"
                            aria-invalid={!!errors.name}
                            className={authInputClass}
                            {...register("name")}
                        />
                        <div className="min-h-5">
                            <FieldError errors={[errors.name]} />
                        </div>
                    </Field>

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
                        <div className="min-h-5">
                            <FieldError errors={[errors.email]} />
                        </div>
                    </Field>

                    <Field data-invalid={!!errors.phone}>
                        <FieldLabel htmlFor="phone" className={authFieldLabelClass}>
                            Phone number
                        </FieldLabel>
                        <PhoneNumberField control={control} name="phone" error={errors.phone} />
                        <div className="min-h-5">
                            <FieldError errors={[errors.phone]} />
                        </div>
                    </Field>

                    <PasswordField
                        id="password"
                        label="Password"
                        autoComplete="new-password"
                        placeholder="8+ with A-Z, a-z, number, and symbol"
                        registration={register("password")}
                        error={errors.password}
                    />

                    <PasswordField
                        id="confirmPassword"
                        label="Confirm password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        registration={register("confirmPassword")}
                        error={errors.confirmPassword}
                    />

                    <AuthSubmitButton
                        pending={signupMutation.isPending}
                        label="Create account"
                        pendingLabel="Creating account…"
                        className="mt-2"
                    />
                </FieldGroup>
            </form>

            <p className="mt-3.5 text-center text-[12.5px] leading-relaxed text-muted-foreground">
                We&apos;ll send a one-time code to your email to verify it&apos;s you.
            </p>

            <div className="mt-[18px] text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className={authLinkClass}>
                    Sign in
                </Link>
            </div>
        </div>
    );
};
