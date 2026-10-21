import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const spec = JSON.parse(
  readFileSync(new URL("../docs/openapi.json", import.meta.url), "utf8"),
);
const user = { id: "u-1", name: "Ada Okafor", email: "ada@example.com" };
const workspace = { id: "w-1", name: "Research workspace" };
const monitor = {
  id: "m-1",
  name: "MTN Nigeria",
  query: "MTN Nigeria",
  type: "organisation",
  is_active: true,
  last_scan_at: new Date().toISOString(),
};
const history = [
  {
    id: "s-1",
    query: "Nigerian banking sector",
    result_count: 1082,
    created_at: new Date().toISOString(),
  },
];

async function mockApi(page, options = {}) {
  const calls = [];
  let monitors = options.empty ? [] : [monitor];
  let searches = options.empty ? [] : [...history];
  let workspaces = options.noWorkspace ? [] : [workspace];
  let historyDeletes = 0;
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace("/api/v1", "");
    const method = req.method();
    let body;
    try {
      body = req.postDataJSON();
    } catch {
      body = undefined;
    }
    calls.push({ path, method, body, headers: req.headers() });
    const fulfill = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    // Assert that every request maps to the supplied OpenAPI contract.
    const template = path
      .replace(/\/workspaces\/w-[12]/, "/workspaces/{workspace}")
      .replace(/\/monitors\/m-\d+/, "/monitors/{monitor}");
    expect(
      spec.paths[template]?.[method.toLowerCase()],
      `${method} ${path} must exist in OpenAPI`,
    ).toBeTruthy();
    const requestSchema =
      spec.paths[template]?.[method.toLowerCase()]?.requestBody?.content?.[
        "application/json"
      ]?.schema?.$ref;
    if (requestSchema) {
      const schema = spec.components.schemas[requestSchema.split("/").at(-1)];
      for (const field of schema.required || [])
        expect(body).toHaveProperty(field);
    }
    if (
      !["/auth/login", "/auth/register", "/auth/forgot-password"].includes(path)
    )
      expect(req.headers().authorization).toBe("Bearer test-session-token");
    if (options.offline && path === "/auth/login") return route.abort("failed");
    if (options.loginError && path === "/auth/login")
      return fulfill(
        {
          message: "Validation failed",
          errors: { email: ["These credentials do not match our records."] },
        },
        422,
      );
    if (path === "/auth/login" || path === "/auth/register")
      return fulfill(
        { user, token: "test-session-token" },
        path === "/auth/register" ? 201 : 200,
      );
    if (path === "/auth/forgot-password")
      return fulfill(
        { message: "If that account exists, a reset link will be sent." },
        202,
      );
    if (path === "/auth/logout") return route.fulfill({ status: 204 });
    if (path === "/auth/me")
      return options.expired
        ? fulfill({ message: "Unauthenticated." }, 401)
        : fulfill({ user, memberships: [] });
    if (path === "/workspaces" && method === "GET")
      return fulfill({ data: workspaces });
    if (path === "/workspaces" && method === "POST") {
      workspaces = [{ ...workspace, name: body.name }];
      return fulfill({ data: workspaces[0] }, 201);
    }
    if (path.endsWith("/monitors") && method === "POST") {
      monitors = [...monitors, { ...monitor, ...body, id: "m-2" }];
      return fulfill({ data: monitors.at(-1) }, 201);
    }
    if (path.endsWith("/monitors") && options.malformed)
      return fulfill({ data: {} });
    if (path.endsWith("/monitors") && options.paginated) {
      const pageNumber = Number(
        new URL(req.url()).searchParams.get("page") || 1,
      );
      return fulfill({
        data: [
          {
            ...monitor,
            name: pageNumber === 1 ? "MTN Nigeria" : "Cybersecurity",
          },
        ],
        meta: { total: 2, current_page: pageNumber, last_page: 2 },
      });
    }
    if (path.endsWith("/monitors"))
      return options.monitorError
        ? fulfill({ message: "Unavailable" }, 503)
        : fulfill({ data: monitors, meta: { total: monitors.length } });
    if (path.endsWith("/stats"))
      return fulfill({
        data: {
          mention_count: 4821,
          source_count: 46,
          last_scan_at: monitor.last_scan_at,
        },
      });
    if (path.endsWith("/history/searches") && method === "DELETE") {
      historyDeletes++;
      if (options.clearError && historyDeletes === 1)
        return fulfill({ message: "Could not clear history." }, 503);
      searches = [];
      return fulfill({ message: "Search history cleared." });
    }
    if (path.endsWith("/history/searches")) return fulfill({ data: searches });
    if (path.endsWith("/sources"))
      return fulfill({
        data: [{ source: { id: "source-1" }, available: true }],
      });
    if (path.endsWith("/alerts/counts"))
      return fulfill({ unread: 3, critical: 0, high: 0, normal: 3 });
    if (path.endsWith("/search"))
      return fulfill({
        data: [
          {
            id: "mention-1",
            title: "Verified backend result",
            body: "Infrastructure investment announced.",
            url: "https://example.com/story",
            published_at: new Date().toISOString(),
            source: { name: "Public news" },
          },
        ],
      });
    return fulfill({ message: `Unhandled ${method} ${path}` }, 500);
  });
  return calls;
}
async function login(page, remember = true) {
  await page.goto("/signin");
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  if (!remember) await page.getByLabel("Keep me signed in").uncheck();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Discover what’s happening online." }),
  ).toBeVisible();
  await expect(page.getByText("Loading your workspace…")).toHaveCount(0);
}

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
    "These credentials do not match our records.",
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
  await expect(page.getByRole("alert")).toHaveText("Could not clear history.");
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
  await page.getByLabel("Topic name", { exact: true }).fill("Cybersecurity");
  await page
    .getByLabel("Search query", { exact: true })
    .fill("cybersecurity Nigeria");
  await page.getByLabel("Type", { exact: true }).selectOption("topic");
  await page
    .getByRole("button", { name: "Create monitor", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Cybersecurity topic/ }),
  ).toBeVisible();
  expect(
    calls.find(
      (call) => call.method === "POST" && call.path.endsWith("/monitors"),
    ).body,
  ).toEqual({
    name: "Cybersecurity",
    query: "cybersecurity Nigeria",
    type: "topic",
    frequency: "20m",
  });
  await page.getByLabel("Search the public web").fill("MTN & 5G");
  await page
    .getByRole("button", { name: "Search", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Verified backend result" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Read original" }),
  ).toHaveAttribute("href", "https://example.com/story");
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

test("demo is explicit, makes no API calls and remains usable on mobile", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the demo workspace" })
    .click();
  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
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
  expect(calls).toHaveLength(0);
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
