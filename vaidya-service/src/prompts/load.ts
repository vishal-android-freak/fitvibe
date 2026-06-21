/** Loads a versioned system-prompt markdown file that sits next to this module
 *  (src/prompts in dev; dist/prompts in the built image — the Docker build copies
 *  the .md files alongside the compiled output since tsc doesn't emit them). */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export type PromptName = "chat" | "today" | "sleep" | "day";

export function loadPrompt(name: PromptName): string {
  return readFileSync(join(here, `${name}.md`), "utf8");
}
