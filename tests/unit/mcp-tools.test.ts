import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { KcscClient, type FetchLike } from "../../src/api/kcsc-client.js";
import { registerKcscTools, type KcscToolRegistrar } from "../../src/mcp/tools.js";
import { StandardsService } from "../../src/core/standards.js";
import { codeListFixture, kdsViewerFixture } from "../fixtures/kcsc-fixtures.js";

type CapturedTool = {
  readonly name: string;
  readonly config: { readonly annotations?: { readonly readOnlyHint?: boolean | undefined }; readonly inputSchema?: unknown; readonly outputSchema?: unknown };
  readonly handler: (input: Record<string, unknown>) => Promise<CallToolResult> | CallToolResult;
};

function captureTools(): { readonly registrar: KcscToolRegistrar; readonly tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const registrar: KcscToolRegistrar = {
    registerTool: (name, config, handler) => {
      tools.push({ name, config, handler: handler as (input: Record<string, unknown>) => Promise<CallToolResult> | CallToolResult });
      const registeredTool = {
        ...(config.title ? { title: config.title } : {}),
        ...(config.description ? { description: config.description } : {}),
        ...(config.inputSchema ? { inputSchema: config.inputSchema as RegisteredTool["inputSchema"] } : {}),
        ...(config.outputSchema ? { outputSchema: config.outputSchema as RegisteredTool["outputSchema"] } : {}),
        ...(config.annotations ? { annotations: config.annotations } : {}),
        ...(config._meta ? { _meta: config._meta } : {}),
        handler: handler as RegisteredTool["handler"],
        enabled: true,
        enable: () => undefined,
        disable: () => undefined,
        update: () => undefined,
        remove: () => undefined
      };
      return registeredTool as RegisteredTool;
    }
  };
  return { registrar, tools };
}

function serviceWith(fetchFn: FetchLike): StandardsService {
  return new StandardsService(new KcscClient({ apiKey: "test-secret", fetchFn }));
}

describe("registerKcscTools", () => {
  it("registers all tools with read-only annotations and schemas", () => {
    const { registrar, tools } = captureTools();
    registerKcscTools(registrar);
    expect(tools.map((tool) => tool.name)).toEqual(["search_standard", "get_standard", "search_standard_dual", "find_clause", "latest_check", "check_applicability", "verify_citation"]);
    expect(tools.every((tool) => tool.config.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.every((tool) => tool.config.inputSchema !== undefined && tool.config.outputSchema !== undefined)).toBe(true);
  });

  it("returns structured content on success", async () => {
    const { registrar, tools } = captureTools();
    registerKcscTools(registrar, {
      createService: () => serviceWith(async (url) => ({ ok: true, status: 200, statusText: "OK", json: async () => url.includes("CodeList") ? codeListFixture : kdsViewerFixture }))
    });
    const searchTool = tools.find((tool) => tool.name === "search_standard");
    expect(searchTool).toBeDefined();
    const result = await searchTool?.handler({ query: "KDS 11 10 05" });
    expect(result?.structuredContent).toHaveProperty("results");
    expect(result?.content[0]?.type).toBe("text");
  });

  it("returns MCP tool errors for recoverable failures", async () => {
    const { registrar, tools } = captureTools();
    registerKcscTools(registrar, { createService: () => { throw new Error("missing key"); } });
    const searchTool = tools.find((tool) => tool.name === "search_standard");
    const result = await searchTool?.handler({ query: "터널" });
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.type === "text" ? result.content[0].text : "").toContain("missing key");
  });

  /**
   * The other tool tests inject dependencies, which production never does: every tool call builds its
   * own service through the factory. With no injected service the only thing that can collapse two
   * concurrent metadata reads is the factory reusing one client and that client sharing the request.
   */
  it("collapses concurrent tool calls into a single CodeList request", async () => {
    const previousApiKey = process.env.KCSC_API_KEY;
    process.env.KCSC_API_KEY = "test-secret";
    const originalFetch = globalThis.fetch;
    let codeListCalls = 0;
    globalThis.fetch = (async (input: unknown) => {
      if (String(input).includes("CodeList")) {
        codeListCalls += 1;
      }
      return new Response(JSON.stringify(codeListFixture), { status: 200 });
    }) as typeof globalThis.fetch;

    try {
      const { registrar, tools } = captureTools();
      registerKcscTools(registrar);
      const searchTool = tools.find((tool) => tool.name === "search_standard");
      await Promise.all([
        searchTool?.handler({ query: "KDS 11 10 05" }),
        searchTool?.handler({ query: "KCS 57 10 05" })
      ]);
      expect(codeListCalls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      if (previousApiKey === undefined) {
        delete process.env.KCSC_API_KEY;
      } else {
        process.env.KCSC_API_KEY = previousApiKey;
      }
    }
  });
});
