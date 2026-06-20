/**
 * Part C smoke: confirm the agent emits valid GenerativeBlocks.
 *
 * Runs the SLEEP cron prompt for user 1 with a BlockCollector; the agent should
 * pull real sleep data and emit a sleep_insight (+ likely a hypnogram). We then
 * print the collected blocks and re-validate them against the schema.
 */

try {
  process.loadEnvFile();
} catch {
  /* rely on real env */
}

import { loadConfig } from "../src/config.js";
import { buildSession } from "../src/pi/agent.js";
import { loadPrompt } from "../src/prompts/load.js";
import { BlockCollector } from "../src/tools/genui.js";
import { GenerativeBlock } from "../src/tools/blocks.js";

const USER_ID = Number(process.argv[2] ?? 1);

async function main() {
  const cfg = loadConfig();
  const collector = new BlockCollector();
  const session = await buildSession(cfg, {
    systemPrompt: loadPrompt("sleep"),
    cwd: process.cwd(),
    blockCollector: collector,
  });

  const tools: string[] = [];
  session.subscribe((e: any) => {
    if (e.type === "tool_execution_start") {
      tools.push(e.toolName);
      process.stderr.write(`[tool] ${e.toolName}\n`);
    }
  });

  await session.prompt(
    `Generate the per-sleep insight for user_id ${USER_ID}, for last night's main sleep. Use real data.`,
  );

  console.log("\n=== tools called:", tools.join(", "));
  console.log(`=== blocks emitted: ${collector.blocks.length}`);
  let allValid = true;
  for (const [i, b] of collector.blocks.entries()) {
    const res = GenerativeBlock.safeParse(b);
    const status = res.success ? "OK" : "INVALID";
    if (!res.success) allValid = false;
    console.log(`  [${i}] ${b.kind} — ${status}`);
    console.log(JSON.stringify(b).slice(0, 240));
  }
  console.log(`\n=== all blocks valid: ${allValid}`);
  session.dispose();
  process.exit(collector.blocks.length > 0 && allValid ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke_blocks failed:", err);
  process.exit(1);
});
