import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { SigninForm } from "./signin-form";
import { useAuthStore } from "../store/auth-store";

describe("SigninForm", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SigninForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("logs in and stores the session on valid submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SigninForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "StrongPass123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    expect(useAuthStore.getState().user?.email).toBe("user@example.com");
  });
});
