import { PROJECT_TYPES, WORK_TYPES, type ApplicabilityEvidence, type ApplicabilityResult, type CheckApplicabilityInput, type ConfidenceLabel, type ProjectType, type StandardDocument, type StandardSummary, type WorkType } from "../api/kcsc-types.js";
import { PROJECT_KEYWORDS, StandardsService, WORK_KEYWORDS } from "./standards.js";

const APPLICABILITY_CAVEAT =
  "적용성 판단은 계약문서·특기시방서·발주처 요구사항·전문기술검토 확인이 필요합니다. 본 도구는 참고용이며 최종 공학적 판단을 대체하지 않습니다.";

export class ApplicabilityChecker {
  constructor(private readonly standards: StandardsService) {}

  async check(input: CheckApplicabilityInput): Promise<ApplicabilityResult> {
    const document = await this.standards.getStandard(input.standardCode);
    const evidence = collectEvidence(document);
    const matchedProjects = uniqueCategories(evidence.filter((item) => isProjectCategory(item.category)).map((item) => item.category as ProjectType));
    const matchedWorks = uniqueCategories(evidence.filter((item) => !isProjectCategory(item.category)).map((item) => item.category as WorkType));
    const projectMatched = input.projectType ? matchedProjects.includes(input.projectType) : matchedProjects.length > 0;
    const workMatched = input.workType ? matchedWorks.includes(input.workType) : matchedWorks.length > 0;
    const reasoning = buildReasoning(input, matchedProjects, matchedWorks, evidence);
    const confidence = confidenceFor(input, projectMatched, workMatched, reasoning);

    return {
      standard: toStandardSummary(document, confidence, reasoning),
      ...(input.projectType ? { requestedProjectType: input.projectType } : {}),
      ...(input.workType ? { requestedWorkType: input.workType } : {}),
      projectMatched,
      workMatched,
      matchedProjects,
      matchedWorks,
      evidence,
      reasoning,
      recommendation: buildRecommendation(input, projectMatched, workMatched, matchedProjects, matchedWorks),
      caveat: APPLICABILITY_CAVEAT,
      confidence
    };
  }
}

function isProjectCategory(category: ProjectType | WorkType): category is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(category);
}

function uniqueCategories<T extends string>(categories: readonly T[]): readonly T[] {
  return [...new Set(categories)];
}

function collectEvidence(document: StandardDocument): readonly ApplicabilityEvidence[] {
  const located: { readonly text: string; readonly location: ApplicabilityEvidence["location"]; readonly sectionLabel?: string }[] = [
    { text: document.code, location: "code" },
    { text: document.name, location: "name" },
    ...document.parentPath.map((entry) => ({ text: entry, location: "parentPath" as const })),
    ...document.sections.flatMap((section) => [
      { text: section.title, location: "sectionTitle" as const, sectionLabel: section.label },
      { text: section.label, location: "sectionLabel" as const, sectionLabel: section.label },
      { text: section.text, location: "sectionText" as const, sectionLabel: section.label }
    ])
  ];

  const evidence: ApplicabilityEvidence[] = [];
  const categories: readonly (readonly [ProjectType | WorkType, readonly string[]])[] = [
    ...PROJECT_TYPES.map((project): readonly [ProjectType | WorkType, readonly string[]] => [project, PROJECT_KEYWORDS[project]]),
    ...WORK_TYPES.map((work): readonly [ProjectType | WorkType, readonly string[]] => [work, WORK_KEYWORDS[work]])
  ];
  for (const [category, keywords] of categories) {
    for (const keyword of keywords) {
      const hit = located.find((field) => field.text.toLowerCase().includes(keyword.toLowerCase()));
      if (hit) {
        evidence.push({ category, keyword, location: hit.location, ...(hit.sectionLabel ? { sectionLabel: hit.sectionLabel } : {}) });
      }
    }
  }
  return evidence;
}

function buildReasoning(input: CheckApplicabilityInput, matchedProjects: readonly ProjectType[], matchedWorks: readonly WorkType[], evidence: readonly ApplicabilityEvidence[]): readonly string[] {
  const reasons: string[] = [];
  const cite = (category: ProjectType | WorkType): string => {
    const hit = evidence.find((item) => item.category === category);
    return hit ? `${hit.keyword}(${evidenceLocation(hit)})` : "";
  };

  if (input.projectType) {
    reasons.push(
      matchedProjects.includes(input.projectType)
        ? `요청 프로젝트(${input.projectType}) 관련 키워드가 기준 원문에서 확인되었습니다: ${cite(input.projectType)}.`
        : `요청 프로젝트(${input.projectType})와 직접 일치하는 키워드를 현재 기준 원문 범위에서 확인하지 못했습니다.`
    );
  } else if (matchedProjects.length > 0) {
    reasons.push(`기준 원문에서 관련 프로젝트 유형 후보가 확인되었습니다: ${matchedProjects.map(cite).join(", ")}.`);
  }

  if (input.workType) {
    reasons.push(
      matchedWorks.includes(input.workType)
        ? `요청 공종(${input.workType}) 관련 키워드가 기준 원문에서 확인되었습니다: ${cite(input.workType)}.`
        : `요청 공종(${input.workType})와 직접 일치하는 키워드를 현재 기준 원문 범위에서 확인하지 못했습니다.`
    );
  } else if (matchedWorks.length > 0) {
    reasons.push(`기준 원문에서 관련 공종 후보가 확인되었습니다: ${matchedWorks.map(cite).join(", ")}.`);
  }

  if (reasons.length === 0) {
    reasons.push("현재 기준 원문 범위에서 프로젝트·공종 적용성 키워드를 확인하지 못했습니다.");
  }

  return reasons;
}

function evidenceLocation(evidence: ApplicabilityEvidence): string {
  const label = evidence.sectionLabel ? ` ${evidence.sectionLabel}` : "";
  return `${evidence.location}${label}`;
}

function confidenceFor(input: CheckApplicabilityInput, projectMatched: boolean, workMatched: boolean, reasoning: readonly string[]): ConfidenceLabel {
  if ((input.projectType && !projectMatched) || (input.workType && !workMatched)) {
    return "근거 미확인";
  }
  return reasoning.length > 0 && (projectMatched || workMatched) ? "관련 조항 추론" : "근거 미확인";
}

function buildRecommendation(
  input: CheckApplicabilityInput,
  projectMatched: boolean,
  workMatched: boolean,
  matchedProjects: readonly ProjectType[],
  matchedWorks: readonly WorkType[]
): string {
  if ((input.projectType && !projectMatched) || (input.workType && !workMatched)) {
    return "현재 검색 범위에서 요청 조건과 직접 대응되는 적용성 근거를 확인하지 못했습니다. 계약문서·특기시방서와 추가 기준 검색이 필요합니다.";
  }

  const projectText = matchedProjects.length > 0 ? `프로젝트 후보: ${matchedProjects.join(", ")}` : "프로젝트 후보 미확인";
  const workText = matchedWorks.length > 0 ? `공종 후보: ${matchedWorks.join(", ")}` : "공종 후보 미확인";
  return `${projectText}; ${workText}. 관련 후보로 검토할 수 있으나 계약문서상 적용 우선순위는 별도 확인해야 합니다.`;
}

function toStandardSummary(document: StandardDocument, confidence: ConfidenceLabel, reason: readonly string[]): StandardSummary {
  return {
    standardType: document.standardType,
    codeType: document.codeType,
    ...(document.specialtyType ? { specialtyType: document.specialtyType } : {}),
    code: document.code,
    apiCode: document.apiCode,
    ...(document.fullCode ? { fullCode: document.fullCode } : {}),
    name: document.name,
    ...(document.version ? { version: document.version } : {}),
    ...(document.updateDate ? { updateDate: document.updateDate } : {}),
    sourceUrl: document.sourceUrl,
    parentPath: document.parentPath,
    confidence,
    reason
  };
}
