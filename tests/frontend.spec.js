import { test, expect } from "@playwright/test";
import { mockApi, login } from "./helpers/apiFixtures.js";

test("sign-in matches the split layout, has bundled styling and accessible inputs", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));
  await mockApi(page);
  await page.goto("/signin");
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  await expect(page.getByLabel("Work email")).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "G Google", exact: true }),
  ).toBeDisabled();
  const story = await page.locator(".auth-story").boundingBox();
  expect(Math.round(story.width)).toBe(641);
  expect(
    await page
      .locator(".primary-button")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(34, 105, 78)");
  expect(requests.some((url) => url.includes("cdn.tailwindcss.com"))).toBe(
    false,
  );
  expect(errors).toEqual([]);
});

test("login sends documented credentials, displays live dashboard, and restores persistent session", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await login(page);
  await expect(
    page.getByRole("button", { name: /MTN Nigeria organisation/ }),
  ).toBeVisible();
  await expect(page.getByText("4,821", { exact: true })).toBeVisible();
  await expect(page.getByText("Ada Okafor", { exact: true })).toBeVisible();
  expect(calls.find((call) => call.path === "/auth/login").body).toEqual({
    email: "ada@example.com",
    password: "correct-password",
    device_name: "Sentinel web",
  });
  expect(
    await page.evaluate(() => !!localStorage.getItem("sentinel_session")),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Discover what’s happening online." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("sentinel_session")),
  ).toBeNull();
  expect(calls.some((call) => call.path === "/auth/logout")).toBe(true);
});

test("unchecked remember option uses session storage only", async ({
  page,
}) => {
  await mockApi(page);
  await login(page, false);
  expect(
    await page.evaluate(() => localStorage.getItem("sentinel_session")),
  ).toBeNull();
  expect(
    await page.evaluate(() => !!sessionStorage.getItem("sentinel_session")),
  ).toBe(true);
});

test("signup validates confirmation and terms, then sends documented register payload", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Ada Okafor");
  await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  expect(calls.filter((call) => call.path === "/auth/register")).toHaveLength(
    0,
  );
  await page.getByLabel("I agree to the Terms").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Passwords do not match.");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("correct-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Discover what’s happening online." }),
  ).toBeVisible();
  const body = calls.find((call) => call.path === "/auth/register").body;
  expect(body).toMatchObject({
    name: "Ada Okafor",
    email: "ada@example.com",
    password: "correct-password",
    password_confirmation: "correct-password",
  });
  expect(body.timezone).toBeTruthy();
});

test("forgot password calls its public endpoint and displays neutral confirmation", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/signin");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "If that account exists, a reset link will be sent.",
  );
  expect(
    calls.find((call) => call.path === "/auth/forgot-password").body,
  ).toEqual({ email: "ada@example.com" });
});

for (const [name, options, message] of [
  [
    "validation",
    { loginError: true },
    "Check your email and password, then try again.",
  ],
  [
    "offline",
    { offline: true },
    "Unable to connect. Check your connection and try again.",
  ],
]) {
  test(`${name} error stays on sign-in and restores the submit button`, async ({
    page,
  }) => {
    await mockApi(page, options);
    await page.goto("/signin");
    await page.getByLabel("Work email").fill("ada@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(message);
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(() => localStorage.getItem("sentinel_session")),
    ).toBeNull();
  });
}

test("expired session is cleared and returns to sign-in", async ({ page }) => {
  await mockApi(page, { expired: true });
  await page.addInitScript(() =>
    localStorage.setItem(
      "sentinel_session",
      JSON.stringify({ token: "test-session-token", user: { id: "u-1" } }),
    ),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your session has expired. Please sign in again."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("sentinel_session")),
  ).toBeNull();
});

test("history clears only after success, and failed clearing can be retried", async ({
  page,
}) => {
  const calls = await mockApi(page, { clearError: true });
  await login(page);
  await page.getByRole("button", { name: "Clear history" }).click();
  await expect(page.getByRole("alert")).toHaveText("We couldn’t complete that request. Please try again.");
  await expect(page.getByText("Nigerian banking sector")).toBeVisible();
  await page.getByRole("button", { name: "Clear history" }).click();
  await expect(
    page.getByText(
      "Your recent searches will appear here. Start with a topic above.",
    ),
  ).toBeVisible();
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(2);
});

test("home search and monitor creation use workspace-scoped API routes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const calls = await mockApi(page);
  await login(page);
  await page.getByRole("button", { name: "Add monitor", exact: true }).click();
  await page
    .getByLabel("Person, organisation, topic or keyword")
    .fill("cybersecurity Nigeria");
  await page.getByLabel("Include keywords").fill("security, data breach");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("News & media")).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create monitor", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /cybersecurity Nigeria topic/ }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) => call.method === "POST" && call.path.endsWith("/monitors"),
    ).body,
  ).toEqual({
    name: "cybersecurity Nigeria",
    query: "cybersecurity Nigeria",
    type: "topic",
    frequency: "20m",
    history_days: 30,
    include_related_terms: true,
    source_ids: ["source-1"],
    include_keywords: ["security", "data breach"],
    exclude_keywords: [],
  });
  await page.getByLabel("Search the public web").fill("MTN & 5G");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: /Verified backend result/ }).click();
  await expect(
    page.getByRole("heading", { name: "Verified backend result" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open source" })).toHaveAttribute(
    "href",
    "https://example.com/story",
  );
  expect(errors).toEqual([]);
});

test("new account with no workspace can create one and sees real empty states", async ({
  page,
}) => {
  const calls = await mockApi(page, { noWorkspace: true, empty: true });
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create your research workspace" }),
  ).toBeVisible();
  await page.getByLabel("Workspace name").fill("My workspace");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page.getByText("No monitored topics yet.")).toBeVisible();
  expect(
    calls.find((call) => call.path === "/workspaces" && call.method === "POST")
      .body.name,
  ).toBe("My workspace");
});

test("partial API failure is visible and does not substitute demo monitors", async ({
  page,
}) => {
  await mockApi(page, { monitorError: true });
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Some workspace data could not be loaded.",
  );
  await expect(
    page.getByRole("button", { name: /MTN Nigeria organisation/ }),
  ).toHaveCount(0);
  await expect(page.getByText("Nigerian banking sector")).toBeVisible();
});

test("authenticated workspace navigation remains usable on mobile", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).not.toBeInViewport();
  expect(calls.some((call) => call.path === "/auth/login")).toBe(true);
});

test("malformed collection responses show an error without crashing the page", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApi(page, { malformed: true });
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Some workspace data could not be loaded.",
  );
  expect(errors).toEqual([]);
});

test("monitor pagination loads the next backend page", async ({ page }) => {
  await mockApi(page, { paginated: true });
  await login(page);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Cybersecurity organisation/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeDisabled();
});

async function goTo(page, name) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: new RegExp(`^${name}(?: \\d+)?$`) })
    .click();
}
async function wizardToSchedule(page, topic = "Test monitor") {
  await page.getByLabel("Person, organisation, topic or keyword").fill(topic);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("monitor wizard preserves steps, retries preferences without duplicate creation", async ({
  page,
}) => {
  const calls = await mockApi(page, { preferenceError: true });
  await login(page);
  await goTo(page, "Monitors");
  await page.getByRole("button", { name: "Add monitor", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await wizardToSchedule(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("News & media")).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create monitor", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Your monitor is ready.",
  );
  await page
    .getByRole("button", { name: "Retry preferences", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.filter(
      (call) => call.path.endsWith("/monitors") && call.method === "POST",
    ),
  ).toHaveLength(1);
  expect(
    calls.filter(
      (call) => call.path.endsWith("/preferences") && call.method === "PATCH",
    ),
  ).toHaveLength(2);
});

test("search filters, sorting and saved views send documented fields", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await login(page);
  await page.getByLabel("Search the public web").fill("MTN Nigeria");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .last()
    .click();
  await page.getByLabel("Sentiment", { exact: true }).selectOption("positive");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByLabel("Sort results").selectOption("latest");
  await page.getByLabel("Source", { exact: true }).selectOption("source-1");
  await page.getByLabel("Date", { exact: true }).selectOption("7");
  await page.getByRole("button", { name: "Save this view" }).click();
  await page.getByLabel("View name").fill("Positive MTN news");
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Search view saved.");
  const saved = calls.find((call) => call.path.endsWith("/saved-searches"));
  expect(saved.body).toMatchObject({
    name: "Positive MTN news",
    query: "MTN Nigeria",
  });
  expect(saved.body.filters).toEqual(
    expect.arrayContaining([
      "sentiment=positive",
      "language=en",
      "source_id=source-1",
      "sort=latest",
    ]),
  );
  await page.getByRole("tab", { name: "Social", exact: true }).click();
  await expect(
    page.getByText(
      "No results match this search. Try another topic or adjust your filters.",
    ),
  ).toBeVisible();
});

test("result and cluster drawers fetch details, close with Escape, and open related results", async ({
  page,
}) => {
  const calls = await mockApi(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await goTo(page, "Intelligence");
  await page
    .getByRole("button", { name: /Story cluster.*Network performance/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Network performance", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "5G", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Verified summary from the backend.", { exact: true }),
  ).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Emerging", exact: true }).click();
  await page
    .getByRole("button", { name: /Story cluster.*Network performance/ })
    .click();
  await page.getByRole("button", { name: "View related results" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Verified backend result/ }),
  ).toBeVisible();
  expect(
    calls.some((call) => call.path.endsWith("/intelligence/emerging")),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("alerts mark read through the API and notification frequency can be changed", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await login(page);
  await goTo(page, "Alerts");
  await expect(
    page.getByRole("button", { name: /Network outage is trending/ }),
  ).toBeVisible();
  await page.getByLabel("Notification digest frequency").selectOption("daily");
  await expect(page.getByText("Notification digest · daily")).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(
    page.getByText("You’re all caught up. New alerts will appear here."),
  ).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.path.endsWith("/alerts/read-all") && call.method === "POST",
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "All", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Network outage is trending/ }),
  ).toBeVisible();
});

test("settings save server-supported defaults, sources and notifications", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await login(page);
  await goTo(page, "Settings");
  await page.getByRole("button", { name: /Monitoring defaults/ }).click();
  await page.getByText("Advanced monitoring settings", { exact: true }).click();
  await page.getByLabel("Default monitoring frequency").selectOption("10m");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Changes saved." }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) =>
        call.path.endsWith("/settings/monitoring-defaults") &&
        call.method === "PATCH",
    ).body,
  ).toEqual({ frequency: "10m" });
  await page
    .getByRole("navigation", { name: "Settings sections" })
    .getByRole("button", { name: /Notifications/ })
    .click();
  await expect(page.getByRole("switch", { name: "High-velocity topic alerts", exact: true })).toBeChecked();
  await page
    .getByRole("switch", { name: "High-velocity topic alerts", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Changes saved." }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) =>
        call.path.endsWith("/settings/notifications") &&
        call.method === "PATCH",
    ).body,
  ).toEqual({ notify_velocity: false });
  await page.getByRole("button", { name: /Sources & languages/ }).click();
  await page.getByText("Individual sources", { exact: true }).click();
  await expect(page.getByRole("switch", { name: "Public news", exact: true })).toBeChecked();
  await page
    .getByRole("switch", { name: "Public news", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  expect(
    calls.find(
      (call) =>
        call.path.endsWith("/settings/sources") && call.method === "PATCH",
    ).body,
  ).toEqual({ sources: [{ source_id: "source-1", enabled: false }] });
});

test("discovery preferences persist locally and affect search presentation", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);
  await goTo(page, "Settings");
  await page.getByRole("switch", { name: "Detect discussion tone" }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Preferences saved on this device.",
  );
  await goTo(page, "Home");
  await page.getByLabel("Search the public web").fill("MTN");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .last()
    .click();
  await expect(page.locator(".result-content")).toBeVisible();
  await expect(page.locator(".result-content .sentiment")).toHaveCount(0);
  await page.reload();
  await goTo(page, "Settings");
  await expect(
    page.getByRole("switch", { name: "Detect discussion tone" }),
  ).not.toBeChecked();
});

test("analytics loads dedicated workspace endpoints and refreshes without searching mentions", async ({ page }) => {
  const calls = await mockApi(page);
  await login(page);
  await goTo(page, "Analytics");
  for (const endpoint of ["overview", "volume", "sentiment", "sources", "keywords", "discovery-time"]) {
    await expect.poll(() => calls.filter((call) => call.path.endsWith(`/analytics/${endpoint}`)).length).toBeGreaterThan(0);
  }
  await expect(page.getByRole("region", {name:"Mention volume"})).toContainText('12,482');
  await expect(page.getByRole("region", {name:"Mention volume"}).getByRole("img")).toBeVisible();
  expect(calls.some((call) => call.path.endsWith('/search') || call.path.endsWith('/explore'))).toBe(false);
  const before = calls.filter((call) => call.path.includes('/analytics/')).length;
  await page.getByRole('button', {name:'Refresh analytics'}).click();
  await expect.poll(() => calls.filter((call) => call.path.includes('/analytics/')).length).toBeGreaterThanOrEqual(before + 6);
});

test("all updated screens work on mobile with reduced motion and without runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await login(page);
  for (const name of [
    "Search",
    "Monitors",
    "Intelligence",
    "Analytics",
    "Alerts",
    "Settings",
  ]) {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await goTo(page, name);
    await expect(
      page.getByRole("heading", {
        name: name === "Search" ? "Search the public web" : name,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("failed settings writes report the error without a success message", async ({
  page,
}) => {
  await mockApi(page, { settingsError: true });
  await login(page);
  await goTo(page, "Settings");
  await page.getByRole("button", { name: /Monitoring defaults/ }).click();
  await page.getByText("Advanced monitoring settings", { exact: true }).click();
  await page.getByLabel("Default monitoring frequency").selectOption("10m");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "We couldn’t complete that request. Please try again.",
  );
  await expect(page.getByText("Changes saved.", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Default monitoring frequency")).toHaveValue(
    "10m",
  );
});

test("wizard cannot create a monitor when no sources are available", async ({
  page,
}) => {
  const calls = await mockApi(page, { sourceError: true });
  await login(page);
  await page.getByRole("button", { name: "Add monitor", exact: true }).click();
  await page.getByLabel("Person, organisation, topic or keyword").fill("MTN");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("News & media")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.filter(
      (call) => call.path.endsWith("/monitors") && call.method === "POST",
    ),
  ).toHaveLength(0);
});


test("search encodes story grouping as API-compatible booleans, including after refresh", async ({ page }) => {
  const calls = await mockApi(page);
  await login(page);
  await page.goto("/search?q=MTN");
  await expect(page.locator(".result-content")).toBeVisible();
  const latestCollapse = () => new URL(calls.filter((call) => call.path.endsWith("/search")).at(-1).url).searchParams.get("collapse");
  expect(latestCollapse()).toBe("1");

  await goTo(page, "Settings");
  await page.getByRole("switch", { name: "Group similar stories automatically" }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Preferences saved on this device.");
  await page.goto("/search?q=MTN");
  await expect(page.locator(".result-content")).toBeVisible();
  expect(latestCollapse()).toBe("0");
  await page.reload();
  await expect(page.locator(".result-content")).toBeVisible();
  expect(latestCollapse()).toBe("0");
  await expect(page.getByText("The collapse field must be true or false.")).toHaveCount(0);
});


test("Latest and Most Mentioned retry their shared failed endpoint and recover without demo data", async ({ page }) => {
  await mockApi(page);
  let attempts = 0;
  let failing = true;
  await page.route("**/api/v1/workspaces/w-1/explore?*", async (route) => {
    attempts++;
    await route.fulfill({
      status: failing ? 500 : 200,
      contentType: "application/json",
      body: JSON.stringify(failing ? { message: "Server Error" } : {
        data: [
          { id: "cluster-low", title: "Less mentioned", mention_count: 2 },
          { id: "cluster-high", title: "Most mentioned live story", mention_count: 80 },
        ], meta: { last_page: 1 },
      }),
    });
  });
  await login(page);
  await goTo(page, "Intelligence");
  await expect(page.locator(".cluster-panel").getByRole("alert")).toContainText("We couldn’t complete that request. Please try again.");
  await expect(page.locator(".cluster-row")).toHaveCount(0);
  const initialAttempts = attempts;
  await page.getByRole("tab", { name: "Most Mentioned", exact: true }).click();
  await expect.poll(() => attempts).toBeGreaterThan(initialAttempts);
  await expect(page.locator(".cluster-panel").getByRole("alert")).toBeVisible();
  failing = false;
  await page.locator(".cluster-panel").getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".cluster-row")).toHaveCount(2);
  await expect(page.locator(".cluster-row").first()).toContainText("Most mentioned live story");
  await expect(page.locator(".cluster-panel").getByRole("alert")).toHaveCount(0);
  await page.getByRole("tab", { name: "Latest", exact: true }).click();
  await expect(page.locator(".cluster-row").first()).toContainText("Less mentioned");
});

test("discovery errors do not prevent independent Trending and Emerging tabs from loading", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/v1/workspaces/w-1/explore?*", (route) => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ message: "Server Error" }),
  }));
  await login(page);
  await goTo(page, "Intelligence");
  await expect(page.locator(".cluster-panel").getByRole("alert")).toContainText("We couldn’t complete that request. Please try again.");
  for (const name of ["Trending", "Emerging"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.locator(".cluster-row")).toHaveCount(1);
    await expect(page.locator(".cluster-panel").getByRole("alert")).toHaveCount(0);
  }
});

test("invalid sign-in email is rejected before any authentication request", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/signin');
  // Bypass native HTML constraints to exercise the application validation too.
  await page.locator('form').evaluate((form) => { form.noValidate = true; });
  await page.getByLabel('Work email').fill("admin' OR 1=1 --");
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a valid email address.');
  expect(calls.some((call) => call.path === '/auth/login')).toBe(false);
});

test("sign-in preserves password punctuation and supports plus-address emails", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/signin');
  const password = "a'quoted;password--!$";
  await page.getByLabel('Work email').fill('ada+research@example.com');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Discover what’s happening online.' })).toBeVisible();
  const loginCall = calls.find((call) => call.path === '/auth/login');
  expect(loginCall.body.email).toBe('ada+research@example.com');
  expect(loginCall.body.password).toBe(password);
});

test("screenshot settings controls send supported monitoring, digest and source fields", async ({ page }) => {
  const calls = await mockApi(page);
  await login(page);
  await goTo(page, "Settings");
  await page.getByRole("button", { name: /Monitoring defaults/ }).click();
  await expect(page.getByRole("switch", { name: "Scan every 20 minutes" })).toBeChecked();
  await page.getByRole("switch", { name: "Scan every 20 minutes" }).uncheck();
  await page.getByRole("switch", { name: "Include historical matches" }).uncheck();
  await expect(page.getByRole("switch", { name: "Discover emerging topics" })).toBeDisabled();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toHaveText("Changes saved.");
  expect(calls.find((c) => c.path.endsWith('/settings/monitoring-defaults') && c.method === 'PATCH').body).toEqual({ frequency: '30m', history_days: 1 });
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: /Notifications/ }).click();
  await expect(page.getByRole("switch", { name: "New result digest" })).toBeChecked();
  await page.getByRole("switch", { name: "New result digest" }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toHaveText("Changes saved.");
  expect(calls.find((c) => c.path.endsWith('/settings/notifications') && c.method === 'PATCH').body).toEqual({ digest_cadence: 'daily' });
  await page.getByRole("button", { name: /Sources & languages/ }).click();
  await expect(page.getByRole("switch", { name: "News and media" })).toBeChecked();
  await page.getByRole("switch", { name: "News and media" }).uncheck();
  await page.getByRole("switch", { name: "French-language results" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toHaveText("Changes saved.");
  expect(calls.find((c) => c.path.endsWith('/settings/sources') && c.method === 'PATCH').body).toEqual({ sources: [{source_id:'source-1',enabled:false,language_codes:['en','fr']}] });
});

test("account presentation preferences persist and change history and search density", async ({ page }) => {
  await mockApi(page);
  await login(page);
  await goTo(page, "Settings");
  await page.getByRole("button", { name: /^Account/ }).click();
  await expect(page.getByRole("switch", { name: "Weekly research summary" })).toBeDisabled();
  await expect(page.getByRole("switch", { name: "Product research participation" })).toBeDisabled();
  await page.getByRole("switch", { name: "Personal search history" }).uncheck();
  await page.getByRole("switch", { name: "Compact result density" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Changes saved." })).toHaveText("Changes saved.");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Personal search history" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Compact result density" })).toBeChecked();
  await goTo(page,"Home");
  await expect(page.getByText("Nigerian banking sector")).toHaveCount(0);
  await page.goto('/search?q=MTN');
  await expect(page.locator('.search-page')).toHaveClass(/compact-results/);
});

test("published UI hides raw service errors while preserving recovery guidance", async ({ page }) => {
  await mockApi(page);
  let status = 500;
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'SQLSTATE connection failed at /srv/private/config.php:42', errors: { internal: ['database password secret'] } }),
  }));
  await page.goto('/signin');
  await page.getByLabel('Work email').fill('ada@example.com');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  for (const [code, message] of [
    [500, 'We couldn’t complete that request. Please try again.'],
    [429, 'Please wait a moment before trying again.'],
    [403, 'You don’t have access to this action.'],
    [422, 'Check your email and password, then try again.'],
  ]) {
    status = code;
    await page.getByRole('button', { name:'Sign in', exact:true }).click();
    await expect(page.getByRole('alert')).toHaveText(message);
    await expect(page.locator('body')).not.toContainText('SQLSTATE');
    await expect(page.locator('body')).not.toContainText('/srv/private');
    await expect(page.locator('body')).not.toContainText('database password');
  }
});

test("data loaders animate accessibly, respect reduced motion, and disappear when results arrive", async ({ page }) => {
  await mockApi(page);
  await login(page);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/v1/workspaces/w-1/search?*', async (route) => {
    await gate;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:[]})});
  });
  try {
    await page.goto('/search?q=MTN');
    const loader = page.getByRole('region', { name: 'Search results' }).locator('.sentinel-loading');
    await expect(loader).toBeVisible();
    await expect(loader).toHaveAttribute('role','status');
    await expect(loader).toHaveAttribute('aria-live','polite');
    await expect(loader.locator('.sentinel-loading-mark')).toHaveAttribute('aria-hidden','true');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(() => loader.locator('.sentinel-loading-mark > span').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('sentinel-breathe');
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(() => loader.locator('.sentinel-loading-mark > span').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(loader).toBeVisible();
  } finally { release(); }
  await expect(page.getByRole('region', { name: 'Search results' }).locator('.sentinel-loading')).toHaveCount(0);
  await expect(page.getByText('No results match this search. Try another topic or adjust your filters.')).toBeVisible();
});

test("analytics uses verified period totals, preserves missing values and isolates failed panels",async({page})=>{
  await mockApi(page);
  let failing=true;
  await page.route('**/api/v1/workspaces/w-1/analytics/**',(route)=>{
    const url=new URL(route.request().url());
    const endpoint=url.pathname.split('/').at(-1);
    const meta={from:url.searchParams.get('from'),to:url.searchParams.get('to')};
    const bodies={overview:{total_mentions:98765,source_count:null},volume:{data:[]},sentiment:{positive:0,neutral:0,negative:0},keywords:{data:[]},'discovery-time':{average_minutes:null}};
    return route.fulfill({status:endpoint==='sources'&&failing?503:200,contentType:'application/json',body:JSON.stringify(endpoint==='sources' ? failing ? {message:'Internal database failure'} : {data:[{name:'News',count:10}],meta} : {...bodies[endpoint],meta})});
  });
  await login(page);await goTo(page,'Analytics');
  const volume=page.getByRole('region',{name:'Mention volume'});
  await expect(volume).toContainText('98,765');
  await expect(volume.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Discussion tone'})).toContainText('No tone data');
  const sources=page.getByRole('region',{name:'Source distribution'});
  await expect(sources.getByRole('alert')).toBeVisible();
  await expect(sources).not.toContainText('Internal database failure');
  failing=false;await sources.getByRole('button',{name:'Try again'}).click();
  await expect(sources.getByRole('alert')).toHaveCount(0);await expect(sources).toContainText('10 mentions');
  await expect(volume).toContainText('98,765');
});

test("analytics restores Recharts layout, changes range consistently and never labels unverified totals as period data",async({page})=>{
  const calls=await mockApi(page);await login(page);await goTo(page,'Analytics');
  await expect(page.getByRole('tab',{name:'30 days',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await page.getByRole('tab',{name:'7 days',exact:true}).click();
  await expect(page.getByRole('region',{name:'Mention volume'}).getByRole('img')).toHaveAttribute('aria-label',/7 days/);
  const last=calls.filter((call)=>call.path.endsWith('/analytics/overview')).at(-1);
  const query=new URL(last.url).searchParams;
  expect(Date.parse(query.get('to'))-Date.parse(query.get('from'))).toBe(7*86400000);
  await page.route('**/api/v1/workspaces/w-1/analytics/overview?*',(route)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({total_mentions:999999,source_count:900})}));
  await page.getByRole('button',{name:'Refresh analytics'}).click();
  await expect(page.getByText(/The service hasn’t confirmed this reporting period/)).toBeVisible();
  await expect(page.getByRole('region',{name:'Mention volume'})).not.toContainText('999,999');
});

test("digest alerts open a summary and included articles without navigating to search",async({page})=>{
  const calls=await mockApi(page,{digestAlert:true});await login(page);await goTo(page,'Alerts');
  await page.getByRole('button',{name:/20m digest/}).click();
  const dialog=page.getByRole('dialog',{name:'20m digest'});await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Two new infrastructure reports were discovered.');
  await expect(dialog.getByRole('heading',{name:'Digest article one'})).toBeVisible();
  await expect(dialog.getByRole('heading',{name:'Digest article two'})).toBeVisible();
  await expect(dialog.getByRole('link',{name:'Open source'})).toHaveAttribute('href','https://example.com/first');
  await expect(dialog.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/alerts$/);
  expect(calls.some((call)=>call.path.endsWith('/digests'))).toBe(true);
  expect(calls.some((call)=>call.path.endsWith('/search'))).toBe(false);
  await dialog.getByRole('button',{name:'Open result',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('heading',{name:'Verified backend result',exact:true})).toBeVisible();
});

test("older and count-only digests remain useful without fabricated summaries",async({page})=>{
  await mockApi(page,{digestAlert:true,olderDigest:true,emptyDigest:true});await login(page);await goTo(page,'Alerts');
  await page.getByRole('button',{name:/20m digest/}).click();
  const dialog=page.getByRole('dialog',{name:'20m digest'});
  await dialog.getByRole('button',{name:'Load older digests'}).click();
  await expect(dialog).toContainText('new mentions');
  await expect(dialog).toContainText('A written summary wasn’t included');
  await expect(dialog).toContainText('did not include article details');
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/alerts$/);
});

test('digest loading failures keep the alert readable and never show a different alert’s digest',async({page})=>{
  await mockApi(page,{digestAlert:true});
  let fail=true;
  await page.route('**/api/v1/workspaces/w-1/digests',(route)=>route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{message:'SQL private details'}:{data:[{id:'other-digest',alert_id:'another-alert',mention_count:500,payload:[{summary:'Unrelated summary'}]}]})}));
  await login(page);await goTo(page,'Alerts');await page.getByRole('button',{name:/20m digest/}).click();
  const dialog=page.getByRole('dialog',{name:'20m digest'});
  await expect(dialog).toContainText('2 new mentions in this window.');
  await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog).not.toContainText('SQL private details');
  fail=false;await dialog.getByRole('button',{name:'Try again'}).click();
  await expect(dialog).toContainText('The full digest wasn’t included on this page.');
  await expect(dialog).not.toContainText('Unrelated summary');await expect(page).toHaveURL(/\/alerts$/);
});
