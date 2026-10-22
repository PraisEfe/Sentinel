import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProxyMiddleware } from "http-proxy-middleware";
import { apiProxyOptions, proxyError } from "./proxy.js";
const defaultDist = fileURLToPath(new URL("../dist/", import.meta.url));
export function createApp({ env = process.env, dist = defaultDist } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const options = apiProxyOptions(env);
  app.locals.proxyAgent = options.agent;
  // No JSON parser before the proxy: preserve request bodies and bearer headers.
  app.use(
    createProxyMiddleware({
      ...options,
      pathFilter: (pathname) =>
        pathname === "/api/v1" || pathname.startsWith("/api/v1/"),
      on: { error: proxyError },
    }),
  );
  app.use(express.static(dist, { index: false }));
  app.use((request, response) => {
    if (
      request.method === "GET" &&
      request.accepts("html") &&
      !path.extname(request.path)
    )
      return response.sendFile(path.join(dist, "index.html"));
    response.status(404).json({ message: "Not found." });
  });
  return app;
}
