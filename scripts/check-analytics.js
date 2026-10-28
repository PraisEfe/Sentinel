import { createServer } from "node:http";
import { createApp } from "../server/app.js";

const token = process.env.SENTINEL_TEST_TOKEN;
const app = createApp();
const server = createServer(app);
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const headers = { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
async function probe(path, options = {}) {
  const start = Date.now();
  try {
    const response = await fetch(`${origin}/api/v1${path}`, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(25000) });
    const body = await response.json().catch(() => null);
    return { status: response.status, milliseconds: Date.now() - start, body };
  } catch (error) {
    return { status: 0, milliseconds: Date.now() - start, failure: error.name };
  }
}
function report(name, result) {
  // Never log tokens, account records, workspace IDs, SQL errors or raw bodies.
  const keys = result.body && typeof result.body === "object" && !Array.isArray(result.body) ? Object.keys(result.body) : [];
  console.log(JSON.stringify({ check: name, status: result.status, milliseconds: result.milliseconds, keys, ...(result.failure ? { failure: result.failure } : {}) }));
}
try {
  const account = await probe("/auth/me");
  report("account", account);
  const workspaces = await probe("/workspaces");
  report("workspaces", workspaces);
  if (!token || account.status !== 200 || workspaces.status !== 200) {
    if (!token) {
      const validation = await probe("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      report("empty-login-validation", validation);
    }
    console.log("BLOCKED: authenticated analytics comparison needs a valid SENTINEL_TEST_TOKEN supplied through a local ignored .env or environment secret. Do not paste tokens into chat.");
    process.exitCode = 2;
  } else {
    const list = workspaces.body?.data;
    const selected = process.env.SENTINEL_TEST_WORKSPACE_ID || (Array.isArray(list) ? list[0]?.id : null);
    if (!selected || !Array.isArray(list) || !list.some((item) => item.id === selected)) {
      console.log("BLOCKED: select an authorized workspace using SENTINEL_TEST_WORKSPACE_ID.");
      process.exitCode = 2;
    } else {
      const to = new Date();
      const from = new Date(to.getTime() - 90 * 86400000);
      const variants = process.argv.includes("--supported") ? [
        ["30d", "?period=30d"], ["90d", "?period=90d"],
      ] : [
        ["unfiltered", ""],
        ["timestamps", `?${new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })}`],
        ["dates", `?${new URLSearchParams({ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) })}`],
      ];
      for (const endpoint of ["overview", "volume", "sentiment", "sources", "keywords", "discovery-time"]) {
        const statuses = {};
        for (const [variant, query] of variants) {
          const result = await probe(`/workspaces/${encodeURIComponent(selected)}/analytics/${endpoint}${query}`);
          report(`${endpoint}:${variant}`, result);
          statuses[variant] = result.status;
        }
        if (statuses.unfiltered === 200 && statuses.timestamps >= 500)
          console.log(`${endpoint}: timestamp-filtered request fails while unfiltered succeeds; investigate accepted date filters.`);
        else if (Object.values(statuses).every((status) => status >= 500))
          console.log(`${endpoint}: all variants fail on the service; backend exception logs are required.`);
        if (Object.values(statuses).some((status) => status < 200 || status >= 300)) process.exitCode = 1;
      }
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  app.locals.proxyAgent?.destroy();
}
