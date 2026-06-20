/** Environment config for the Vaidya service. Fails fast on what's required. */

export interface Config {
  port: number;
  databaseUrl: string;
  modelProvider: string;
  modelId: string;
  firebaseProjectId: string;
  firebaseCredentialsFile: string; // path to the Admin service-account JSON ("" → ADC)
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return {
    port: Number(process.env.PORT ?? 8090),
    databaseUrl,
    modelProvider: process.env.VAIDYA_MODEL_PROVIDER ?? "anthropic",
    modelId: process.env.VAIDYA_MODEL_ID ?? "claude-opus-4-8",
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
    firebaseCredentialsFile: process.env.FIREBASE_CREDENTIALS_FILE ?? "",
  };
}
