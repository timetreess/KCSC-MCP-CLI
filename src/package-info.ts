import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface PackageInfo {
  readonly name: string;
  readonly version: string;
}

const PACKAGE_NAME = "kcsc-standards-mcp";

export const packageInfo = readPackageInfo();

function readPackageInfo(): PackageInfo {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let level = 0; level < 4; level += 1) {
    const manifestPath = resolve(directory, "package.json");
    if (existsSync(manifestPath)) {
      const value: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (isRecord(value) && value.name === PACKAGE_NAME && typeof value.version === "string") {
        return { name: value.name, version: value.version };
      }
    }
    directory = dirname(directory);
  }
  throw new Error(`Could not find package metadata for ${PACKAGE_NAME}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
