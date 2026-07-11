import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { SignupForm } from "./signup-form";

describe("SignupForm", () => {
  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm onRegistered={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/phone is required/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("shows only the first failing password rule", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm onRegistered={vi.fn()} />);

    await user.type(screen.getByLabelText(/^password$/i), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/add at least one uppercase letter/i)).toBeInTheDocument();
    expect(screen.queryByText(/add at least one lowercase letter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add at least one number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add at least one symbol/i)).not.toBeInTheDocument();
  });

  it("registers and reports the email on valid submit", async () => {
    const user = userEvent.setup();
    const onRegistered = vi.fn();
    renderWithProviders(<SignupForm onRegistered={onRegistered} />);

    await user.type(screen.getByLabelText(/name/i), "Sync Warden User");
    await user.type(screen.getByLabelText(/email/i), "new-user@example.com");
    await user.type(screen.getByLabelText(/phone/i), "+12025550123");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith("new-user@example.com");
    });
  });
});
