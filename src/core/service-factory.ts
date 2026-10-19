import { KcscClient, type KcscClientOptions } from "../api/kcsc-client.js";
import { loadConfig } from "../config.js";
import { StandardsService } from "./standards.js";

export interface StandardsServiceFactoryOptions {
  readonly clientOptions?: Omit<KcscClientOptions, "apiKey">;
}

let defaultClient: KcscClient | undefined;
let defaultClientApiKey: string | undefined;

export function createStandardsService(options: StandardsServiceFactoryOptions = {}): StandardsService {
  return new StandardsService(createKcscClient(options));
}

/**
 * Reuses one default client per process so concurrent callers share its in-flight CodeList request.
 * Explicit `clientOptions` still yield an isolated client, which is what tests and one-off callers expect.
 * A changed API key creates a fresh client rather than retaining a stale credential.
 */
export function createKcscClient(options: StandardsServiceFactoryOptions = {}): KcscClient {
  if (options.clientOptions) {
    return buildKcscClient(options.clientOptions);
  }

  const config = loadConfig();
  if (!defaultClient || defaultClientApiKey !== config.kcscApiKey) {
    defaultClient = new KcscClient({ apiKey: config.kcscApiKey });
    defaultClientApiKey = config.kcscApiKey;
  }
  return defaultClient;
}

function buildKcscClient(clientOptions: Omit<KcscClientOptions, "apiKey"> = {}): KcscClient {
  const config = loadConfig();
  return new KcscClient({ apiKey: config.kcscApiKey, ...clientOptions });
}
