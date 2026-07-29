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
});
