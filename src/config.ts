import { config as loadDotEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  if (env === process.env) {
    loadEnvFiles(env);
  }

  const key = normalizeApiKey(env);
  if (!key) {
    throw new ConfigError("KCSC_API_KEY is required. Set it in your environment or local .env file. Legacy aliases supported: KCSC_OPENAPI_KEY, KCSC_SERVICE_KEY, SERVICE_KEY.");
  }

  return { kcscApiKey: key };
}

function loadEnvFiles(env: NodeJS.ProcessEnv): void {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(process.cwd(), ".env"), resolve(moduleDirectory, "../.env"), resolve(moduleDirectory, "../../.env")];

  for (const path of candidates) {
    loadDotEnv({ path, override: false, processEnv: env, quiet: true });
  }
}

function normalizeApiKey(env: NodeJS.ProcessEnv): string | undefined {
  return env.KCSC_API_KEY?.trim() || env.KCSC_OPENAPI_KEY?.trim() || env.KCSC_SERVICE_KEY?.trim() || env.SERVICE_KEY?.trim() || undefined;
}

export function redactSecret(value: string): string {
  if (value.length <= 4) {
    return "****";
  }
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
