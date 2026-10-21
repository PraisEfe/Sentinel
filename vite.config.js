import react from "@vitejs/plugin-react";
import { ProxyAgent } from "proxy-agent";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Production permits its hosted frontend origin. Keep local development
  // same-origin without weakening the API's CORS or TLS configuration.
  const proxy = {
    "/api/v1": {
      target: env.API_PROXY_TARGET || "https://sentinel-api.absg-ohos.cloud",
      changeOrigin: true,
      agent: new ProxyAgent(),
      proxyTimeout: 20000,
      secure: true,
    },
  };
  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
