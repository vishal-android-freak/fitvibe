/** Loads a versioned system-prompt markdown file from src/prompts at runtime. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export type PromptName = "chat" | "today" | "sleep" | "day";

export function loadPrompt(name: PromptName): string {
  return readFileSync(join(here, `${name}.md`), "utf8");
}
