#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerKcscTools } from "./tools.js";

const server = new McpServer(
  {
    name: "kcsc-standards-mcp",
    version: "1.0.0"
  },
  {
    instructions: [
      "Call search_standard before get_standard when the user provides a topic rather than an exact code.",
      "Call search_standard_dual when design-standard and construction-specification evidence should be reviewed side by side.",
      "Call get_standard before making citation claims.",
      "Call verify_citation for generated reports or Markdown documents that include KDS/KCS/specialty standard citations.",
      "Include source URL, revision/update date, and confidence level in answers.",
      "Use check_applicability only as advisory guidance and separate national hierarchy from contract-document priority.",
      "Do not generate final engineering answers; retrieve and verify standards evidence."
    ].join(" ")
  }
);

registerKcscTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
