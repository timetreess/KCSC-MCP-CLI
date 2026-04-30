# PRD v1.0: KCSC Standards MCP/CLI

## 1. 제품 정의

국가건설기준센터(KCSC)의 설계기준(KDS), 표준시방서(KCS), 전문시방서를 AI가 조회·인용·검증하게 하는 **건설기준 근거 추적 MCP/CLI**입니다.

본 제품은 단순 키워드 검색기가 아니라, 설계·시공 판단에 필요한 **최신 기준 원문, 적용범위, 조항, 개정이력, 인용 검증**을 제공하는 실무형 도구를 목표로 합니다.

---

## 2. 배경 및 문제

건설기준은 KDS, KCS, 전문시방서로 나뉘며 코드 체계와 개정 이력이 복잡합니다. 실무자는 다음 문제를 자주 겪습니다.

- 기준 코드와 기준명을 정확히 모르면 검색이 어렵다.
- 설계기준(KDS)과 시방서(KCS)를 함께 봐야 하는데 따로 확인해야 한다.
- 최신 개정본인지 확인하기 번거롭다.
- AI가 생성한 기준 인용이 실제 존재하는지 검증하기 어렵다.
- 감리·발주처 질의에 답변할 때 원문 근거를 빠르게 붙이기 어렵다.

---

## 3. 제품 목표

AI가 건설기준을 조회할 때 다음을 보장합니다.

1. 관련 기준을 빠르게 찾는다.
2. 최신 개정 여부를 확인한다.
3. 기준 원문과 조항번호를 함께 제공한다.
4. 설계기준과 시방서를 동시에 검토한다.
5. AI 답변의 기준 인용 오류를 탐지한다.
6. 실무 답변서·검토의견 작성에 바로 쓸 수 있는 근거를 제공한다.
7. 정답 문장 생성보다 기준 근거의 출처·위계·적용 한계를 분리해 보여준다.

---

## 4. 핵심 사용자

- 시공사 설계팀
- 현장 공무·공사 담당자
- 기술형입찰·종심제·민자사업 제안팀
- 설계사
- 감리
- 발주처 검토자
- 건설 기준 검토 자동화를 원하는 AI/개발 사용자

---

## 5. 핵심 사용자 시나리오

### 5.1 기준 코드 검색

사용자가 “터널 방수 기준 찾아줘”라고 입력하면 관련 KDS/KCS 후보, 기준명, 개정일, 기준유형을 반환합니다.

### 5.2 조항 단위 근거 추출

사용자가 “되메우기 다짐 기준 알려줘”라고 입력하면 관련 조항 본문, 조항번호, 기준코드, 기준명을 반환합니다.

### 5.3 KDS/KCS 동시 조회

설계 판단에는 KDS, 시공 판단에는 KCS가 필요하므로, 동일 주제에 대해 설계기준과 표준시방서를 함께 조회합니다.

### 5.4 최신본 확인

사용자가 특정 기준 코드나 문서명을 입력하면 현재 기준이 최신본인지 확인합니다.

### 5.5 적용범위 판정

프로젝트 분류, 공종, 세부작업을 기준으로 해당 기준이 현재 상황에 적용 가능한지 판정합니다.

### 5.6 인용 검증

AI 답변이나 보고서 내 `KDS XX XX XX`, `KCS XX XX XX` 인용이 실제 존재하는지 검증합니다.

### 5.7 입찰·제안서 기준 근거 검토

기술제안서 문장별 적용 기준을 매핑하고, 근거 없는 기술 주장이나 잘못된 기준 인용을 표시합니다.

### 5.8 사내 기준 검토 자동화

반복적으로 쓰는 기준을 캐시하거나 즐겨찾기하여 CLI/MCP에서 빠르게 재조회합니다.

---

## 6. MVP 기능

### 6.1 `search_standard`

KDS, KCS, 전문시방서를 통합 검색합니다.

입력 예시:

```json
{
  "query": "터널 방수",
  "standard_type": "KDS | KCS | specialty | all",
  "project_type": "tunnel",
  "work_type": "waterproofing"
}
```

출력 예시:

```json
{
  "standard_code": "KCS XX XX XX",
  "standard_name": "터널 방수 관련 표준시방서",
  "standard_type": "KCS",
  "revision_date": "YYYY-MM-DD",
  "source_url": "https://www.kcsc.re.kr/..."
}
```

### 6.2 `get_standard`

기준 코드 기준으로 기준명, 목차, 본문, 개정일, 출처 URL을 조회합니다.

### 6.3 `find_clause`

자연어 질문에 맞는 조항을 추출합니다.

예시:

```bash
kcsc clause "되메우기 다짐 기준" --project road --work earthwork
```

### 6.4 `check_applicability`

프로젝트 분류, 공종, 세부작업 기준으로 적용 가능한 기준인지 판정합니다.

### 6.5 `latest_check`

특정 기준 코드가 최신본인지 확인합니다.

### 6.6 `verify_citation`

AI 답변이나 Markdown 문서의 기준 코드·조항 인용을 검증합니다.

예시:

```bash
kcsc verify ./answer.md
```

MVP는 질의 답변서 문장을 자동 생성하지 않습니다. 검증 가능한 기준 근거, 조항, 적용 한계, 출처를 제공하는 데 집중합니다.

---

## 7. 분류 프리셋 체계

검색 정확도를 높이기 위해 `기준유형 → 전문시방서 계열(optional) → 프로젝트 분류 → 공종 분류 → 세부작업` 구조를 사용합니다.

KCSC API의 `CodeList`는 `codeType`, `fullCode`, `listParentCodes` 기반의 원본 분류 체계를 제공합니다. 이 제품의 분류 프리셋은 원본 API 분류를 그대로 노출하는 것이 아니라, 실무자가 자연어로 기준을 찾기 쉽게 만드는 검색·랭킹용 매핑 레이어입니다.

### 7.1 기준유형

- KDS: 설계기준
- KCS: 표준시방서
- Specialty: 전문시방서 계열
- All: 전체

`Specialty`는 API의 단일 `codeType`이 아니라 여러 전문시방서 계열을 묶는 상위 개념입니다. 각 계열은 발주처, 기관, 시설 유형, 사업 유형, 공사 유형이 섞여 있는 API 분류축이므로 단순한 발주처 필드로 취급하지 않습니다. 다만 계열명으로 관련 발주처나 적용 프로젝트를 간접 추정할 수 있으므로, 검색 결과에는 전문시방서 계열과 적용성 제한을 함께 표시합니다.

### 7.2 전문시방서 계열

`standard_type`이 `specialty` 또는 `all`인 경우 선택적으로 `specialty_type`을 사용합니다. `specialty_type`은 API의 전문시방서 `codeType` 계열을 의미하며, 발주처명과 1:1로 대응한다고 가정하지 않습니다.

- EXCS: 고속도로공사 전문시방서 계열(API `codeType`: EXCS)
- KRACS: 철도건설공사 전문시방서 계열(API `codeType`: KRACS)
- KRCCS: 농업생산기반시설 전문시방서 계열(API `codeType`: KRCCS)
- KWCS: 수자원공사(K-water) 전문시방서 계열(API `codeType`: KWCS)
- LHCS: 일반국도공사 전문시방서 계열(API `codeType`: LHCS)
- NHCS: 한국토지주택공사(LH) 전문시방서 계열(API `codeType`: NHCS)
- SMCS: 서울시 전문시방서 계열(API `codeType`: SMCS)
- all_specialty: 전체 전문시방서 계열

각 `specialty_type`의 공식 명칭과 설명은 KCSC API metadata 또는 공식 기준 표기를 우선한다.

전문시방서 계열이 지정된 경우 해당 `specialty_type`을 우선 검색합니다. 계열이 지정되지 않은 경우 KDS/KCS를 먼저 확인하고, 원문 근거가 부족하면 전체 전문시방서를 확장 검색합니다.

### 7.3 프로젝트 분류

프로젝트 분류는 API의 `listParentCodes` branch와 매핑합니다. KDS/KCS에서는 비교적 안정적으로 매핑되지만, 전문시방서는 계열별 분류 체계가 다를 수 있으므로 동일 키워드와 parent path를 함께 사용합니다.

- road: 도로
- railway: 철도
- bridge: 교량
- tunnel: 터널
- river: 하천
- dam: 댐
- port: 항만
- waterworks: 상하수도
- site: 단지·택지
- building: 건축
- plant: 플랜트
- common: 공통

매핑 유의사항:

- `waterworks`는 API에서 상수도와 하수도/하수관로가 분리될 수 있으므로 두 계열을 함께 검색합니다.
- `site`는 KDS/KCS보다 LHCS, NHCS 등 전문시방서 계열에서 더 강하게 나타날 수 있습니다.
- `port`는 KDS/KCS 원본 branch에서 명확하지 않을 수 있으므로 관련 키워드 기반 검색을 병행합니다.
- `plant`는 기계설비, 전기설비, 산업환경설비 계열을 함께 고려합니다.
- `common`은 KDS/KCS의 공통편과 전문시방서 공통시방서 계열을 함께 고려합니다.

### 7.4 공종 분류

공종 분류는 API 원본 계층과 1:1로 일치하는 고정 분류가 아니라 검색·랭킹 보조 프리셋입니다. KCS는 공사 중심이라 공종 분류와 비교적 잘 맞지만, KDS는 설계 분야 중심이므로 프로젝트 branch와 조합하여 해석합니다.

- earthwork: 토공
- geotechnical: 지반
- foundation: 기초
- concrete: 콘크리트
- steel: 강구조
- temporary: 가설
- pavement: 포장
- drainage: 배수
- waterproofing: 방수
- seismic: 내진
- quality_test: 품질시험
- measurement: 측량
- safety: 안전
- maintenance: 유지관리

공종 분류는 다음 정보를 조합하여 검색합니다.

- API parent path 이름
- 기준명(`name`)
- 조항 제목(`title`)
- 원문 내용(`contents`)
- 동의어 및 실무 표현 키워드

### 7.5 세부작업 예시

세부작업은 고정 enum이 아니라 자유어 키워드입니다. 사용자의 자연어 질의와 함께 기준명, 목차, 원문 내용을 대상으로 랭킹합니다.

- 되메우기
- 흙막이
- 말뚝
- 터널 방수
- 포장 다짐
- 교좌장치 설치
- 신축이음
- 배수관 설치
- 균열 보수
- 콘크리트 타설
- 철근 조립
- 강재 용접
- 품질시험
- 계측관리

### 7.6 검색 우선순위

기본 검색 우선순위는 다음과 같습니다.

1. 사용자가 정확한 기준 코드를 입력한 경우 해당 `codeType`과 코드로 직접 조회합니다.
2. `specialty_type`이 지정된 경우 해당 전문시방서 계열을 우선 검색합니다.
3. 기준 코드가 없고 `standard_type`이 지정된 경우 해당 기준유형을 우선 검색합니다.
4. `standard_type=all`인 경우 KDS/KCS를 먼저 검색하고, 원문 직접 근거가 부족하면 전문시방서로 확장합니다.
5. 다른 전문시방서 계열을 참고하는 경우 결과에 전문시방서 계열, 기준유형, 적용성 제한을 명확히 표시합니다.

---

## 8. CLI 명령 예시

```bash
kcsc search "터널 방수"
kcsc search "되메우기 다짐" --project road --work earthwork
kcsc get "KCS XX XX XX"
kcsc clause "교좌장치 설치 기준" --project bridge
kcsc latest "KDS XX XX XX"
kcsc verify ./report.md
```

---

## 9. MCP Tool Schema 초안

```json
{
  "name": "search_standard",
  "description": "Search Korean construction standards from KCSC.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string"
      },
      "standard_type": {
        "type": "string",
        "enum": ["KDS", "KCS", "specialty", "all"]
      },
      "specialty_type": {
        "type": "string",
        "description": "Optional specialty standard family filter. Used when standard_type is specialty or all. This maps to specialty API codeType values, not necessarily a single issuer.",
        "enum": [
          "EXCS",
          "KRACS",
          "KRCCS",
          "KWCS",
          "LHCS",
          "NHCS",
          "SMCS",
          "all_specialty"
        ]
      },
      "project_type": {
        "type": "string",
        "enum": [
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
        ]
      },
      "work_type": {
        "type": "string",
        "enum": [
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
        ]
      }
    },
    "required": ["query"]
  }
}
```

---

## 10. 출력 원칙

모든 답변은 가능한 경우 다음 항목을 포함해야 합니다.

```text
- 기준유형:
- 기준코드:
- 기준명:
- 조항번호:
- 개정일:
- 원문 일부:
- 적용성 판단:
- 신뢰도:
- 출처 URL:
```

### 10.1 신뢰도 등급

- `원문 직접 근거`: 기준 원문에서 직접 확인됨
- `관련 조항 추론`: 직접 문구는 아니지만 관련 조항을 바탕으로 추론
- `근거 미확인`: 기준에서 확인되지 않음

### 10.2 기준 위계와 계약문서 우선순위

KCS는 국가 표준 시공기준으로서 전문시방서 작성의 기본 기준입니다. 전문시방서는 KCS를 바탕으로 특정 기관, 시설물, 공종, 공사 특성에 맞게 구체화한 기준입니다.

다만 실제 프로젝트 적용 여부는 국가 기준 체계만으로 확정하지 않습니다. 계약도서에 포함된 공사시방서, 특기시방서, 발주처 지침, 현장 조건에 따라 적용 우선순위가 달라질 수 있습니다.

MCP와 CLI는 답변 시 다음 두 축을 분리하여 표시합니다.

- 국가기준상 위계: KCS와 전문시방서의 기준 체계상 관계
- 계약문서상 적용 우선순위: 해당 프로젝트 계약도서·특기시방서·발주처 요구사항에 따른 우선 적용 가능성

계약문서 확인 없이 전문시방서가 KCS보다 항상 우선한다고 단정하지 않습니다.

### 10.3 적용 판단과 근거 표시 원칙

`최신 기준`, `프로젝트 적용 기준`, `참고 가능한 최신 기준`은 서로 구분합니다. KCSC API에서 최신본으로 확인되더라도 해당 프로젝트 계약문서에서 반드시 적용되는 기준이라고 단정하지 않습니다.

KDS/KCS 동시 조회는 코드번호의 단순 1:1 짝짓기가 아니라 주제 기반 병렬 검색으로 수행합니다. 설계 판단은 KDS, 시공 판단은 KCS에서 더 직접적인 근거가 나올 수 있으므로 동일 주제에 대해 양쪽 기준을 함께 검토합니다.

`원문 직접 근거`는 기준코드, 기준명, 조항 또는 목차 경로, 실제 본문 문장, 개정일, 출처 URL이 확인되는 경우에만 부여합니다. 제목만 일치하거나 주변 조항만 관련되는 경우에는 `관련 조항 추론`으로 낮춥니다.

검색 결과가 없거나 직접 조항을 찾지 못한 경우 “기준이 없다”고 단정하지 않습니다. “현재 검색 범위에서 직접 근거를 확인하지 못했습니다”, “계약문서·특기시방서·추가 기준 확인이 필요합니다”처럼 검색 한계를 명확히 표시합니다.

이 제품은 답변서 초안을 자동 생성하지 않습니다. 감리·발주처 질의, 제안서, 검토의견에 활용할 수 있는 기준 근거 패키지를 제공하되, 최종 문장 작성과 전문적 판단은 사용자에게 남깁니다.

### 10.4 조항 추출·원문 정규화 원칙

`search_standard`와 `find_clause`의 역할을 분리합니다. `search_standard`는 `CodeList` metadata 기반으로 기준 후보를 찾고, `find_clause`는 `CodeViewer` 원문 기반으로 조항 근거를 찾습니다.

조항 근거는 `목차 경로 + label + 본문` 단위로 관리합니다. `CodeViewer`의 `title`만 조항번호로 사용하지 않고, 상위 목차와 실제 본문을 함께 보존합니다.

자연어 검색 품질을 위해 토목 실무 동의어를 확장 검색에 사용합니다. 예를 들어 되메우기/되메움/backfill, 다짐/compaction/밀도관리, 흙막이/가시설/토류벽, 방수/차수/누수/지수 등을 함께 고려합니다.

HTML 원문 정규화 시 표, 식, 번호, 단위, 기준값, 안전율, 허용오차, 시험 빈도, 표 번호, 식 번호를 가능한 한 보존합니다. 읽기 좋은 Markdown보다 증거로 쓸 수 있는 정확성을 우선합니다.

---

## 11. 성공 기준

### 11.1 기능 성공 기준

- 기준 검색 응답 3초 이내
- KDS/KCS 동시 조회 가능
- 최신본 여부 확인 가능
- 존재하지 않는 기준 코드 탐지 가능
- AI 답변의 잘못된 인용 탐지 가능
- 기준코드, 기준명, 조항번호, 개정일, 출처 URL 표시

### 11.2 사용성 성공 기준

- Claude Desktop, Cursor, opencode에서 MCP 연동 가능
- CLI 단독 사용 가능
- npm 패키지로 설치 가능
- README만 보고 기본 사용 가능
- 실무자가 자연어로 검색해도 기준 후보를 찾을 수 있음

### 11.3 분류 성공 기준

- 프로젝트 분류와 공종 분류를 분리해 검색 가능
- 프로젝트 단위 검색: 도로, 철도, 교량, 터널 등
- 공종 단위 검색: 토공, 지반, 콘크리트, 가설, 포장 등
- 세부작업 키워드와 기준 코드 매핑 가능

---

## 12. 비범위

MVP에서는 다음을 제외합니다.

- 회사별 사내 시방서 업로드 RAG
- PDF 도면 자동 해석
- 법령·고시·계약문서 통합 검토
- 기준 원문 전체 재배포
- 전문 엔지니어 판단을 대체하는 최종 설계 판단

---

## 13. 리스크 및 대응

### 13.1 API 제약

KCSC API 제공 범위, 호출 제한, 본문 제공 여부에 따라 기능 범위가 달라질 수 있습니다.

대응:
- API 응답 구조를 먼저 검증한다.
- 본문 미제공 시 링크 기반 조회와 메타데이터 조회를 분리한다.

### 13.2 인용 오류

AI가 존재하지 않는 조항을 생성할 수 있습니다.

대응:
- 답변 생성보다 검증 도구를 우선한다.
- 조항번호와 원문 일부가 없으면 신뢰도를 낮춘다.

### 13.3 기준 적용성 오판

동일 기준이라도 프로젝트, 발주처, 특기시방서에 따라 적용 여부가 달라질 수 있습니다.

대응:
- “최종 적용 여부는 계약문서·특기시방서·발주처 지침 확인 필요” 문구를 포함한다.
- 적용성 판단은 확정이 아니라 후보 기준 추천으로 제한한다.

---

## 14. 릴리즈 계획

### v0.1

- KCSC API 연결
- 기준 검색
- 기준 상세 조회
- CLI 기본 명령
- MCP 서버 기본 구현

### v0.2

- 조항 추출
- 최신본 확인
- 인용 검증
- 프로젝트/공종 프리셋

### v1.0

- KDS/KCS 동시 조회
- 적용성 advisory check
- npm 배포
- 로컬 stdio MCP 서버
- README, 예제, 테스트셋
- Claude Desktop, Cursor, opencode 등 MCP 클라이언트 연동 가이드
- MIT 라이선스 오픈소스 공개

### 향후 검토

- 입찰·제안서 기준 근거 검토 보강
- 원격 MCP 서버

---

## 15. 제품 한 줄 요약

**KCSC Standards MCP/CLI는 건설기준을 단순 검색하는 도구가 아니라, 설계·시공 판단에 필요한 최신 기준 근거를 추적·검증하는 AI용 실무 도구입니다.**
