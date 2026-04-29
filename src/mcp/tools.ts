import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SearchStandardInput } from "../api/kcsc-types.js";
import { KcscClient } from "../api/kcsc-client.js";
import { loadConfig } from "../config.js";
import { ClauseFinder } from "../core/clauses.js";
import { verifyCitations } from "../core/citations.js";
import { StandardsService } from "../core/standards.js";

const standardTypeSchema = z.enum(["KDS", "KCS", "specialty", "all"]);
const specialtyTypeSchema = z.enum(["EXCS", "KRACS", "KRCCS", "KWCS", "LHCS", "NHCS", "SMCS", "all_specialty"]);
const projectTypeSchema = z.enum([
  "road",
  "railway",
  "bridge",
  "tunnel",
  "river",
  "dam",
  "port",
  "waterworks",
  "site",
  "building",
  "plant",
  "common"
]);
const workTypeSchema = z.enum([
  "earthwork",
  "geotechnical",
  "foundation",
  "concrete",
  "steel",
  "temporary",
  "pavement",
  "drainage",
  "waterproofing",
  "seismic",
  "quality_test",
  "measurement",
  "safety",
  "maintenance"
]);

export function registerKcscTools(server: McpServer): void {
  server.registerTool(
    "search_standard",
    {
      title: "Search Korean Construction Standards",
      description: "Search KDS, KCS, and specialty standard metadata from KCSC CodeList by topic, code, project, and work type.",
      inputSchema: {
        query: z.string().min(1).describe("Natural-language topic or exact standard code, e.g. 터널 방수 or KDS 11 10 05."),
        standard_type: standardTypeSchema.optional().describe("Standards scope: KDS, KCS, specialty, or all. Defaults to all."),
        specialty_type: specialtyTypeSchema.optional().describe("Optional specialty standard family API codeType filter, e.g. EXCS or LHCS."),
        project_type: projectTypeSchema.optional().describe("Optional project preset mapped to API parent branches and Korean keywords."),
        work_type: workTypeSchema.optional().describe("Optional work-type heuristic for ranking; not a guaranteed native KCSC taxonomy."),
        limit: z.number().int().min(1).max(50).optional().describe("Maximum result count. Defaults to 10.")
      },
      annotations: { readOnlyHint: true }
    },
    async (input) => {
      try {
        const service = createService();
        const results = await service.searchStandard(toSearchInput(input));
        return {
          content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }]
        };
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
      inputSchema: {
        code: z.string().min(1).describe("Standard code such as KDS 11 10 05, KCS-57-10-05, or KDS111005.")
      },
      annotations: { readOnlyHint: true }
    },
    async ({ code }) => {
      try {
        const service = createService();
        const document = await service.getStandard(code);
        return {
          content: [{ type: "text", text: JSON.stringify(document, null, 2) }]
        };
      } catch (error) {
        return toToolError(error);
      }
    }
  );

  server.registerTool(
    "find_clause",
    {
      title: "Find Clause Evidence",
      description: "Find clause-level evidence from KCSC CodeViewer contents for a natural-language query.",
      inputSchema: {
        query: z.string().min(1).describe("Natural-language clause query, e.g. 되메우기 다짐 기준."),
        standard_code: z.string().optional().describe("Optional exact standard code to search within, e.g. KCS 11 20 15."),
        standard_type: standardTypeSchema.optional().describe("Optional standards scope for candidate search."),
        specialty_type: specialtyTypeSchema.optional().describe("Optional specialty standard family filter."),
        project_type: projectTypeSchema.optional().describe("Optional project preset."),
        work_type: workTypeSchema.optional().describe("Optional work-type ranking heuristic."),
        limit: z.number().int().min(1).max(20).optional().describe("Maximum clause evidence count. Defaults to 10.")
      },
      annotations: { readOnlyHint: true }
    },
    async (input) => {
      try {
        const service = createService();
        const finder = new ClauseFinder(service);
        const clauses = await finder.findClause({ ...toSearchInput(input), ...(input.standard_code ? { standardCode: input.standard_code } : {}) });
        return {
          content: [{ type: "text", text: JSON.stringify({ clauses }, null, 2) }]
        };
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
      inputSchema: {
        code: z.string().min(1).describe("Standard code such as KDS 11 10 05 or KCS571005.")
      },
      annotations: { readOnlyHint: true }
    },
    async ({ code }) => {
      try {
        const service = createService();
        const result = await service.latestCheck(code);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
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
      inputSchema: {
        text: z.string().min(1).describe("Text or Markdown content containing possible standard citations.")
      },
      annotations: { readOnlyHint: true }
    },
    async ({ text }) => {
      try {
        const config = loadConfig();
        const client = new KcscClient({ apiKey: config.kcscApiKey });
        const metadata = await client.fetchCodeList();
        const verifications = verifyCitations(text, metadata);
        return {
          content: [{ type: "text", text: JSON.stringify({ citations: verifications }, null, 2) }]
        };
      } catch (error) {
        return toToolError(error);
      }
    }
  );
}

function createService(): StandardsService {
  const config = loadConfig();
  return new StandardsService(new KcscClient({ apiKey: config.kcscApiKey }));
}

function toSearchInput(input: {
  readonly query: string;
  readonly standard_type?: SearchStandardInput["standardType"];
  readonly specialty_type?: SearchStandardInput["specialtyType"];
  readonly project_type?: SearchStandardInput["projectType"];
  readonly work_type?: SearchStandardInput["workType"];
  readonly limit?: number | undefined;
  readonly standard_code?: string | undefined;
}): SearchStandardInput {
  return {
    query: input.query,
    ...(input.standard_type ? { standardType: input.standard_type } : {}),
    ...(input.specialty_type ? { specialtyType: input.specialty_type } : {}),
    ...(input.project_type ? { projectType: input.project_type } : {}),
    ...(input.work_type ? { workType: input.work_type } : {}),
    ...(input.limit ? { limit: input.limit } : {})
  };
}

function toToolError(error: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true
  };
}
