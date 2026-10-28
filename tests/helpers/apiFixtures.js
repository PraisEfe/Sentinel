import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const spec = JSON.parse(
  readFileSync(new URL("../../docs/openapi.json", import.meta.url), "utf8"),
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

export async function mockApi(page, options = {}) {
  const calls = [];
  let monitors = options.empty ? [] : [monitor];
  let searches = options.empty ? [] : [...history];
  let workspaces = options.noWorkspace
    ? []
    : options.multipleWorkspaces
      ? [workspace, { id: "w-2", name: "Second workspace" }]
      : [workspace];
  let account = { ...user };
  let historyDeletes = 0;
  let preferenceAttempts = 0;
  let alerts = [
    {
      id: "alert-1",
      title: "Network outage is trending",
      body: "New reports from Lagos.",
      severity: "high",
      read_at: null,
      created_at: new Date().toISOString(),
      mention_id: "mention-1",
    },
  ];
  let defaults = { frequency: "20m", history_days: 30, include_related_terms: true };
  let notification = {
    digest_cadence: "20m",
    digest_hour: 9,
    channels: { email: false, web_push: false, in_app: true },
    alerts: { velocity: true, high_authority: true, high_relevance: true },
    email_available: true,
  };
  const source = {
    id: "source-1",
    name: "Public news",
    type: "news",
    is_active: true,
    enabled_for_workspace: true,
    language_codes: ["en"],
  };
  const mention = {
    id: "mention-1",
    title: "Verified backend result",
    body: "Infrastructure investment announced.",
    url: "https://example.com/story",
    published_at: new Date().toISOString(),
    source_id: source.id,
    source,
    sentiment: "positive",
    country_code: "NG",
    language: "en",
    cluster_id: "cluster-1",
    metadata: [{ topics: ["Network", "5G"] }],
    relevance_score: "0.98",
  };
  const cluster = {
    id: "cluster-1",
    cluster_id: "cluster-1",
    title: "Network performance",
    summary: "Verified summary from the backend.",
    mention_count: 342,
    source_count: 46,
    velocity: 48,
    last_seen_at: new Date().toISOString(),
    representative_mention: mention,
  };
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
    calls.push({ path, url: req.url(), method, body, headers: req.headers() });
    const fulfill = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    // Assert that every request maps to the supplied OpenAPI contract.
    const template = path
      .replace(/\/workspaces\/w-[12]/, "/workspaces/{workspace}")
      .replace(/\/monitors\/m-\d+/, "/monitors/{monitor}")
      .replace(/\/mentions\/mention-\d+/, "/mentions/{mention}")
      .replace(/\/clusters\/cluster-\d+/, "/clusters/{cluster}")
      .replace(/\/alerts\/alert-\d+/, "/alerts/{alert}");
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
    if (path === "/auth/logout")
      return options.logoutOffline
        ? route.abort("failed")
        : route.fulfill({ status: 204 });
    if (path === "/auth/me" && options.profileError)
      return fulfill({ message: "Account service unavailable" }, 503);
    if (path === "/auth/me" && method === "PATCH") {
      account = { ...account, ...body };
      return fulfill({ data: account });
    }
    if (path === "/auth/me")
      return options.expired
        ? fulfill({ message: "Unauthenticated." }, 401)
        : fulfill({ user: account, memberships: [] });
    if (path === "/workspaces" && method === "GET")
      return fulfill({ data: workspaces });
    if (path === "/workspaces" && method === "POST") {
      if (options.createWorkspaceError) return fulfill({ message: "Forbidden" }, 403);
      const created = { ...workspace, id: `w-${workspaces.length + 1}`, name: body.name };
      workspaces = [...workspaces, created];
      return fulfill({ data: created }, 201);
    }
    if (path.endsWith("/preferences")) {
      preferenceAttempts++;
      if (options.preferenceError && preferenceAttempts === 1)
        return fulfill({ message: "Notification service unavailable" }, 503);
      return fulfill({ data: body || {} });
    }
    if (path.includes("/analytics/")) {
      const analytics = {
        overview: { mention_count: 12482, source_count: 328 },
        volume: { data: [{ date: "2026-10-26", count: 100 }, { date: "2026-10-27", count: 200 }] },
        sentiment: { positive: 62, neutral: 28, negative: 10 },
        sources: { data: [{ name: "Public news", count: 500 }] },
        keywords: { data: [{ keyword: "network", count: 80 }] },
        "discovery-time": { average_minutes: 6 },
      };
      return fulfill(analytics[path.split("/").at(-1)]);
    }
    if (path.endsWith("/saved-searches"))
      return fulfill({ data: { id: "saved-1", ...body } }, 201);
    if (path.includes("/mentions/"))
      return fulfill({ data: { ...mention, cluster } });
    if (path.endsWith("/mentions") && path.includes("/clusters/"))
      return fulfill({ data: [mention], meta: { next_cursor: null } });
    if (path.includes("/clusters/")) return fulfill({ data: cluster });
    if (path.endsWith("/explore"))
      return fulfill({ data: [cluster], meta: { last_page: 1 } });
    if (path.includes("/intelligence/")) return fulfill({ data: [cluster] });
    if (path.endsWith("/settings/notifications")) {
      if (method === "PATCH") notification = { ...notification, ...body };
      return fulfill(notification);
    }
    if (
      path.endsWith("/settings/monitoring-defaults") &&
      options.settingsError &&
      method === "PATCH"
    )
      return fulfill({ message: "Settings could not be saved." }, 503);
    if (path.endsWith("/settings/monitoring-defaults")) {
      if (method === "PATCH") defaults = { ...defaults, ...body };
      return fulfill({ data: defaults });
    }
    if (path.endsWith("/settings/sources")) {
      if (method === "PATCH") {
        const update = body.sources.find((item) => item.source_id === source.id);
        if (update) {
          source.enabled_for_workspace = update.enabled;
          if (update.language_codes) source.language_codes = update.language_codes;
        }
      }
      return fulfill({ data: [source] });
    }
    if (path.endsWith("/alerts/read-all")) {
      alerts = alerts.map((item) => ({
        ...item,
        read_at: new Date().toISOString(),
      }));
      return fulfill({ updated: alerts.length });
    }
    if (path.includes("/alerts/alert-")) {
      alerts = alerts.map((item) => ({
        ...item,
        read_at: new Date().toISOString(),
      }));
      return fulfill({ data: alerts[0] });
    }
    if (path.endsWith("/alerts"))
      return fulfill({ data: alerts, meta: { next_cursor: null } });
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
        : fulfill({
            data: path.includes("/w-2/")
              ? monitors.map((item) => ({
                  ...item,
                  name: "Workspace two monitor",
                }))
              : monitors,
            meta: { total: monitors.length },
          });
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
        data: options.sourceError ? [] : [{ source, available: true }],
      });
    if (path.endsWith("/alerts/counts"))
      return fulfill({ unread: 3, critical: 0, high: 0, normal: 3 });
    if (path.endsWith("/search")) {
      const collapse = new URL(req.url()).searchParams.get("collapse");
      if (collapse !== null && !["0", "1"].includes(collapse))
        return fulfill({
          message: "The collapse field must be true or false.",
          errors: { collapse: ["The collapse field must be true or false."] },
        }, 422);
      return fulfill({ data: [mention] });
    }
    return fulfill({ message: `Unhandled ${method} ${path}` }, 500);
  });
  return calls;
}
export async function login(page, remember = true) {
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
