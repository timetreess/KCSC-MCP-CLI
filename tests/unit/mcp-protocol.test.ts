import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { StandardsService } from "../../src/core/standards.js";
import { registerKcscTools } from "../../src/mcp/tools.js";
import { codeListFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

function serviceWith(fetchFn: FetchLike): StandardsService {
  return new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));
}

describe("MCP protocol compatibility", () => {
  it("negotiates capabilities and serves tools over an in-memory transport", async () => {
    const server = new McpServer({ name: "kcsc-standards-mcp", version: "1.0.0" });
    registerKcscTools(server, {
      createService: () => serviceWith(async (url) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => url.includes("CodeList") ? codeListFixture : kdsViewerFixture
      }))
    });

    const client = new Client({ name: "kcsc-standards-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    try {
      expect(client.getServerVersion()).toEqual({ name: "kcsc-standards-mcp", version: "1.0.0" });
      expect(client.getServerCapabilities()).toHaveProperty("tools");

      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toEqual([
        "search_standard",
        "get_standard",
        "search_standard_dual",
        "find_clause",
        "latest_check",
        "check_applicability",
        "verify_citation"
      ]);
      expect(listed.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);

      const result = await client.callTool({
        name: "search_standard",
        arguments: { query: "KDS 11 10 05" }
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toHaveProperty("results");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it.each(["empty", "partial", "failed"] as const)("preserves clause retrieval status over MCP: %s", async (scenario) => {
    const server = new McpServer({ name: "kcsc-standards-mcp", version: "1.0.0" });
    registerKcscTools(server, {
      createService: () => serviceWith(async (url) => {
        const ok = url.includes("CodeList") || (scenario !== "failed" && url.includes("/KDS/"));
        return { ok, status: ok ? 200 : 503, statusText: ok ? "OK" : "Service Unavailable", json: async () => url.includes("CodeList") ? (scenario === "empty" ? [] : codeListFixture) : kdsViewerFixture };
      })
    });
    const client = new Client({ name: "kcsc-standards-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    try {
      const result = await client.callTool({ name: "find_clause", arguments: { query: "공통 지반" } });
      if (scenario === "failed") {
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toBeUndefined();
      } else {
        expect(result.isError).not.toBe(true);
        if (scenario === "empty") {
          expect(result.structuredContent).toMatchObject({ clauses: [], failures: [], searchScope: "unresolved" });
          expect(result.structuredContent).toHaveProperty("scopeNote");
        } else {
          expect(result.structuredContent).toHaveProperty("clauses.0.code", "KDS 11 10 05");
          expect(result.structuredContent).toHaveProperty("failures.0.code", "KCS 57 10 05");
        }
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("publishes strict output schemas and never emits a payload its own tool rejects", async () => {
    const server = new McpServer({ name: "kcsc-standards-mcp", version: "1.0.0" });
    registerKcscTools(server, {
      createService: () => serviceWith(async (url) => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => url.includes("CodeList") ? codeListFixture : kdsViewerFixture
      })),
      createClient: () => new KcscClient({ apiKey: "test-secret", fetchFn: async () => ({ ok: true, status: 200, statusText: "OK", json: async () => codeListFixture }) })
    });
    const client = new Client({ name: "kcsc-standards-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    try {
      const listed = await client.listTools();
      for (const tool of listed.tools) {
        expect(tool.outputSchema, `${tool.name} must publish an output schema`).toBeDefined();
        expect(tool.outputSchema?.additionalProperties, `${tool.name} must reject unknown payload fields`).toBe(false);
      }

      for (const request of [
        { name: "search_standard", arguments: { query: "KDS 11 10 05" } },
        { name: "search_standard", arguments: { query: "포장", standard_type: "specialty", specialty_type: "EXCS" } },
        { name: "get_standard", arguments: { code: "KDS 11 10 05" } },
        { name: "search_standard_dual", arguments: { query: "공통" } },
        { name: "find_clause", arguments: { query: "되메우기 다짐", standard_code: "KDS 11 10 05" } },
        { name: "latest_check", arguments: { code: "KDS 11 10 05" } },
        { name: "latest_check", arguments: { code: "KDS 99 99 99" } },
        { name: "check_applicability", arguments: { code: "KDS 11 10 05", work_type: "geotechnical" } },
        { name: "check_applicability", arguments: { code: "KDS 11 10 05" } },
        { name: "verify_citation", arguments: { text: "KDS 11 10 05 및 KCS 99 99 99" } }
      ]) {
        const result = await client.callTool(request);
        expect(result.isError, `${request.name} ${JSON.stringify(request.arguments)} must satisfy its own output schema`).not.toBe(true);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("returns tool errors rather than negative metadata results for malformed upstream responses", async () => {
    const clientOptions = {
      apiKey: "test-secret",
      fetchFn: async () => ({ ok: true, status: 200, statusText: "OK", json: async () => ({ message: "Invalid API key: test-secret" }) })
    };
    const server = new McpServer({ name: "kcsc-standards-mcp", version: "1.0.0" });
    registerKcscTools(server, {
      createService: () => new StandardsService(new KcscClient(clientOptions)),
      createClient: () => new KcscClient(clientOptions)
    });
    const client = new Client({ name: "kcsc-standards-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    try {
      for (const request of [
        { name: "search_standard", arguments: { query: "지반" } },
        { name: "latest_check", arguments: { code: "KDS111005" } },
        { name: "verify_citation", arguments: { text: "KDS111005" } }
      ]) {
        const result = await client.callTool(request);
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toBeUndefined();
        expect(JSON.stringify(result)).not.toContain("test-secret");
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});
