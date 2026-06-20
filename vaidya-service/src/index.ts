/**
 * Vaidya agent service entrypoint.
 *
 * Part A: config + a Fastify /healthz that confirms the model/OAuth resolves.
 * WebSocket chat, insight endpoints, and crons are layered in later parts.
 */

import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { buildProvider } from "./pi/provider.js";

async function main() {
  const cfg = loadConfig();
  const app = Fastify({ logger: true });

  app.get("/healthz", async () => {
    // Confirm the model + OAuth are resolvable (cheap, no LLM call).
    let model = "unresolved";
    try {
      const p = await buildProvider(cfg);
      model = `${p.model.provider}/${p.model.id}`;
    } catch (err) {
      return { ok: false, error: String(err) };
    }
    return { ok: true, model };
  });

  await app.listen({ port: cfg.port, host: "0.0.0.0" });
  app.log.info(`vaidya-service listening on ${cfg.port}`);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
