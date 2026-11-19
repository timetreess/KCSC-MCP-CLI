import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../../src/api/kcsc-client.js";
import { handleMcpRequest } from "../../src/http/handler.js";
import { codeListFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

const seenKeys: string[] = [];
const fakeKcsc: FetchLike = async (url) => {
  seenKeys.push(new URL(url).searchParams.get("key") ?? "");
  return { ok: true, status: 200, statusText: "OK", json: async () => (url.includes("CodeList") ? codeListFixture : kdsViewerFixture) };
};

let server: Server | undefined;

async function start(fallbackApiKey?: string): Promise<string> {
  server = createServer((req, res) => void handleMcpRequest(req, res, { fallbackApiKey, fetchFn: fakeKcsc }));
  await new Promise<void>((resolve) => server?.listen(0, resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
}

afterEach(async () => {
  seenKeys.length = 0;
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

describe("remote Streamable HTTP endpoint", () => {
  it("serves the KCSC tools and forwards the caller's ?key= to KCSC", async () => {
    const url = await start();
    const client = new Client({ name: "remote-test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}?key=caller-key`)) as Transport);
    try {
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toContain("search_standard");
      const result = await client.callTool({ name: "search_standard", arguments: { query: "되메우기" } });
      expect(result.isError).not.toBe(true);
      expect(seenKeys.length).toBeGreaterThan(0);
      expect(new Set(seenKeys)).toEqual(new Set(["caller-key"]));
    } finally {
      await client.close();
    }
  });

  it("rejects requests without a key when no fallback is configured", async () => {
    const url = await start();
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    });
    expect(response.status).toBe(401);
    expect(seenKeys).toEqual([]);
  });

  it("accepts the key from the x-kcsc-api-key header", async () => {
    const url = await start();
    const client = new Client({ name: "remote-test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { "x-kcsc-api-key": "header-key" } } }) as Transport);
    try {
      await client.callTool({ name: "search_standard", arguments: { query: "되메우기" } });
      expect(new Set(seenKeys)).toEqual(new Set(["header-key"]));
    } finally {
      await client.close();
    }
  });
});
