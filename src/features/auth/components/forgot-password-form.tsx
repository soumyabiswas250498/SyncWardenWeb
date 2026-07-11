import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/get-error-message";
import { useForgotPassword } from "../api/use-forgot-password";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../schemas/forgot-password-schema";
import { AuthSubmitButton, authBackLinkClass, authFieldLabelClass, authInputClass } from "./auth-ui";

interface ForgotPasswordFormProps {
  onSubmitted: (email: string) => void;
}

export const ForgotPasswordForm = ({ onSubmitted }: ForgotPasswordFormProps) => {
  const forgotPasswordMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    forgotPasswordMutation.mutate(values, {
      onSuccess: () => {
        toast.success("If that email exists, we sent a verification code");
        onSubmitted(values.email);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, "Unable to start password reset"));
      },
    });
  });

  return (
    <div className="animate-[sw-fade-in_0.35s_ease]">
      <Link to="/signin" className={authBackLinkClass}>
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        <span>Back to sign in</span>
      </Link>
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Reset your password</h1>
      <p className="mb-7 text-[14.5px] text-muted-foreground">
        Enter your account email and we&apos;ll send a verification code.
      </p>

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

          <AuthSubmitButton pending={forgotPasswordMutation.isPending} label="Send code" pendingLabel="Sending code…" />
        </FieldGroup>
      </form>
    </div>
  );
};
