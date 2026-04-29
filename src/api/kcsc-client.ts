import type { KcscListItem, KcscViewerItem, StandardCodeType } from "./kcsc-types.js";

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string) => Promise<FetchResponseLike>;

export class KcscClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KcscClientError";
  }
}

export interface KcscClientOptions {
  readonly apiKey: string;
  readonly fetchFn?: FetchLike;
  readonly baseUrl?: string;
}

export class KcscClient {
  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;

  constructor(options: KcscClientOptions) {
    if (!options.apiKey.trim()) {
      throw new KcscClientError("KCSC_API_KEY is required to call KCSC OpenAPI.");
    }

    this.apiKey = options.apiKey;
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://kcsc.re.kr/OpenApi";
  }

  buildCodeListUrl(redactKey = false): string {
    return `${this.baseUrl}/CodeList?key=${redactKey ? "REDACTED" : encodeURIComponent(this.apiKey)}`;
  }

  buildCodeViewerUrl(type: StandardCodeType | string, code: string, redactKey = false): string {
    return `${this.baseUrl}/CodeViewer/${encodeURIComponent(type)}/${encodeURIComponent(code)}?key=${redactKey ? "REDACTED" : encodeURIComponent(this.apiKey)}`;
  }

  async fetchCodeList(): Promise<readonly KcscListItem[]> {
    const data = await this.getJson(this.buildCodeListUrl());
    return parseCodeListResponse(data);
  }

  async fetchCodeViewer(type: StandardCodeType | string, code: string): Promise<KcscViewerItem | null> {
    const data = await this.getJson(this.buildCodeViewerUrl(type, code));
    return parseCodeViewerResponse(data);
  }

  toString(): string {
    return `KcscClient(${this.buildCodeListUrl(true)})`;
  }

  private async getJson(url: string): Promise<unknown> {
    const response = await this.fetchFn(url);
    if (!response.ok) {
      throw new KcscClientError(`KCSC OpenAPI request failed: HTTP ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}

export function parseCodeListResponse(data: unknown): readonly KcscListItem[] {
  if (Array.isArray(data)) {
    return data.filter(isKcscListItem);
  }

  if (isObject(data) && Array.isArray(data.list)) {
    return data.list.filter(isKcscListItem);
  }

  return [];
}

export function parseCodeViewerResponse(data: unknown): KcscViewerItem | null {
  const items = Array.isArray(data) ? data : isObject(data) && Array.isArray(data.list) ? data.list : [];
  const first = items.find(isKcscViewerItem);
  return first ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKcscListItem(value: unknown): value is KcscListItem {
  return isObject(value);
}

function isKcscViewerItem(value: unknown): value is KcscViewerItem {
  return isObject(value);
}
