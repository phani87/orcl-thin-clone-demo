import { createApp } from "./app.js";
import { getConfig } from "./config.js";
import { createRepository } from "./db/repository.js";

const config = getConfig();
const repository = await createRepository(config);
const app = createApp({ repository, config });

const server = app.listen(config.port, () => {
  console.log(`Inventory API listening on ${config.port} (${repository.kind})`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    if (repository.close) await repository.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
