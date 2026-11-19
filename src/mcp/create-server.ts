import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { packageInfo } from "../package-info.js";
import type { KcscToolDependencies } from "./handlers.js";
import { registerKcscTools } from "./tools.js";

export const SERVER_INSTRUCTIONS = [
  "Call search_standard before get_standard when the user provides a topic rather than an exact code.",
  "Call search_standard_dual when design-standard and construction-specification evidence should be reviewed side by side.",
  "Call get_standard before making citation claims.",
  "When find_clause returns failures, explain that evidence is incomplete; do not treat it as an exhaustive negative search.",
  "When find_clause returns searchScope unresolved, no candidate body was searched; report that no candidate was resolved and ask for a standard code or different wording instead of claiming no evidence exists.",
  "Call verify_citation for generated reports or Markdown documents that include KDS/KCS/specialty standard citations.",
  "Include source URL, revision/update date, and confidence level in answers.",
  "Use check_applicability only as advisory guidance and separate national hierarchy from contract-document priority.",
  "Do not generate final engineering answers; retrieve and verify standards evidence."
].join(" ");

/** Builds the MCP server used by both the stdio entry point and the remote HTTP endpoint. */
export function createKcscMcpServer(dependencies: KcscToolDependencies = {}): McpServer {
  const server = new McpServer({ name: packageInfo.name, version: packageInfo.version }, { instructions: SERVER_INSTRUCTIONS });
  registerKcscTools(server, dependencies);
  return server;
}
