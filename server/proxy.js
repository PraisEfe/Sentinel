import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import { getProxyForUrl } from "proxy-from-env";
export function apiProxyOptions(env = process.env) {
  const target = new URL(
    env.API_PROXY_TARGET || "https://sentinel-api.absg-ohos.cloud/api/v1",
  );
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    !["/", "/api/v1", "/api/v1/"].includes(target.pathname) ||
    target.search ||
    target.hash
  )
    throw new Error(
      "API_PROXY_TARGET must be an HTTP(S) URL with an optional /api/v1 path, without credentials, query, or fragment.",
    );
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname);
  const proxyUrl = local ? "" : getProxyForUrl(target.href);
  const agent = proxyUrl
    ? target.protocol === "https:"
      ? new HttpsProxyAgent(proxyUrl)
      : new HttpProxyAgent(proxyUrl)
    : undefined;
  return {
    // Incoming requests already include /api/v1; forward that path exactly once.
    target: target.origin,
    changeOrigin: true,
    secure: true,
    agent,
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
