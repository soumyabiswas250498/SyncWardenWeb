import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { VerifyOtpForm } from "./verify-otp-form";

const typeOtp = async (user: ReturnType<typeof userEvent.setup>, code: string) => {
  const digits = code.split("");
  for (let index = 0; index < digits.length; index += 1) {
    await user.type(screen.getByLabelText(new RegExp(`digit ${index + 1} of 6`, "i")), digits[index] ?? "");
  }
};

describe("VerifyOtpForm", () => {
  it("shows a validation error for an incomplete code", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VerifyOtpForm email="user@example.com" purpose="email_verification" onVerified={vi.fn()} />,
    );

    await typeOtp(user, "123");
    await user.click(screen.getByRole("button", { name: /^verify$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter the 6-digit code/i);
  });

  it("verifies the code and reports the result on valid submit", async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();
    renderWithProviders(
      <VerifyOtpForm email="user@example.com" purpose="email_verification" onVerified={onVerified} />,
    );

    await typeOtp(user, "123456");
    await user.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalled();
    });
    expect(onVerified.mock.calls.at(0)?.at(0)).toEqual(
      expect.objectContaining({ verificationAction: "signup_completed" }),
    );
  });

  it("resends the code and disables the resend button during cooldown", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VerifyOtpForm email="user@example.com" purpose="email_verification" onVerified={vi.fn()} />,
    );

    const resendButton = screen.getByRole("button", { name: /resend code/i });
    await user.click(resendButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /resend code in \d+s/i })).toBeDisabled();
    });
  });
});
