import { ProxyAgent } from "proxy-agent";
export function apiProxyOptions(env = process.env) {
  const target = new URL(
    env.API_PROXY_TARGET || "https://sentinel-api.absg-ohos.cloud",
  );
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash
  )
    throw new Error(
      "API_PROXY_TARGET must be an HTTP(S) origin without credentials or a path.",
    );
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname);
  return {
    target: target.origin,
    changeOrigin: true,
    secure: true,
    agent: local ? undefined : new ProxyAgent(),
    proxyTimeout: 20000,
  };
}
export function proxyError(_error, _request, response) {
  if (!response.headersSent) {
    response.writeHead(502, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        message: "Unable to reach the API service. Please try again.",
      }),
    );
  }
}
