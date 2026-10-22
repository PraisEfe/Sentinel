import { createServer } from "node:http";
import { createApp } from "../../server/app.js";
export async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}
export async function stop(server) {
  if (!server) return;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
export async function startProduction(target) {
  const app = createApp({ env: { API_PROXY_TARGET: target } });
  const server = createServer(app);
  const url = await listen(server);
  return {
    url,
    async close() {
      app.locals.proxyAgent?.destroy();
      await stop(server);
    },
  };
}
