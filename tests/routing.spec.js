import { test, expect } from "@playwright/test";
import { mockApi, login } from "./helpers/apiFixtures.js";
const goTo = (page, name) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: new RegExp(`^${name}(?: \\d+)?$`) })
    .click();

test("all private URLs redirect unauthenticated visitors before making private API calls", async ({
  page,
}) => {
  const calls = await mockApi(page);
  for (const path of [
    "/",
    "/search?q=MTN",
    "/monitors",
    "/intelligence",
    "/analytics",
    "/alerts",
    "/settings",
    "/workspaces/new",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/signin$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to your workspace" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toHaveCount(0);
  }
  expect(calls).toEqual([]);
});
test("sign-in returns to the requested private deep link with search filters intact", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/search?q=MTN&sentiment=positive&language=en");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    /\/search\?q=MTN&sentiment=positive&language=en$/,
  );
  await expect(page.getByLabel("Search query")).toHaveValue("MTN");
  await expect(page.getByLabel("Sentiment", { exact: true })).toHaveValue(
    "positive",
  );
  await expect(
    page.getByRole("button", { name: /Verified backend result/ }),
  ).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.url.includes("sentiment=positive") &&
        call.url.includes("language=en"),
    ),
  ).toBe(true);
});
test("private pages survive refresh and navigation supports browser back/forward", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await goTo(page, "Monitors");
  await expect(page).toHaveURL(/\/monitors$/);
  await expect(
    page.getByRole("heading", { name: "Monitors", exact: true }),
  ).toBeVisible();
  await goTo(page, "Analytics");
  await expect(page).toHaveURL(/\/analytics$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/monitors$/);
  await expect(
    page.getByRole("heading", { name: "Monitors", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toBeVisible();
});
test("a stored token never renders protected content before the server validates it", async ({
  page,
}) => {
  const calls = await mockApi(page);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "sentinel_session",
      JSON.stringify({ token: "test-session-token", user: { id: "u-1" } }),
    ),
  );
  await page.route("**/api/v1/auth/me", async (route) => {
    await gate;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthenticated." }),
    });
  });
  await page.goto("/analytics");
  await expect(page.getByText("Verifying your session…")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toHaveCount(0);
  expect(calls.filter((call) => call.path.startsWith("/workspaces/"))).toEqual(
    [],
  );
  release();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByText("Your session has expired. Please sign in again."),
  ).toBeVisible();
});
test("a 401 while using a protected page clears global state and redirects to sign-in", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.route("**/api/v1/workspaces/w-1/search**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthenticated." }),
    }),
  );
  await page.goto("/search?q=MTN");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("sentinel_session")),
  ).toBeNull();
});
test("demo routes remain public but cannot bypass private route protection", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/demo/monitors");
  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
  await goTo(page, "Search");
  await expect(page).toHaveURL(/\/demo\/search$/);
  await page.goto("/monitors");
  await expect(page).toHaveURL(/\/signin$/);
  expect(calls).toEqual([]);
});
test("logout clears access even when the revocation service is offline", async ({
  page,
}) => {
  await mockApi(page, { logoutOffline: true });
  await login(page);
  await goTo(page, "Analytics");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByText(
      "Signed out on this device. The server could not be reached to revoke this session.",
    ),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/signin$/);
  expect(
    await page.evaluate(
      () =>
        localStorage.getItem("sentinel_session") ||
        sessionStorage.getItem("sentinel_session"),
    ),
  ).toBeNull();
});
test("workspace selection uses Zustand across pages and persists only an authorized workspace", async ({
  page,
}) => {
  const calls = await mockApi(page, { multipleWorkspaces: true });
  await login(page);
  await page.getByLabel("Workspace", { exact: true }).selectOption("w-2");
  await expect(
    page.getByRole("button", { name: /Workspace two monitor/ }),
  ).toBeVisible();
  await goTo(page, "Monitors");
  await expect(
    page.getByRole("button", { name: /Workspace two monitor/ }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Workspace", { exact: true })).toHaveValue(
    "w-2",
  );
  expect(calls.some((call) => call.path === "/workspaces/w-2/monitors")).toBe(
    true,
  );
  const saved = await page.evaluate(() =>
    localStorage.getItem("sentinel_preferences"),
  );
  expect(saved).not.toContain("test-session-token");
  expect(Object.keys(JSON.parse(saved).state).sort()).toEqual([
    "preferences",
    "workspaceSelections",
  ]);
});
test("profile updates propagate through the shared store to the sidebar", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.goto("/settings?section=account");
  await page.getByLabel("Full name", { exact: true }).fill("Moses Orogun");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .getByRole("complementary")
      .first()
      .getByText("Moses Orogun", { exact: true }),
  ).toBeVisible();
});
test("new workspace onboarding preserves the requested destination", async ({
  page,
}) => {
  await mockApi(page, { noWorkspace: true });
  await page.goto("/search?q=MTN");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/workspaces\/new$/);
  await page.getByLabel("Workspace name").fill("New research team");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/\/search\?q=MTN$/);
  await expect(
    page.getByRole("button", { name: /Verified backend result/ }),
  ).toBeVisible();
});
test("persisted preference payloads cannot inject an authenticated session", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "sentinel_preferences",
      JSON.stringify({
        state: {
          session: { token: "forged" },
          user: { id: "forged" },
          workspaceId: "w-1",
          boot: { loading: false, error: "" },
        },
        version: 0,
      }),
    ),
  );
  await page.goto("/analytics");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByRole("heading", { name: "Analytics", exact: true }),
  ).toHaveCount(0);
  expect(calls).toEqual([]);
});
test("unknown private URLs display a safe not-found page after authentication", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await page.goto("/not-a-page");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Go home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("bootstrap errors keep private pages closed and can be retried safely", async ({
  page,
}) => {
  await mockApi(page);
  await page.route(
    "**/api/v1/auth/me",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Account service unavailable" }),
      }),
    { times: 1 },
  );
  await page.goto("/monitors");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Unable to open your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Monitors", exact: true }),
  ).toBeVisible();
});
