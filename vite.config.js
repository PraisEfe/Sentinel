import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { apiProxyOptions, proxyError } from "./server/proxy.js";
export default defineConfig(() => {
  const env = { ...parseEnv(readFileSync(new URL("./.env", import.meta.url), "utf8")), ...process.env };
  const proxy = {
    "/api/v1": {
      ...apiProxyOptions(env),
      configure: (proxy) => proxy.on("error", proxyError),
    },
  };
  return { envDir: false, plugins: [react()], server: { proxy }, preview: { proxy } };
});
