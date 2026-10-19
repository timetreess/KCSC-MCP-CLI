import type { KcscListItem, KcscViewerItem } from "../../src/api/kcsc-types.js";

export interface SearchEvaluationCase {
  readonly query: string;
  /** Baseline metadata that must be discoverable from `query` alone, without a standard code. */
  readonly metadata: readonly KcscListItem[];
  /** Sections returned for any candidate; the expected clause must appear here. */
  readonly viewer: readonly KcscViewerItem[];
  readonly expectedCode: string;
  readonly expectedText: string;
  /**
   * `metadata` = the standard name or classification path contains the query, so candidate
   * discovery can reach it. `body-only` = the wording exists only in the document body, which
   * metadata ranking cannot see; discovery must then report an unresolved scope instead of an
   * empty evidence list.
   */
  readonly discovery: "metadata" | "body-only";
}

/**
 * Offline evaluation set for `find_clause` discovery without a standard code.
 * Entries are synthetic review fixtures modelled on practitioner phrasing, not KCSC records.
 */
export const searchEvaluationCases: readonly SearchEvaluationCase[] = [
  {
    query: "되메우기 다짐",
    discovery: "metadata",
    expectedCode: "KDS 11 20 15",
    expectedText: "되메우기 재료는 소정의 다짐도를 확보하여야 한다.",
    metadata: [{ codeType: "KDS", code: "112015", name: "되메우기 및 다짐", version: "2024", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "112015", name: "되메우기 및 다짐", version: "2024", list: [{ sort: 1, title: "되메우기", label: "본문", contents: "<p>되메우기 재료는 소정의 다짐도를 확보하여야 한다.</p>" }] }]
  },
  {
    query: "터널 방수",
    discovery: "metadata",
    expectedCode: "KCS 11 10 20",
    expectedText: "터널 방수층은 반드시 설치하여야 한다.",
    metadata: [{ codeType: "KCS", code: "111020", name: "터널 방수공사", version: "2023", listParentCodes: [{ codeType: "KCS", fullCode: "2020", name: "지반공사" }] }],
    viewer: [{ codeType: "KCS", code: "111020", name: "터널 방수공사", version: "2023", list: [{ sort: 1, title: "방수", label: "본문", contents: "<p>터널 방수층은 반드시 설치하여야 한다.</p>" }] }]
  },
  {
    query: "backfill compaction",
    discovery: "metadata",
    expectedCode: "KCS 21 30 10",
    expectedText: "성토 다짐은 층별로 수행한다.",
    metadata: [{ codeType: "KCS", code: "213010", name: "Backfill and compaction works", version: "2022", listParentCodes: [{ codeType: "KCS", fullCode: "2021", name: "Earth works" }] }],
    viewer: [{ codeType: "KCS", code: "213010", name: "Backfill and compaction works", version: "2022", list: [{ sort: 1, title: "Compaction", label: "본문", contents: "<p>성토 다짐은 층별로 수행한다.</p>" }] }]
  },
  {
    query: "말뚝기초",
    discovery: "metadata",
    expectedCode: "KDS 11 50 15",
    expectedText: "말뚝기초의 지지력을 확인한다.",
    metadata: [{ codeType: "KDS", code: "115015", name: "말뚝기초", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "115015", name: "말뚝기초", version: "2025", list: [{ sort: 1, title: "말뚝기초", label: "본문", contents: "<p>말뚝기초의 지지력을 확인한다.</p>" }] }]
  },
  {
    query: "교좌장치",
    discovery: "metadata",
    expectedCode: "KDS 24 14 20",
    expectedText: "교좌장치는 설계 하중을 지지한다.",
    metadata: [{ codeType: "KDS", code: "241420", name: "교좌장치", version: "2024", listParentCodes: [{ codeType: "KDS", fullCode: "1024", name: "교량 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "241420", name: "교좌장치", version: "2024", list: [{ sort: 1, title: "교좌장치", label: "본문", contents: "<p>교좌장치는 설계 하중을 지지한다.</p>" }] }]
  },
  {
    query: "옹벽",
    discovery: "metadata",
    expectedCode: "KDS 11 60 20",
    expectedText: "옹벽은 뒤채움 조건을 확인한다.",
    metadata: [{ codeType: "KDS", code: "116020", name: "옹벽", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "116020", name: "옹벽", version: "2025", list: [{ sort: 1, title: "옹벽", label: "본문", contents: "<p>옹벽은 뒤채움 조건을 확인한다.</p>" }] }]
  },
  {
    query: "신축이음",
    discovery: "metadata",
    expectedCode: "KCS 24 40 15",
    expectedText: "신축이음은 온도에 따른 이동을 고려한다.",
    metadata: [{ codeType: "KCS", code: "244015", name: "교량 신축이음", version: "2023", listParentCodes: [{ codeType: "KCS", fullCode: "2024", name: "교량공사" }] }],
    viewer: [{ codeType: "KCS", code: "244015", name: "교량 신축이음", version: "2023", list: [{ sort: 1, title: "신축이음", label: "본문", contents: "<p>신축이음은 온도에 따른 이동을 고려한다.</p>" }] }]
  },
  {
    query: "연약지반 개량",
    discovery: "metadata",
    expectedCode: "KDS 11 30 10",
    expectedText: "연약지반 개량 방법을 검토한다.",
    metadata: [{ codeType: "KDS", code: "113010", name: "연약지반 개량", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "113010", name: "연약지반 개량", version: "2025", list: [{ sort: 1, title: "연약지반 개량", label: "본문", contents: "<p>연약지반 개량 방법을 검토한다.</p>" }] }]
  },
  {
    query: "계측 계획 수립",
    discovery: "body-only",
    expectedCode: "KDS 11 10 40",
    expectedText: "계측 계획은 준공 후까지 수립한다.",
    metadata: [{ codeType: "KDS", code: "111040", name: "지반설계 편람", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "111040", name: "지반설계 편람", version: "2025", list: [{ sort: 1, title: "준공 후 관리", label: "본문", contents: "<p>계측 계획은 준공 후까지 수립한다.</p>" }] }]
  },
  {
    query: "옹벽 기초 말뚝",
    discovery: "metadata",
    expectedCode: "KDS 11 50 25",
    expectedText: "말뚝기초 설계조건을 확인한다.",
    metadata: [{ codeType: "KDS", code: "115025", name: "말뚝기초", version: "2025", listParentCodes: [{ codeType: "KDS", fullCode: "1011", name: "지반 설계기준" }] }],
    viewer: [{ codeType: "KDS", code: "115025", name: "말뚝기초", version: "2025", list: [{ sort: 1, title: "말뚝기초", label: "본문", contents: "<p>말뚝기초 설계조건을 확인한다.</p>" }] }]
  }
];