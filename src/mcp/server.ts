#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerKcscTools } from "./tools.js";

const server = new McpServer(
  {
    name: "kcsc-standards-mcp",
    version: "0.1.0"
  },
  {
    instructions: [
      "Call search_standard before get_standard when the user provides a topic rather than an exact code.",
      "Call get_standard before making citation claims.",
      "Include source URL, revision/update date, and confidence level in answers.",
      "Treat applicability as advisory and separate national hierarchy from contract-document priority.",
      "Do not generate final engineering answers; retrieve and verify standards evidence."
    ].join(" ")
  }
);

registerKcscTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
