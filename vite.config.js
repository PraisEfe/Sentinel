import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { apiProxyOptions, proxyError } from "./server/proxy.js";
export default defineConfig(() => {
  let fileEnv = {};
  try {
    fileEnv = parseEnv(readFileSync(new URL("./.env", import.meta.url), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const env = { ...fileEnv, ...process.env };
  const proxy = {
    "/api/v1": {
      ...apiProxyOptions(env),
      configure: (proxy) => proxy.on("error", proxyError),
    },
  };
  return { envDir: false, plugins: [react()], server: { proxy }, preview: { proxy } };
});
