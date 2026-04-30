import { KcscClient, type KcscClientOptions } from "../api/kcsc-client.js";
import { loadConfig } from "../config.js";
import { StandardsService } from "./standards.js";

export interface StandardsServiceFactoryOptions {
  readonly clientOptions?: Omit<KcscClientOptions, "apiKey">;
}

export function createStandardsService(options: StandardsServiceFactoryOptions = {}): StandardsService {
  const config = loadConfig();
  return new StandardsService(new KcscClient({ apiKey: config.kcscApiKey, ...options.clientOptions }));
}

export function createKcscClient(options: StandardsServiceFactoryOptions = {}): KcscClient {
  const config = loadConfig();
  return new KcscClient({ apiKey: config.kcscApiKey, ...options.clientOptions });
}
