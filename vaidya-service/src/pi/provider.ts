/**
 * Resolves the LLM model + auth for Pi sessions.
 *
 * Auth is Anthropic OAuth (NOT an API key): AuthStorage.create() reads
 * ~/.pi/agent/auth.json, which already holds the host's Pi login. The model
 * (claude-opus-4-8) is built in; ModelRegistry.find() resolves it. To switch to
 * OpenCode Zen later, change VAIDYA_MODEL_* and add the provider to models.json
 * — no code change here beyond that.
 */

import { AuthStorage, ModelRegistry } from "@earendil-works/pi-coding-agent";
import type { Config } from "../config.js";

export interface Provider {
  authStorage: ReturnType<typeof AuthStorage.create>;
  modelRegistry: ReturnType<typeof ModelRegistry.create>;
  model: NonNullable<ReturnType<ReturnType<typeof ModelRegistry.create>["find"]>>;
}

/** Build the auth + model. Throws a clear error if OAuth is missing/expired or
 *  the model can't be resolved, so a headless cron fails loudly (not silently). */
export async function buildProvider(cfg: Config): Promise<Provider> {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const model = modelRegistry.find(cfg.modelProvider, cfg.modelId);
  if (!model) {
    throw new Error(
      `model ${cfg.modelProvider}/${cfg.modelId} not found in the registry`,
    );
  }

  // Confirm the provider is actually authenticated (OAuth present), so we fail
  // at startup with a clear message rather than on the first prompt.
  const available = await modelRegistry.getAvailable();
  const ok = available.some(
    (m) => m.provider === cfg.modelProvider && m.id === cfg.modelId,
  );
  if (!ok) {
    throw new Error(
      `model ${cfg.modelProvider}/${cfg.modelId} is not available — ` +
        `is the Anthropic OAuth login present in ~/.pi/agent/auth.json? ` +
        `Run \`pi\` once to /login, or re-login if the token expired.`,
    );
  }

  return { authStorage, modelRegistry, model };
}
