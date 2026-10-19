import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApplicabilityChecker } from "../core/applicability.js";
import { ClauseFinder } from "../core/clauses.js";
import { verifyCitations } from "../core/citations.js";
import { getKcscClient, getStandardsService, toSearchInput, toToolError, toToolResult, type KcscToolDependencies } from "./handlers.js";
import {
  applicabilityOutputSchema,
  checkApplicabilityInputSchema,
  citationsOutputSchema,
  clausesOutputSchema,
  documentOutputSchema,
  dualOutputSchema,
  findClauseInputSchema,
  getStandardInputSchema,
  latestCheckInputSchema,
  latestOutputSchema,
  resultsOutputSchema,
  searchStandardDualInputSchema,
  searchStandardInputSchema,
  verifyCitationInputSchema
} from "./schemas.js";

export type KcscToolRegistrar = Pick<McpServer, "registerTool">;

export function registerKcscTools(server: KcscToolRegistrar, dependencies: KcscToolDependencies = {}): void {
  server.registerTool(
    "search_standard",
    {
      title: "Search Korean Construction Standards",
      description: "Search KDS, KCS, and specialty standard metadata from KCSC CodeList by topic, code, project, and work type.",
      inputSchema: searchStandardInputSchema,
      outputSchema: resultsOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async (input) => {
      try {
        const service = getStandardsService(dependencies);
        const results = await service.searchStandard(toSearchInput(input));
        return toToolResult({ results });
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "get_standard",
    {
      title: "Get Korean Construction Standard",
      description: "Retrieve a KCSC standard document by code using CodeViewer and return metadata plus normalized sections.",
      inputSchema: getStandardInputSchema,
      outputSchema: documentOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async ({ code }) => {
      try {
        const service = getStandardsService(dependencies);
        const document = await service.getStandard(code);
        return toToolResult({ document }, document);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "search_standard_dual",
    {
      title: "Search KDS and KCS Together",
      description: "Search KDS design standards and KCS construction specifications in parallel for the same topic and return separate result sets.",
      inputSchema: searchStandardDualInputSchema,
      outputSchema: dualOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async (input) => {
      try {
        const service = getStandardsService(dependencies);
        const result = await service.searchStandardDual(toSearchInput(input));
        return toToolResult({ result }, result);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "find_clause",
    {
      title: "Find Clause Evidence",
      description: "Find clause-level evidence from KCSC CodeViewer contents for a natural-language query. Read searchScope before reporting: 'unresolved' means no candidate body was searched, and a non-empty failures list means results are partial.",
      inputSchema: findClauseInputSchema,
      outputSchema: clausesOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async (input) => {
      try {
        const service = getStandardsService(dependencies);
        const finder = new ClauseFinder(service);
        const result = await finder.findClauseWithDiagnostics({ ...toSearchInput(input), ...(input.standard_code ? { standardCode: input.standard_code } : {}) });
        return toToolResult({
          clauses: result.clauses,
          failures: result.failures,
          searchScope: result.searchScope,
          searchedCodes: result.searchedCodes,
          ...(result.scopeNote ? { scopeNote: result.scopeNote } : {})
        });
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "latest_check",
    {
      title: "Latest Standard Check",
      description: "Check whether a standard code exists in current KCSC CodeList metadata. This does not determine project contractual applicability.",
      inputSchema: latestCheckInputSchema,
      outputSchema: latestOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async ({ code }) => {
      try {
        const service = getStandardsService(dependencies);
        const result = await service.latestCheck(code);
        return toToolResult({ result }, result);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "check_applicability",
    {
      title: "Check Standard Applicability",
      description: "Advisory check for whether a standard may apply to a project/work context. This does not determine contractual applicability.",
      inputSchema: checkApplicabilityInputSchema,
      outputSchema: applicabilityOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async ({ code, project_type, work_type, specialty_type }) => {
      try {
        const service = getStandardsService(dependencies);
        const checker = new ApplicabilityChecker(service);
        const result = await checker.check({
          standardCode: code,
          ...(project_type ? { projectType: project_type } : {}),
          ...(work_type ? { workType: work_type } : {}),
          ...(specialty_type ? { specialtyType: specialty_type } : {})
        });
        return toToolResult({ result }, result);
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "verify_citation",
    {
      title: "Verify Standard Citations",
      description: "Extract and verify KDS/KCS/specialty standard code citations from text against current KCSC CodeList metadata.",
      inputSchema: verifyCitationInputSchema,
      outputSchema: citationsOutputSchema,
      annotations: { readOnlyHint: true }
    },
    async ({ text }) => {
      try {
        const client = getKcscClient(dependencies);
        const metadata = await client.fetchCodeList();
        const citations = verifyCitations(text, metadata);
        return toToolResult({ citations });
      } catch (error) {
        return toToolError(error);
      }
    }
  );
}
