import { config as loadDotEnv } from "dotenv";

export interface AppConfig {
  readonly kcscApiKey: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  loadDotEnv();

  const key = env.KCSC_API_KEY?.trim();
  if (!key) {
    throw new ConfigError("KCSC_API_KEY is required. Set it in your environment or local .env file.");
  }

  return { kcscApiKey: key };
}

export function redactSecret(value: string): string {
  if (value.length <= 4) {
    return "****";
  }
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
