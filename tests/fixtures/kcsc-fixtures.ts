import type { KcscListItem, KcscViewerItem } from "../../src/api/kcsc-types.js";

export const codeListFixture: readonly KcscListItem[] = [
  {
    no: 5748,
    codeType: "KDS",
    code: "111005",
    fullCode: "1010111005",
    name: "지반 설계 일반",
    version: "2025",
    updateDate: "2025-12-29T14:48:25.735322",
    list: null,
    listParentCodes: [
      { codeType: "KDS", fullCode: "10", name: "설계기준" },
      { codeType: "KDS", fullCode: "1010", name: "공통편" },
      { codeType: "KDS", fullCode: "101011", name: "지반 설계기준" }
    ],
    message: null
  },
  {
    no: 883,
    codeType: "KCS",
    code: "571005",
    fullCode: "2020571005",
    name: "상수도공사 공통사항",
    version: "2017",
    updateDate: "2018-09-03T16:41:00",
    list: null,
    listParentCodes: [
      { codeType: "KCS", fullCode: "20", name: "표준시방서" },
      { codeType: "KCS", fullCode: "2020", name: "시설물편" },
      { codeType: "KCS", fullCode: "202057", name: "상수도 공사" }
    ],
    message: null
  },
  {
    no: 4401,
    codeType: "EXCS",
    code: "445010",
    fullCode: "EXCS445010",
    name: "고속도로 포장공사",
    version: "2024",
    updateDate: "2024-01-02T00:00:00",
    list: null,
    listParentCodes: [
      { codeType: "EXCS", fullCode: "EXCS44", name: "고속도로공사" },
      { codeType: "EXCS", fullCode: "EXCS4450", name: "포장공사" }
    ],
    message: null
  }
];

export const kdsViewerFixture: readonly KcscViewerItem[] = [
  {
    no: 5748,
    codeType: "KDS",
    code: "111005",
    fullCode: "1010111005",
    name: "지반 설계 일반",
    version: "2025",
    updateDate: "2025-12-29T14:48:25.735322",
    list: [
      { no: 5748, sort: 2, title: "1.1 목적", level: 2, label: "1.1", contents: "<p>1.1 목적</p>" },
      {
        no: 5748,
        sort: 3,
        title: "1.1 목적",
        level: 3,
        label: "(1)",
        contents: "<p>(1)이 기준은 각종 구조물과 시설물의 지반설계를 수행하기 위한 기준이다.</p>"
      },
      {
        no: 5748,
        sort: 74,
        title: "4.4 설계지반정수",
        level: 4,
        label: "본문",
        contents: "<p>설계지반정수 = (평균치)&plusmn;(표준편차) (4.4-1)</p>"
      },
      {
        no: 5748,
        sort: 75,
        title: "4.5 되메우기 및 다짐",
        level: 3,
        label: "(1)",
        contents: "<p>되메우기 재료는 소정의 다짐도를 확보하여야 하며 현장 밀도시험으로 확인한다.</p>"
      }
    ]
  }
];
export const emptyViewerFixture: readonly KcscViewerItem[] = [];
