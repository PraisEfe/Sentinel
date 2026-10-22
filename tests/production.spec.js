import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { listen, startProduction, stop } from "./helpers/productionServer.js";
let upstream, production;
const calls = [];
const user = {
  id: "production-user",
  name: "Ada Okafor",
  email: "ada@example.com",
};
const workspace = { id: "production-workspace", name: "Research workspace" };
test.beforeAll(async () => {
  upstream = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const path = new URL(req.url, "http://api.test").pathname;
    calls.push({
      path,
      method: req.method,
      authorization: req.headers.authorization,
      body: text,
    });
    // Deliberately advertise a different origin: same-origin browser requests
    // must still work through the real server proxy, without route interception.
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://sentinel.absg-ohos.cloud",
    );
    res.setHeader("Content-Type", "application/json");
    const json = (status, body) => {
      res.writeHead(status);
      res.end(JSON.stringify(body));
    };
    if (path === "/api/v1/auth/login") {
      const body = JSON.parse(text || "{}");
      if (!body.email || !body.password)
        return json(422, { message: "Email and password are required." });
      return json(200, { user, token: "production-fixture-token" });
    }
    if (req.headers.authorization !== "Bearer production-fixture-token")
      return json(401, { message: "Unauthenticated." });
    if (path === "/api/v1/auth/me") return json(200, { user, memberships: [] });
    if (path === "/api/v1/workspaces") return json(200, { data: [workspace] });
    if (path.endsWith("/alerts/counts"))
      return json(200, { unread: 0, critical: 0, high: 0, normal: 0 });
    if (path.endsWith("/auth/logout")) {
      res.writeHead(204);
      return res.end();
    }
    if (path.endsWith("/search"))
      return json(200, {
        data: [
          {
            id: "network-1",
            title: "Proxied backend result",
            body: "Data passed through the production proxy.",
            source: { id: "news", name: "Public news", type: "news" },
            url: "https://example.com",
            published_at: new Date().toISOString(),
          },
        ],
      });
    return json(200, { data: [], meta: { total: 0, last_page: 1 } });
  });
  const target = await listen(upstream);
  production = await startProduction(target);
});
test.afterAll(async () => {
  await production?.close();
  await stop(upstream);
});

test("production SPA deep links load and unauthenticated API responses pass through", async ({
  page,
}) => {
  await page.goto(`${production.url}/search?q=MTN`);
  await expect(page).toHaveURL(`${production.url}/signin`);
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  const result = await page.evaluate(async () => {
    const r = await fetch("/api/v1/auth/me", {
      headers: { Accept: "application/json" },
    });
    return { status: r.status, body: await r.json() };
  });
  expect(result).toEqual({
    status: 401,
    body: { message: "Unauthenticated." },
  });
});
test("production login, protected search and refresh work through an actual HTTP proxy without CORS errors", async ({
  page,
}) => {
  const corsErrors = [],
    apiOrigins = [];
  page.on("console", (message) => {
    if (/CORS|cross-origin|access.control.allow.origin/i.test(message.text()))
      corsErrors.push(message.text());
  });
  page.on("pageerror", (error) => corsErrors.push(error.message));
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.startsWith("/api/v1/"))
      apiOrigins.push(new URL(req.url()).origin);
  });
  await page.goto(`${production.url}/search?q=MTN`);
  await page.getByLabel("Work email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(`${production.url}/search?q=MTN`);
  await expect(
    page.getByRole("button", { name: /Proxied backend result/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Proxied backend result/ }),
  ).toBeVisible();
  expect(apiOrigins.length).toBeGreaterThan(3);
  expect(new Set(apiOrigins)).toEqual(new Set([production.url]));
  expect(corsErrors).toEqual([]);
  expect(
    calls.some(
      (call) =>
        call.path.endsWith("/search") &&
        call.authorization === "Bearer production-fixture-token",
    ),
  ).toBe(true);
});
test("production JSON validation errors are readable by the browser", async ({
  page,
}) => {
  await page.goto(`${production.url}/signin`);
  const response = await page.evaluate(async () => {
    const r = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    return { status: r.status, body: await r.json() };
  });
  expect(response).toEqual({
    status: 422,
    body: { message: "Email and password are required." },
  });
});
test("production proxy failures return JSON rather than an HTML fallback", async ({
  page,
}) => {
  const unavailable = createServer();
  const target = await listen(unavailable);
  await stop(unavailable);
  const isolated = await startProduction(target);
  try {
    await page.goto(`${isolated.url}/signin`);
    const result = await page.evaluate(async () => {
      const r = await fetch("/api/v1/auth/me");
      return { status: r.status, body: await r.json() };
    });
    expect(result).toEqual({
      status: 502,
      body: { message: "Unable to reach the API service. Please try again." },
    });
  } finally {
    await isolated.close();
  }
});
