import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { apiProxyOptions, proxyError } from "./server/proxy.js";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxy = {
    "/api/v1": {
      ...apiProxyOptions(env),
      configure: (proxy) => proxy.on("error", proxyError),
    },
  };
  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
