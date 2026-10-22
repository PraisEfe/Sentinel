import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
    ),
    "test",
    "tests/live-api.spec.js",
  ],
  { stdio: "inherit", env: { ...process.env, SENTINEL_LIVE_TESTS: "1" } },
);
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.once("error", () => {
  process.exitCode = 1;
});
