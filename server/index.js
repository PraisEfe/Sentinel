import { createApp } from "./app.js";
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw Error("PORT must be an integer between 0 and 65535.");
const app = createApp();
const server = app.listen(port, host, () =>
  console.log(`Sentinel server listening on port ${server.address().port}`),
);
function stop() {
  server.close(() => {
    app.locals.proxyAgent?.destroy();
    process.exit(0);
  });
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
