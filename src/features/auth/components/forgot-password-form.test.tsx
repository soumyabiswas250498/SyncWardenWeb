import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { ForgotPasswordForm } from "./forgot-password-form";

describe("ForgotPasswordForm", () => {
  it("shows a validation error for an invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm onSubmitted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /send code/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it("reports the email once the reset code has been requested", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    renderWithProviders(<ForgotPasswordForm onSubmitted={onSubmitted} />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledWith("user@example.com");
    });
  });
});
