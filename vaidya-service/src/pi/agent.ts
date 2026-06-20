/**
 * Builds Pi agent sessions for Vaidya.
 *
 * One place that wires: the resolved model (Opus 4.8 via OAuth), a per-session
 * system prompt, the MCP tools (via the pi-mcp-adapter extension, which reads
 * <cwd>/.mcp.json), and the vaidya-health-schema skill (auto-discovered from
 * <cwd>/.pi/skills). Sessions are in-memory by default; cron/chat callers pass a
 * persisted SessionManager so the session id can be replayed later.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import type { Config } from "../config.js";
import { buildProvider, type Provider } from "./provider.js";

// The pi-mcp-adapter extension entry (installed via `pi install npm:pi-mcp-adapter`).
// Its package.json declares pi.extensions = ["./index.ts"]. We load it explicitly
// so its session_start lifecycle (which connects to our MCP server) actually runs
// in a headless SDK session — auto-discovery via the "packages" setting alone
// registered the tool but not the lifecycle.
const MCP_ADAPTER_ENTRY = join(
  homedir(),
  ".pi/agent/npm/node_modules/pi-mcp-adapter/index.ts",
);

// Everything Pi needs lives under vaidya-service/.pi (skills, mcp config, and —
// in Docker — the extension), so the whole dir is one mountable unit. The
// adapter auto-discovers .pi/mcp.json from cwd; we point the skill loader at
// .pi/skills explicitly.
const LOCAL_SKILLS_DIR = join(process.cwd(), ".pi", "skills");

export interface BuildSessionOpts {
  systemPrompt: string;
  /** Working dir for the session — must be the vaidya-service dir so the MCP
   *  adapter finds .mcp.json and skills are discovered from .pi/skills. */
  cwd?: string;
  /** Persist the session (so it can be reopened by id). Defaults to in-memory. */
  sessionManager?: ReturnType<typeof SessionManager.inMemory>;
}

let cachedProvider: Provider | null = null;

async function provider(cfg: Config): Promise<Provider> {
  if (!cachedProvider) cachedProvider = await buildProvider(cfg);
  return cachedProvider;
}

export async function buildSession(cfg: Config, opts: BuildSessionOpts) {
  const p = await provider(cfg);
  const cwd = opts.cwd ?? process.cwd();

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir: getAgentDir(),
    systemPromptOverride: () => opts.systemPrompt,
    // Don't append a stray APPEND_SYSTEM.md from the global agent dir.
    appendSystemPromptOverride: () => [],
    // Load the MCP adapter extension explicitly (full lifecycle).
    additionalExtensionPaths: [MCP_ADAPTER_ENTRY],
    // Discover the vaidya-health-schema skill from the service's own .pi/skills.
    additionalSkillPaths: [LOCAL_SKILLS_DIR],
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd,
    model: p.model,
    thinkingLevel: "medium",
    authStorage: p.authStorage,
    modelRegistry: p.modelRegistry,
    resourceLoader,
    // Reads ~/.pi/agent/settings.json — needed so the pi-mcp-adapter package
    // (listed under "packages") loads its full lifecycle, incl. the
    // session_start handler that connects to our MCP server. Without this the
    // adapter's `mcp` tool registers but never initializes ("not initialized").
    settingsManager: SettingsManager.create(cwd),
    // Restrict built-in tools to what the coach needs: `read` (to load the
    // schema skill / reference files) and `mcp` (the pi-mcp-adapter proxy that
    // exposes our vaidya-mcp tools — get_sleep, query_health_db, log_*). No
    // bash/write/edit, so the coach can't shell out or mutate the filesystem.
    tools: ["read", "mcp"],
    sessionManager: opts.sessionManager ?? SessionManager.inMemory(cwd),
  });

  // createAgentSession registers extensions but does NOT bind their session
  // lifecycle — `session_start` only fires after bindExtensions(). The
  // pi-mcp-adapter connects to our MCP server in its session_start handler, so
  // without this the MCP tools report "not initialized". (The interactive Pi
  // runtime calls this for us; headless we must do it ourselves.)
  await session.bindExtensions({});

  // The MCP server (eager) connects during session_start; give it a moment so
  // the first prompt sees the tools as live.
  await new Promise((r) => setTimeout(r, 2500));

  return session;
}
