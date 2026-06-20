/**
 * Vaidya agent service entrypoint. Wires the DB, Firebase auth, the HTTP pull
 * API, the WebSocket chat, and the insight crons.
 */

// Load .env (Node built-in) before anything reads process.env.
try {
  process.loadEnvFile();
} catch {
  /* no .env — rely on real env */
}

import { loadConfig } from "./config.js";
import { initDb, ensureTables } from "./store/db.js";
import { initFirebase } from "./auth/firebase.js";
import { buildHttpServer } from "./http/server.js";
import { attachChatWs } from "./ws/chat.js";
import { startCrons } from "./cron/index.js";

async function main() {
  const cfg = loadConfig();
  const cwd = process.cwd();

  initDb(cfg.databaseUrl);
  await ensureTables();
  initFirebase(cfg);

  const app = buildHttpServer(cfg, cwd);
  await app.listen({ port: cfg.port, host: "0.0.0.0" });
  app.log.info(`vaidya-service HTTP on ${cfg.port}`);

  // WebSocket chat shares the same HTTP server.
  attachChatWs(app.server, cfg, cwd);

  // Insight cron jobs.
  startCrons(cfg, cwd);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
