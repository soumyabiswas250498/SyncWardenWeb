import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FieldGroup } from "@/components/ui/field";
import { getErrorMessage } from "@/lib/get-error-message";
import { useForgotPasswordReset } from "../api/use-forgot-password-reset";
import {
  forgotPasswordResetSchema,
  type ForgotPasswordResetFormValues,
} from "../schemas/forgot-password-reset-schema";
import { AuthSubmitButton, PasswordField } from "./auth-ui";

interface ResetPasswordFormProps {
  resetToken: string;
  onReset: () => void;
}

export const ResetPasswordForm = ({ resetToken, onReset }: ResetPasswordFormProps) => {
  const resetPasswordMutation = useForgotPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordResetFormValues>({
    resolver: zodResolver(forgotPasswordResetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    resetPasswordMutation.mutate(
      { resetToken, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success("Password reset successfully");
          onReset();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "Unable to reset password"));
        },
      },
    );
  });

  return (
    <div className="animate-[sw-fade-in_0.35s_ease]">
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">Set a new password</h1>
      <p className="mb-7 text-[14.5px] text-muted-foreground">Choose a new password for your account.</p>

      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <FieldGroup>
          <PasswordField
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            registration={register("newPassword")}
            error={errors.newPassword}
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="••••••••"
            registration={register("confirmPassword")}
            error={errors.confirmPassword}
          />

          <AuthSubmitButton pending={resetPasswordMutation.isPending} label="Update password" pendingLabel="Updating…" />
        </FieldGroup>
      </form>
    </div>
  );
};
