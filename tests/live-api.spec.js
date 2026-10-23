import { test, expect } from "@playwright/test";
import { startProduction } from "./helpers/productionServer.js";
test("live Sentinel API is reachable through the production same-origin proxy without CORS errors", async ({
  page,
}) => {
  test.skip(
    process.env.SENTINEL_LIVE_TESTS !== "1",
    "Opt-in external check; run npm run test:live.",
  );
  const production = await startProduction(
    "https://sentinel-api.absg-ohos.cloud/api/v1",
  );
  const corsErrors = [];
  page.on("console", (message) => {
    if (/CORS|cross-origin|access.control.allow.origin/i.test(message.text()))
      corsErrors.push(message.text());
  });
  try {
    await page.goto(`${production.url}/signin`);
    const results = await page.evaluate(async () => {
      const account = await fetch("/api/v1/auth/me", {
        headers: { Accept: "application/json" },
      });
      const accountBody = await account.json();
      const login = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      return {
        account: { status: account.status, body: accountBody },
        login: { status: login.status, body: await login.json() },
      };
    });
    expect(results.account).toEqual({
      status: 401,
      body: { message: "Unauthenticated." },
    });
    expect(results.login.status).toBe(422);
    expect(results.login.body.errors.email).toBeTruthy();
    expect(results.login.body.errors.password).toBeTruthy();
    expect(corsErrors).toEqual([]);
  } finally {
    await production.close();
  }
});
