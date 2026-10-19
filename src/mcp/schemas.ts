import { z } from "zod";
import { SPECIALTY_TYPE_FILTERS, STANDARD_TYPE_FILTERS } from "../api/kcsc-types.js";
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

const confidenceSchema = z.enum(["원문 직접 근거", "관련 조항 추론", "근거 미확인"]);
const standardTypeFilterSchema = z.enum(STANDARD_TYPE_FILTERS);
const specialtyTypeSchemaValue = z.enum(SPECIALTY_TYPE_FILTERS);

const standardSummarySchema = z.object({
  standardType: standardTypeFilterSchema,
  codeType: z.string(),
  specialtyType: specialtyTypeSchemaValue.optional(),
  code: z.string(),
  apiCode: z.string(),
  fullCode: z.string().optional(),
  name: z.string(),
  version: z.string().optional(),
  updateDate: z.string().optional(),
  sourceUrl: z.string(),
  parentPath: z.array(z.string()),
  confidence: confidenceSchema,
  reason: z.array(z.string())
});

const standardSectionSchema = z.object({
  sort: z.number(),
  title: z.string(),
  level: z.number().optional(),
  label: z.string(),
  html: z.string(),
  text: z.string()
});

const standardDocumentSchema = standardSummarySchema.omit({ reason: true }).extend({
  sections: z.array(standardSectionSchema),
  evidenceGaps: z.array(z.string())
});

const clauseEvidenceSchema = z.object({
  standardType: standardTypeFilterSchema,
  codeType: z.string(),
  specialtyType: specialtyTypeSchemaValue.optional(),
  code: z.string(),
  apiCode: z.string(),
  name: z.string(),
  updateDate: z.string().optional(),
  version: z.string().optional(),
  sourceUrl: z.string(),
  sectionTitle: z.string(),
  sectionLabel: z.string(),
  sectionPath: z.array(z.string()),
  text: z.string(),
  confidence: confidenceSchema,
  score: z.number()
});

const applicabilityEvidenceSchema = z.object({
  category: z.union([projectTypeSchema, workTypeSchema]),
  keyword: z.string(),
  location: z.enum(["code", "name", "parentPath", "sectionTitle", "sectionLabel", "sectionText"]),
  sectionLabel: z.string().optional()
});

const latestResultSchema = z.object({
  inputCode: z.string(),
  exists: z.boolean(),
  latestKnown: z.boolean(),
  metadataStatus: z.enum(["current-metadata-found", "not-found-in-current-metadata"]),
  standard: standardSummarySchema.optional(),
  message: z.string()
});

const dualResultSchema = z.object({
  query: z.string(),
  searchedAt: z.string(),
  kdsResults: z.array(standardSummarySchema),
  kcsResults: z.array(standardSummarySchema),
  caveat: z.string()
});

const applicabilityResultSchema = z.object({
  standard: standardSummarySchema,
  requestedProjectType: projectTypeSchema.optional(),
  requestedWorkType: workTypeSchema.optional(),
  projectMatched: z.boolean(),
  workMatched: z.boolean(),
  matchedProjects: z.array(projectTypeSchema),
  matchedWorks: z.array(workTypeSchema),
  evidence: z.array(applicabilityEvidenceSchema),
  reasoning: z.array(z.string()),
  recommendation: z.string(),
  caveat: z.string(),
  confidence: confidenceSchema
});

const citationVerificationSchema = z.object({
  raw: z.string(),
  code: z.string(),
  apiCode: z.string(),
  codeType: z.string(),
  normalized: z.string(),
  exists: z.boolean(),
  standard: standardSummarySchema.optional(),
  message: z.string()
});

export const resultsOutputSchema = z.object({ results: z.array(standardSummarySchema) });
export const documentOutputSchema = z.object({ document: standardDocumentSchema });
export const dualOutputSchema = z.object({ result: dualResultSchema });
export const clausesOutputSchema = z.object({
  clauses: z.array(clauseEvidenceSchema),
  failures: z.array(z.object({ code: z.string(), message: z.string() })).describe("Documents that could not be retrieved. A non-empty array means the search is incomplete, even if clauses is empty."),
  searchScope: z.enum(["standard", "candidates", "unresolved"]).describe("Which documents were searched. 'unresolved' means no candidate body was searched at all, so an empty clauses list is not a negative finding."),
  searchedCodes: z.array(z.string()),
  scopeNote: z.string().optional()
});
export const latestOutputSchema = z.object({ result: latestResultSchema });
export const applicabilityOutputSchema = z.object({ result: applicabilityResultSchema });
export const citationsOutputSchema = z.object({ citations: z.array(citationVerificationSchema) });
