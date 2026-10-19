import type { KcscListItem, KcscViewerItem, StandardCodeType } from "./kcsc-types.js";

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
}

export interface FetchLikeOptions {
  readonly signal?: AbortSignal;
}

export type FetchLike = (url: string, options?: FetchLikeOptions) => Promise<FetchResponseLike>;

export class KcscClientError extends Error {
  constructor(message: string, readonly reason: "http" | "timeout" | "cancelled" | "transport" | "invalid-json" | "invalid-response" = "transport") {
    super(message);
    this.name = "KcscClientError";
  }
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export interface KcscClientOptions {
  readonly apiKey: string;
  readonly fetchFn?: FetchLike;
  readonly baseUrl?: string;
  /** Deadline applied to a single KCSC request. Set to 0 to wait indefinitely. */
  readonly requestTimeoutMs?: number;
}

export interface KcscRequestOptions {
  readonly signal?: AbortSignal;
}

export class KcscClient {
  /** Shares one in-flight CodeList response across concurrent callers. Deliberately not a TTL cache: metadata freshness is the caller's concern. */
  private codeListRequest: Promise<readonly KcscListItem[]> | undefined;

  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(options: KcscClientOptions) {
    if (!options.apiKey.trim()) {
      throw new KcscClientError("KCSC_API_KEY is required to call KCSC OpenAPI.");
    }

    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://kcsc.re.kr/OpenApi";
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  buildCodeListUrl(redactKey = false): string {
    return `${this.baseUrl}/CodeList?key=${redactKey ? "REDACTED" : encodeURIComponent(this.apiKey)}`;
  }

  buildCodeViewerUrl(type: StandardCodeType | string, code: string, redactKey = false): string {
    return `${this.baseUrl}/CodeViewer/${encodeURIComponent(type)}/${encodeURIComponent(code)}?key=${redactKey ? "REDACTED" : encodeURIComponent(this.apiKey)}`;
  }

  async fetchCodeList(options: KcscRequestOptions = {}): Promise<readonly KcscListItem[]> {
    // A caller-supplied signal has to stay cancellable on its own, so it neither joins a shared
    // request nor gets cancelled by it.
    if (options.signal) {
      return this.requestCodeList(options);
    }
    this.codeListRequest ??= this.requestCodeList().finally(() => {
      this.codeListRequest = undefined;
    });
    return this.codeListRequest;
  }

  private async requestCodeList(options: KcscRequestOptions = {}): Promise<readonly KcscListItem[]> {
    const data = await this.getJson(this.buildCodeListUrl(), options);
    return parseCodeListResponse(data);
  }

  async fetchCodeViewer(type: StandardCodeType | string, code: string, options: KcscRequestOptions = {}): Promise<KcscViewerItem | null> {
    const data = await this.getJson(this.buildCodeViewerUrl(type, code), options);
    const item = parseCodeViewerResponse(data);
    if (item && (item.codeType?.toUpperCase() !== type.toUpperCase() || item.code !== code)) {
      throw new KcscClientError("KCSC OpenAPI returned a document that does not match the requested standard code.", "invalid-response");
    }
    return item;
  }

  toString(): string {
    return `KcscClient(${this.buildCodeListUrl(true)})`;
  }

  private async getJson(url: string, options: KcscRequestOptions): Promise<unknown> {
    if (options.signal?.aborted) {
      throw new KcscClientError("KCSC OpenAPI request was cancelled before it started.", "cancelled");
    }

    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    options.signal?.addEventListener("abort", forwardAbort, { once: true });

    // The deadline and caller cancellation are raced locally rather than delegated to the
    // underlying fetch, so they still apply when an injected fetch ignores the abort signal.
    const losers: Promise<never>[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (this.requestTimeoutMs > 0) {
      losers.push(new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new KcscClientError(`KCSC OpenAPI request timed out after ${this.requestTimeoutMs} ms.`, "timeout"));
          controller.abort();
        }, this.requestTimeoutMs);
      }));
    }
    if (options.signal) {
      losers.push(new Promise<never>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          reject(new KcscClientError("KCSC OpenAPI request was cancelled by the caller.", "cancelled"));
        }, { once: true });
      }));
    }
    losers.forEach((loser) => loser.catch(() => undefined));

    const request = this.fetchFn(url, { signal: controller.signal });
    request.catch(() => undefined);

    let response: FetchResponseLike;
    try {
      response = losers.length > 0 ? await Promise.race([request, ...losers]) : await request;
    } catch (error) {
      throw this.requestError(options.signal, error);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      options.signal?.removeEventListener("abort", forwardAbort);
    }

    if (!response.ok) {
      throw new KcscClientError(`KCSC OpenAPI request failed: HTTP ${response.status}`, "http");
    }
    try {
      return await response.json();
    } catch {
      throw new KcscClientError("KCSC OpenAPI returned invalid JSON.", "invalid-json");
    }
  }

  private requestError(callerSignal: AbortSignal | undefined, cause: unknown): KcscClientError {
    if (cause instanceof KcscClientError) {
      return cause;
    }
    if (callerSignal?.aborted) {
      return new KcscClientError("KCSC OpenAPI request was cancelled by the caller.", "cancelled");
    }
    return new KcscClientError("KCSC OpenAPI request failed before receiving a response.", "transport");
  }
}

export function parseCodeListResponse(data: unknown): readonly KcscListItem[] {
  const items = responseItems(data, "CodeList");
  if (!items.every(isKcscListItem)) {
    throw new KcscClientError("Invalid KCSC CodeList response: malformed metadata item.", "invalid-response");
  }
  return items;
}

export function parseCodeViewerResponse(data: unknown): KcscViewerItem | null {
  const items = responseItems(data, "CodeViewer");
  if (!items.every(isKcscViewerItem)) {
    throw new KcscClientError("Invalid KCSC CodeViewer response: malformed document item.", "invalid-response");
  }
  return items[0] ?? null;
}

function responseItems(data: unknown, endpoint: "CodeList" | "CodeViewer"): readonly unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (isObject(data) && Array.isArray(data.list)) {
    return data.list;
  }
  throw new KcscClientError(`Invalid KCSC ${endpoint} response: expected an array or an object with a list array.`, "invalid-response");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKcscListItem(value: unknown): value is KcscListItem {
  if (!isObject(value)) {
    return false;
  }

  return isNonEmptyString(value.codeType) && isNonEmptyString(value.code) && isNonEmptyString(value.name) && isOptionalNumberOrString(value.no) && isOptionalString(value.fullCode) && isOptionalString(value.version) && isOptionalString(value.updateDate) && isOptionalString(value.message) && isOptionalParentCodes(value.listParentCodes);
}

function isKcscViewerItem(value: unknown): value is KcscViewerItem {
  if (!isObject(value)) {
    return false;
  }

  return isNonEmptyString(value.codeType) && isNonEmptyString(value.code) && isOptionalNumberOrString(value.no) && isOptionalString(value.fullCode) && isOptionalString(value.name) && isOptionalString(value.version) && isOptionalString(value.updateDate) && isOptionalString(value.message) && (value.list === undefined || value.list === null || (Array.isArray(value.list) && value.list.every(isKcscViewerSection)));
}

function isKcscViewerSection(value: unknown): value is NonNullable<KcscViewerItem["list"]>[number] {
  if (!isObject(value)) {
    return false;
  }

  return isOptionalNumberOrString(value.no) && isOptionalNumberOrString(value.sort) && isOptionalString(value.title) && isOptionalNumberOrString(value.level) && isOptionalString(value.label) && isOptionalString(value.contents);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalNumberOrString(value: unknown): value is number | string | null | undefined {
  return value === undefined || value === null || typeof value === "number" || typeof value === "string";
}

function isOptionalParentCodes(value: unknown): value is KcscListItem["listParentCodes"] {
  if (value === undefined || value === null || typeof value === "string") {
    return true;
  }

  return Array.isArray(value) && value.every((parent) => isObject(parent) && isOptionalString(parent.codeType) && isOptionalString(parent.fullCode) && isOptionalString(parent.name));
}
