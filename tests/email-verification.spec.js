import { expect, test } from "@playwright/test";
import { login, mockApi } from "./helpers/apiFixtures.js";

const unverified = {
  email_verified_at: null,
  is_email_verified: false,
  email_verification_required: true,
};

const verified = {
  email_verified_at: new Date().toISOString(),
  is_email_verified: true,
  email_verification_required: false,
};

function json(route, status, body) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function signInToGate(page) {
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox before entering Sentinel" }),
  ).toBeVisible();
}

test("an unverified non-social login is gated without tenant requests", async ({ page }) => {
  const calls = await mockApi(page, { account: unverified });
  await signInToGate(page);

  await expect(page.getByText("ada@example.com", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend verification email" })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const { useAppStore } = await import("/src/stores/appStore.js");
      try {
        await useAppStore.getState().authenticatedApi("/workspaces");
        return "requested";
      } catch (failure) {
        return failure.code;
      }
    }),
  ).toBe("email_verification_required");
  expect(calls.filter((call) => call.path === "/workspaces")).toHaveLength(0);
  expect(calls.filter((call) => call.path.startsWith("/workspaces/"))).toHaveLength(0);
  expect(calls.filter((call) => /\/units\/[^/]+\/members/.test(call.path))).toHaveLength(0);
});

test("resend success gives clear feedback", async ({ page }) => {
  const calls = await mockApi(page, { account: unverified });
  await signInToGate(page);
  await page.getByRole("button", { name: "Resend verification email" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Verification email sent. Check your inbox and use the newest link.",
  );
  expect(calls.filter((call) => call.path === "/auth/email/resend")).toHaveLength(1);
});

test("resend throttling renders only safe feedback", async ({ page }) => {
  await mockApi(page, { account: unverified, resendThrottled: true });
  await signInToGate(page);
  await page.getByRole("button", { name: "Resend verification email" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Too many verification emails were requested. Please wait before trying again.",
  );
  await expect(page.locator("body")).not.toContainText("private limiter detail");
});

test("resend unavailability is recoverable and does not expose transport details", async ({ page }) => {
  await mockApi(page, { account: unverified, resendUnavailable: true });
  await signInToGate(page);
  await page.getByRole("button", { name: "Resend verification email" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Email delivery is temporarily unavailable. Please try again later.",
  );
  await expect(page.locator("body")).not.toContainText("private mail transport detail");
});

test("a signed-out valid landing scrubs the token and posts once under StrictMode", async ({ page }) => {
  const calls = await mockApi(page);
  const token = "sensitive-verification-token";
  await page.goto(`/verify-email?token=${token}`);

  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(
    page.getByRole("heading", { name: "Your email address is verified" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  const verificationCalls = calls.filter(
    (call) => call.path === "/auth/email/verify",
  );
  expect(verificationCalls).toHaveLength(1);
  expect(verificationCalls[0].body).toEqual({ token });
  expect(verificationCalls[0].headers.authorization).toBeUndefined();
  await expect(page.locator("body")).not.toContainText(token);
});

test("a signed-in valid landing refreshes the session and resumes the intended route", async ({ page }) => {
  const calls = await mockApi(page, { account: unverified });
  await page.goto("/analytics");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox before entering Sentinel" }),
  ).toBeVisible();
  expect(calls.filter((call) => call.path === "/workspaces")).toHaveLength(0);

  await page.goto("/verify-email?token=valid-once");
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
  expect(calls.filter((call) => call.path === "/auth/email/verify")).toHaveLength(1);
  expect(calls.some((call) => call.path === "/workspaces")).toBe(true);
});

test("verification unlock still routes a pending account to roster approval", async ({ page }) => {
  await mockApi(page, {
    noWorkspace: true,
    account: {
      ...unverified,
      is_approved: false,
      verification_status: "pending",
      can_create_workspace: false,
      oversight_scopes: [],
    },
  });
  await signInToGate(page);
  await page.goto("/verify-email?token=pending-account-token");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Your account is awaiting approval" }),
  ).toBeVisible();
});

test("verification unlock routes an unassigned approved account to workspace onboarding", async ({ page }) => {
  await mockApi(page, {
    noWorkspace: true,
    account: unverified,
  });
  await signInToGate(page);
  await page.goto("/verify-email?token=no-workspace-token");

  await expect(page).toHaveURL(/\/workspaces\/new$/);
  await expect(
    page.getByRole("heading", { name: "Create your office workspace" }),
  ).toBeVisible();
});

for (const [state, heading] of [
  ["invalid", "This verification link is invalid"],
  ["expired", "This verification link has expired"],
  ["reused", "This verification link has already been used"],
]) {
  test(`${state} verification links render safe public states`, async ({ page }) => {
    await mockApi(page, { verificationState: state });
    await page.goto(`/verify-email?token=${state}-private-token`);

    await expect(page).toHaveURL(/\/verify-email$/);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("private verification detail");
    await expect(page.locator("body")).not.toContainText(`${state}-private-token`);
  });
}

test("verification network failure can be retried without exposing the token", async ({ page }) => {
  await mockApi(page, { verificationNetworkError: true });
  await page.goto("/verify-email?token=network-private-token");

  await expect(page.getByRole("heading", { name: "We couldn’t check this link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("network-private-token");
});

test("manual status refresh unlocks workspaces only after verification", async ({ page }) => {
  const calls = await mockApi(page, { account: unverified });
  await signInToGate(page);
  await page.route("**/api/v1/auth/me", (route) =>
    json(route, 200, {
      user: {
        id: "u-1",
        name: "Ada Okafor",
        email: "ada@example.com",
        is_approved: true,
        is_roster_active: true,
        verification_status: "approved",
        ...verified,
      },
    }),
  );

  await page.getByRole("button", { name: "I verified my email" }).click();
  await expect(
    page.getByRole("heading", { name: "What Sentinel found for you." }),
  ).toBeVisible();
  expect(calls.some((call) => call.path === "/workspaces")).toBe(true);
});

test("focus refresh unlocks an externally verified session", async ({ page }) => {
  await mockApi(page, { account: unverified });
  await signInToGate(page);
  await page.route("**/api/v1/auth/me", (route) =>
    json(route, 200, {
      user: {
        id: "u-1",
        name: "Ada Okafor",
        email: "ada@example.com",
        is_approved: true,
        is_roster_active: true,
        verification_status: "approved",
        ...verified,
      },
    }),
  );

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("heading", { name: "What Sentinel found for you." }),
  ).toBeVisible();
});

test("an explicitly provider-verified account bypasses the email gate", async ({ page }) => {
  const calls = await mockApi(page, {
    account: { ...verified, auth_provider: "google" },
  });
  await login(page);

  await expect(
    page.getByRole("heading", { name: "Check your inbox before entering Sentinel" }),
  ).toHaveCount(0);
  expect(calls.some((call) => call.path === "/workspaces")).toBe(true);
});

test("the verification gate is mobile-safe and honours reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page, { account: unverified });
  await signInToGate(page);

  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    animation: getComputedStyle(document.querySelector(".verification-gate")).animationDuration,
    transition: getComputedStyle(document.querySelector(".primary-button")).transitionDuration,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.animation).toBe("0s");
  expect(dimensions.transition).toBe("0s");
});
