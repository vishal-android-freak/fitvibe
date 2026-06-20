/**
 * Part A smoke test: a headless grounded prompt.
 *
 * Boots a Vaidya session (Opus 4.8 via OAuth) with the MCP tools + schema skill,
 * asks "How did I sleep?", and prints the streamed text + which tools were called.
 * Success = the agent calls an MCP read tool (e.g. get_sleep / query_health_db)
 * and cites real numbers.
 *
 * Run:  npm run smoke   (from vaidya-service/, with vaidya-mcp .env configured)
 */

// Load .env (Node 20.6+ built-in). Tolerate a missing file.
try {
  process.loadEnvFile();
} catch {
  /* no .env — rely on real env */
}

import { loadConfig } from "../src/config.js";
import { buildSession } from "../src/pi/agent.js";
import { loadPrompt } from "../src/prompts/load.js";

const USER_ID = Number(process.argv[2] ?? 1);

async function main() {
  const cfg = loadConfig();
  const session = await buildSession(cfg, {
    systemPrompt: loadPrompt("chat"),
    cwd: process.cwd(), // vaidya-service/ — finds .mcp.json + .pi/skills
  });

  const toolCalls: string[] = [];
  session.subscribe((event: any) => {
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
    if (event.type === "tool_execution_start") {
      toolCalls.push(event.toolName);
      process.stderr.write(`\n[tool] ${event.toolName}\n`);
    }
  });

  try {
    await session.prompt(
      `I am user_id ${USER_ID}. How did I sleep last night? Use my real data.`,
    );
    console.log("\n\n--- tools called:", toolCalls.join(", ") || "(none)");
  } finally {
    session.dispose();
  }
  // The MCP adapter keeps a live connection that holds the event loop open;
  // exit explicitly once the prompt has completed.
  process.exit(0);
}

main().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
