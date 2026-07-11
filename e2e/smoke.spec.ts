import { expect, test } from "@playwright/test";

test("redirects unauthenticated users to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/sign in to syncwarden/i)).toBeVisible();
});

test("shows validation errors on empty submit", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText(/email is required/i)).toBeVisible();
  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
});
