import { z } from "zod";
import { projectTypeSchema, specialtyTypeSchema, standardTypeSchema, workTypeSchema } from "../core/validators.js";

export const searchStandardInputSchema = z.object({
  query: z.string().min(1).describe("Natural-language topic or exact standard code, e.g. 터널 방수 or KDS 11 10 05."),
  standard_type: standardTypeSchema.optional().describe("Standards scope: KDS, KCS, specialty, or all. Defaults to all."),
  specialty_type: specialtyTypeSchema.optional().describe("Optional specialty standard family API codeType filter, e.g. EXCS or LHCS."),
  project_type: projectTypeSchema.optional().describe("Optional project preset mapped to API parent branches and Korean keywords."),
  work_type: workTypeSchema.optional().describe("Optional work-type heuristic for ranking; not a guaranteed native KCSC taxonomy."),
  limit: z.number().int().min(1).max(50).optional().describe("Maximum result count. Defaults to 10.")
});

export const getStandardInputSchema = z.object({
  code: z.string().min(1).describe("Standard code such as KDS 11 10 05, KCS-57-10-05, or KDS111005.")
});

export const searchStandardDualInputSchema = z.object({
  query: z.string().min(1).describe("Natural-language topic, e.g. 터널 방수 or 되메우기 다짐."),
  project_type: projectTypeSchema.optional().describe("Optional project preset applied to both KDS and KCS searches."),
  work_type: workTypeSchema.optional().describe("Optional work-type ranking heuristic applied to both KDS and KCS searches."),
  limit: z.number().int().min(1).max(50).optional().describe("Maximum result count per standard type. Defaults to 10.")
});

export const findClauseInputSchema = z.object({
  query: z.string().min(1).describe("Natural-language clause query, e.g. 되메우기 다짐 기준."),
  standard_code: z.string().optional().describe("Optional exact standard code to search within, e.g. KCS 11 20 15."),
  standard_type: standardTypeSchema.optional().describe("Optional standards scope for candidate search."),
  specialty_type: specialtyTypeSchema.optional().describe("Optional specialty standard family filter."),
  project_type: projectTypeSchema.optional().describe("Optional project preset."),
  work_type: workTypeSchema.optional().describe("Optional work-type ranking heuristic."),
  limit: z.number().int().min(1).max(20).optional().describe("Maximum clause evidence count. Defaults to 10.")
});

export const latestCheckInputSchema = getStandardInputSchema;

export const checkApplicabilityInputSchema = z.object({
  code: z.string().min(1).describe("Standard code such as KDS 11 10 05 or KCS571005."),
  project_type: projectTypeSchema.optional().describe("Optional project type to check against."),
  work_type: workTypeSchema.optional().describe("Optional work type to check against."),
  specialty_type: specialtyTypeSchema.optional().describe("Optional specialty standard family context.")
});

export const verifyCitationInputSchema = z.object({
  text: z.string().min(1).describe("Text or Markdown content containing possible standard citations.")
});

export const resultsOutputSchema = z.object({ results: z.array(z.unknown()) });
export const documentOutputSchema = z.object({ document: z.unknown() });
export const dualOutputSchema = z.object({ result: z.unknown() });
export const clausesOutputSchema = z.object({
  clauses: z.array(z.unknown()),
  failures: z.array(z.object({ code: z.string(), message: z.string() })).describe("Documents that could not be retrieved. A non-empty array means the search is incomplete, even if clauses is empty."),
  searchScope: z.enum(["standard", "candidates", "unresolved"]).describe("Which documents were searched. 'unresolved' means no candidate body was searched at all, so an empty clauses list is not a negative finding."),
  searchedCodes: z.array(z.string()),
  scopeNote: z.string().optional()
});
export const latestOutputSchema = z.object({ result: z.unknown() });
export const applicabilityOutputSchema = z.object({ result: z.unknown() });
export const citationsOutputSchema = z.object({ citations: z.array(z.unknown()) });
