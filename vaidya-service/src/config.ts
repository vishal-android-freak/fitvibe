/** Environment config for the Vaidya service. Fails fast on what's required. */

export interface Config {
  port: number;
  databaseUrl: string;
  modelProvider: string;
  modelId: string;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return {
    port: Number(process.env.PORT ?? 8090),
    databaseUrl,
    modelProvider: process.env.VAIDYA_MODEL_PROVIDER ?? "anthropic",
    modelId: process.env.VAIDYA_MODEL_ID ?? "claude-opus-4-8",
  };
}
