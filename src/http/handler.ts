import type { IncomingMessage, ServerResponse } from "node:http";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { KcscClient, type FetchLike } from "../api/kcsc-client.js";
import { StandardsService } from "../core/standards.js";
import { createKcscMcpServer } from "../mcp/create-server.js";

export interface RemoteHandlerOptions {
  /** Key used when a request carries none. Leave unset so that every caller must bring their own KCSC key. */
  readonly fallbackApiKey?: string | undefined;
  readonly fetchFn?: FetchLike;
}

const KEY_QUERY_PARAMS = ["key", "kcsc_key", "apikey"] as const;
const KEY_HEADERS = ["x-kcsc-api-key", "apikey"] as const;

/**
 * Extracts the caller's KCSC OpenAPI key. Claude custom connectors only take a URL,
 * so the query string (`/mcp?key=...`) is the primary channel; headers serve other clients.
 */
export function resolveRequestApiKey(req: IncomingMessage, fallbackApiKey?: string): string | undefined {
  const url = new URL(req.url ?? "/", "http://localhost");
  for (const name of KEY_QUERY_PARAMS) {
    const value = url.searchParams.get(name)?.trim();
    if (value) return value;
  }
  for (const name of KEY_HEADERS) {
    const raw = req.headers[name];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) return value;
  }
  return fallbackApiKey?.trim() || undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function jsonRpcError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : undefined;
}

/**
 * Stateless Streamable HTTP endpoint: each POST gets its own server and KCSC client bound to the
 * caller's key, so no key is shared across callers or kept between requests.
 */
export async function handleMcpRequest(req: IncomingMessage & { body?: unknown }, res: ServerResponse, options: RemoteHandlerOptions = {}): Promise<void> {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, x-kcsc-api-key, apikey"
    });
    res.end();
    return;
  }
  if (req.method === "GET") {
    sendJson(res, 405, { error: "Use POST with MCP JSON-RPC. Health check: /api/health" });
    return;
  }
  if (req.method !== "POST") {
    jsonRpcError(res, 405, "Method not allowed.");
    return;
  }

  const apiKey = resolveRequestApiKey(req, options.fallbackApiKey);
  if (!apiKey) {
    jsonRpcError(res, 401, "KCSC API key is required. Add ?key=YOUR_KCSC_API_KEY to the MCP URL.");
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    jsonRpcError(res, 400, "Request body is not valid JSON.");
    return;
  }

  const client = new KcscClient({ apiKey, ...(options.fetchFn ? { fetchFn: options.fetchFn } : {}) });
  const service = new StandardsService(client);
  const server = createKcscMcpServer({ createService: () => service, createClient: () => client });
  const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true }); // no sessionIdGenerator → stateless

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    // The SDK class predates exactOptionalPropertyTypes; its optional callbacks are structurally a Transport.
    await server.connect(transport as Transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    if (!res.headersSent) {
      jsonRpcError(res, 500, error instanceof Error ? error.message : "Internal server error.");
    }
  }
}
