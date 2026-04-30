export const STANDARD_CODE_TYPES = ["KDS", "KCS", "EXCS", "KRACS", "KRCCS", "KWCS", "LHCS", "NHCS", "SMCS"] as const;

export type StandardCodeType = (typeof STANDARD_CODE_TYPES)[number];

export const STANDARD_TYPE_FILTERS = ["KDS", "KCS", "specialty", "all"] as const;

export type StandardTypeFilter = (typeof STANDARD_TYPE_FILTERS)[number];

export type SpecialtyType = Exclude<StandardCodeType, "KDS" | "KCS">;

export const SPECIALTY_TYPE_FILTERS = ["EXCS", "KRACS", "KRCCS", "KWCS", "LHCS", "NHCS", "SMCS", "all_specialty"] as const;

export type SpecialtyTypeFilter = (typeof SPECIALTY_TYPE_FILTERS)[number];

export const PROJECT_TYPES = ["road", "railway", "bridge", "tunnel", "river", "dam", "port", "waterworks", "site", "building", "plant", "common"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const WORK_TYPES = [
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
] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export type ConfidenceLabel = "원문 직접 근거" | "관련 조항 추론" | "근거 미확인";

export interface KcscParentCode {
  readonly codeType?: string | null;
  readonly fullCode?: string | null;
  readonly name?: string | null;
}

export interface KcscListItem {
  readonly no?: number | string | null;
  readonly codeType?: string | null;
  readonly code?: string | null;
  readonly fullCode?: string | null;
  readonly name?: string | null;
  readonly version?: string | null;
  readonly updateDate?: string | null;
  readonly list?: unknown;
  readonly listParentCodes?: readonly KcscParentCode[] | string | null;
  readonly message?: string | null;
}

export interface KcscViewerSection {
  readonly no?: number | string | null;
  readonly sort?: number | string | null;
  readonly title?: string | null;
  readonly level?: number | string | null;
  readonly label?: string | null;
  readonly contents?: string | null;
}

export interface KcscViewerItem {
  readonly no?: number | string | null;
  readonly codeType?: string | null;
  readonly code?: string | null;
  readonly fullCode?: string | null;
  readonly name?: string | null;
  readonly version?: string | null;
  readonly updateDate?: string | null;
  readonly list?: readonly KcscViewerSection[] | null;
  readonly message?: string | null;
}

export interface StandardSummary {
  readonly standardType: StandardTypeFilter;
  readonly codeType: StandardCodeType | string;
  readonly specialtyType?: SpecialtyType;
  readonly code: string;
  readonly apiCode: string;
  readonly fullCode?: string;
  readonly name: string;
  readonly version?: string;
  readonly updateDate?: string;
  readonly sourceUrl: string;
  readonly parentPath: readonly string[];
  readonly confidence: ConfidenceLabel;
  readonly reason: readonly string[];
}

export interface StandardSection {
  readonly sort: number;
  readonly title: string;
  readonly level?: number;
  readonly label: string;
  readonly html: string;
  readonly text: string;
}

export interface StandardDocument extends Omit<StandardSummary, "reason" | "confidence"> {
  readonly sections: readonly StandardSection[];
  readonly confidence: ConfidenceLabel;
}

export interface SearchStandardInput {
  readonly query: string;
  readonly standardType?: StandardTypeFilter;
  readonly specialtyType?: SpecialtyTypeFilter;
  readonly projectType?: ProjectType;
  readonly workType?: WorkType;
  readonly limit?: number;
}

export interface FindClauseInput extends SearchStandardInput {
  readonly standardCode?: string;
}

export interface ClauseEvidence {
  readonly standardType: StandardTypeFilter;
  readonly codeType: StandardCodeType | string;
  readonly specialtyType?: SpecialtyType;
  readonly code: string;
  readonly apiCode: string;
  readonly name: string;
  readonly updateDate?: string;
  readonly version?: string;
  readonly sourceUrl: string;
  readonly sectionTitle: string;
  readonly sectionLabel: string;
  readonly sectionPath: readonly string[];
  readonly text: string;
  readonly confidence: ConfidenceLabel;
  readonly score: number;
}

export interface LatestCheckResult {
  readonly inputCode: string;
  readonly exists: boolean;
  readonly latestKnown: boolean;
  readonly metadataStatus: "current-metadata-found" | "not-found-in-current-metadata";
  readonly standard?: StandardSummary;
  readonly message: string;
}

export interface StandardDualResult {
  readonly query: string;
  readonly searchedAt: string;
  readonly kdsResults: readonly StandardSummary[];
  readonly kcsResults: readonly StandardSummary[];
  readonly caveat: string;
}

export interface CitationMatch {
  readonly raw: string;
  readonly code: string;
  readonly apiCode: string;
  readonly codeType: StandardCodeType;
  readonly normalized: string;
}

export interface CitationVerification extends CitationMatch {
  readonly exists: boolean;
  readonly standard?: StandardSummary;
  readonly message: string;
}

export interface CheckApplicabilityInput {
  readonly standardCode: string;
  readonly projectType?: ProjectType;
  readonly workType?: WorkType;
  readonly specialtyType?: SpecialtyTypeFilter;
}

export interface ApplicabilityResult {
  readonly standard: StandardSummary;
  readonly requestedProjectType?: ProjectType;
  readonly requestedWorkType?: WorkType;
  readonly projectMatched: boolean;
  readonly workMatched: boolean;
  readonly matchedProjects: readonly ProjectType[];
  readonly matchedWorks: readonly WorkType[];
  readonly reasoning: readonly string[];
  readonly recommendation: string;
  readonly caveat: string;
  readonly confidence: ConfidenceLabel;
}
