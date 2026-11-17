import { config as loadDotEnv } from "dotenv";
import { existsSync } from "node:fs";
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

const loadedEnvFiles = new Set<string>();

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  loadEnvFile(env);

  const key = normalizeApiKey(env);
  if (!key) {
    throw new ConfigError("KCSC_API_KEY is required. Set it in the process environment or a package .env file selected by KCSC_ENV_FILE. Legacy aliases supported: KCSC_OPENAPI_KEY, KCSC_SERVICE_KEY, SERVICE_KEY.");
  }

  return { kcscApiKey: key };
}

function loadEnvFile(env: NodeJS.ProcessEnv): void {
  const configuredPath = env.KCSC_ENV_FILE?.trim();
  if (env !== process.env && !configuredPath) {
    return;
  }

  const path = configuredPath ? resolve(configuredPath) : resolve(findPackageRoot(), ".env");
  if (env === process.env && loadedEnvFiles.has(path)) {
    return;
  }

  loadDotEnv({ path, override: false, processEnv: env, quiet: true });
  if (env === process.env) {
    loadedEnvFiles.add(path);
  }
}

function findPackageRoot(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let level = 0; level < 3; level += 1) {
    if (existsSync(resolve(directory, "package.json"))) {
      return directory;
    }
    directory = dirname(directory);
  }
  return dirname(fileURLToPath(import.meta.url));
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
