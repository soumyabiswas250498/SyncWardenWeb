import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { ResetPasswordForm } from "./reset-password-form";

describe("ResetPasswordForm", () => {
  it("shows a validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm resetToken="mock-reset-token" onReset={vi.fn()} />);

    await user.type(screen.getByLabelText(/^new password$/i), "NewStrongPass456");
    await user.type(screen.getByLabelText(/confirm new password/i), "Mismatch123");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("resets the password and calls onReset on valid submit", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderWithProviders(<ResetPasswordForm resetToken="mock-reset-token" onReset={onReset} />);

    await user.type(screen.getByLabelText(/^new password$/i), "NewStrongPass456");
    await user.type(screen.getByLabelText(/confirm new password/i), "NewStrongPass456");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(onReset).toHaveBeenCalled();
    });
  });
});
