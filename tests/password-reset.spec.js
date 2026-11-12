import { expect, test } from "@playwright/test";
import { mockApi } from "./helpers/apiFixtures.js";

const resetToken = "sensitive-password-reset-token";
const resetEmail = "ada@example.com";

async function openResetLink(page, token = resetToken, email = resetEmail) {
  await page.goto(
    `/reset-password?${new URLSearchParams({ token, email }).toString()}`,
  );
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();
}

async function fillPasswords(page, password = "new-password-123") {
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password", { exact: true }).fill(password);
}

test("forgot-password stays identical for known and unknown addresses", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/forgot-password");

  for (const email of ["known@example.com", "unknown@example.com"]) {
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "If that account exists, a reset link will be sent.",
    );
  }

  expect(
    calls
      .filter((call) => call.path === "/auth/forgot-password")
      .map((call) => call.body),
  ).toEqual([
    { email: "known@example.com" },
    { email: "unknown@example.com" },
  ]);
});

test("forgot-password throttling shows safe copy and permits a later retry", async ({
  page,
}) => {
  await mockApi(page, { forgotThrottled: true });
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Too many password reset requests. Please wait before trying again.",
  );
  await expect(page.locator("body")).not.toContainText(
    "private password-reset limiter detail",
  );
  await expect(
    page.getByRole("button", { name: "Send reset link" }),
  ).toBeEnabled();
});

test("successful reset submits once, clears a local session, and makes no tenant calls", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "sentinel_session",
      JSON.stringify({
        token: "revoked-session-token",
        user: { id: "u-1", email: "ada@example.com" },
      }),
    ),
  );
  const calls = await mockApi(page);
  await openResetLink(page);

  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(resetEmail);
  await fillPasswords(page);
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(
    page.getByRole("heading", { name: "Your password has been reset" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  const resetCalls = calls.filter(
    (call) => call.path === "/auth/reset-password",
  );
  expect(resetCalls).toHaveLength(1);
  expect(resetCalls[0].body).toEqual({
    token: resetToken,
    email: resetEmail,
    password: "new-password-123",
    password_confirmation: "new-password-123",
  });
  expect(resetCalls[0].headers.authorization).toBeUndefined();
  expect(
    calls.filter(
      (call) =>
        call.path === "/auth/me" ||
        call.path === "/workspaces" ||
        call.path.startsWith("/workspaces/") ||
        call.path.startsWith("/units/"),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem("sentinel_session") ||
        sessionStorage.getItem("sentinel_session"),
    ),
  ).toBeNull();
});

test("mismatched confirmation is rejected before the API receives a token", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await openResetLink(page);
  await page.getByLabel("New password", { exact: true }).fill("new-password-123");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password");
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByRole("alert")).toHaveText("Passwords do not match.");
  expect(calls.filter((call) => call.path === "/auth/reset-password")).toEqual(
    [],
  );
});

for (const state of ["invalid", "expired", "reused", "wrong_email"]) {
  test(`${state} reset response uses the same generic recovery state`, async ({
    page,
  }) => {
    await mockApi(page, { passwordResetState: state });
    await openResetLink(page, `${state}-private-token`);
    await fillPasswords(page);
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(
      page.getByRole("heading", {
        name: "This password reset link can’t be used",
      }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveText(
      "This link may be invalid, expired, or already used. Request a new password reset link to continue.",
    );
    await expect(
      page.getByRole("link", { name: "Request a new link" }),
    ).toHaveAttribute("href", "/forgot-password");
    await expect(page.locator("body")).not.toContainText(
      "private reset-token detail",
    );
    await expect(page.locator("body")).not.toContainText(
      `${state}-private-token`,
    );
  });
}

test("reset link query is scrubbed immediately and never persisted", async ({ page }) => {
  const calls = await mockApi(page);
  await openResetLink(page);

  await expect(page).toHaveURL(/\/reset-password$/);
  const storage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain(resetToken);
  expect(JSON.stringify(storage)).not.toContain(resetEmail);
  expect(calls).toEqual([]);

  await page.getByRole("link", { name: "Return to sign in" }).click();
  await page.goBack();
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(
    page.getByRole("heading", { name: "This password reset link can’t be used" }),
  ).toBeVisible();
});

test("network failure keeps the in-memory token and fields for a safe retry", async ({
  page,
}) => {
  const calls = await mockApi(page, { passwordResetNetworkError: true });
  await openResetLink(page);
  await fillPasswords(page);
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Unable to connect. Check your connection and try again.",
  );
  await expect(page.getByLabel("New password", { exact: true })).toHaveValue(
    "new-password-123",
  );
  await expect(
    page.getByLabel("Confirm new password", { exact: true }),
  ).toHaveValue("new-password-123");
  await page.getByRole("button", { name: "Try again" }).click();

  await expect(
    page.getByRole("heading", { name: "Your password has been reset" }),
  ).toBeVisible();
  const attempts = calls.filter(
    (call) => call.path === "/auth/reset-password",
  );
  expect(attempts).toHaveLength(2);
  expect(attempts[0].body.token).toBe(resetToken);
  expect(attempts[1].body).toEqual(attempts[0].body);
});

test("social-only accounts use the same reset contract without a current password", async ({
  page,
}) => {
  const calls = await mockApi(page, { passwordResetSocialOnly: true });
  await openResetLink(page, "social-only-reset", "social@example.com");
  await expect(
    page.getByText(/Social-only accounts can use this flow/),
  ).toBeVisible();
  await fillPasswords(page, "first-local-password");
  await page.getByRole("button", { name: "Reset password" }).click();

  const body = calls.find(
    (call) => call.path === "/auth/reset-password",
  ).body;
  expect(body).toEqual({
    token: "social-only-reset",
    email: "social@example.com",
    password: "first-local-password",
    password_confirmation: "first-local-password",
  });
  expect(body).not.toHaveProperty("current_password");
});

test("reset form is mobile-safe and password controls are independent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await openResetLink(page);

  const password = page.getByLabel("New password", { exact: true });
  const confirmation = page.getByLabel("Confirm new password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show new password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show password confirmation" })
    .click();
  await expect(confirmation).toHaveAttribute("type", "text");

  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    transition: getComputedStyle(document.querySelector(".primary-button"))
      .transitionDuration,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.transition).toBe("0s");
});
