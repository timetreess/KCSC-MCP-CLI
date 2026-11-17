# AGENTS.md - KCSC Standards MCP/CLI 사용 지침

이 저장소는 **KCSC Standards MCP/CLI**입니다. 국가건설기준센터(KCSC) OpenAPI에서 `KDS`, `KCS`, 전문시방서의 기준 근거를 조회·검증하기 위한 MCP 서버와 CLI를 제공합니다.

이 문서는 이 레포를 읽는 코딩 AI 에이전트가 **사용자를 대신해 설치하고, MCP에 연결하고, 건설기준 질의에 안전하게 활용하는 방법**을 설명합니다.

---

## 1. 에이전트의 기본 역할

사용자가 이 레포를 설치하거나 활용해 달라고 하면, 에이전트는 다음을 목표로 작업합니다.

1. npm 게시 전에는 저장소를 내려받아 설치하고 빌드한다.
2. 사용자의 MCP 클라이언트에 `kcsc-standards` 서버를 연결한다.
3. `KCSC_API_KEY`를 안전하게 설정하도록 돕는다.
4. 간단한 `kcsc search` 또는 MCP 도구 호출로 연결을 확인한다.
5. 기준 검색·조항 확인·인용 검증 작업에서는 항상 원문 근거와 한계를 함께 제시한다.

이 도구는 전문기술자의 판단을 대체하지 않습니다. 에이전트는 기준 근거를 찾아줄 수 있지만, 최종 적용 여부는 계약문서, 특기시방서, 발주처 요구사항, 현장 조건, 인허가, 전문기술자 검토를 통해 확인해야 한다고 안내해야 합니다.

---

## 2. 설치 절차

### 2.1 저장소에서 설치

```bash
git clone https://github.com/timetreess/KCSC-MCP-CLI.git
cd KCSC-MCP-CLI
npm ci
npm run build
```

현재 `kcsc-standards-mcp` npm 패키지는 게시되지 않았습니다. Node.js `>=20`이 필요합니다. API 키는 저장소 루트 `.env`에 두거나 MCP 프로세스에 환경변수로 전달합니다.

### 2.2 MCP 연결

MCP 클라이언트 설정에서 빌드된 서버를 직접 실행합니다. 경로는 실제 저장소 위치로 바꿉니다.

```json
{
  "mcpServers": {
    "kcsc-standards": {
      "command": "node",
      "args": ["C:/path/to/KCSC-MCP-CLI/dist/src/mcp/server.js"],
      "env": {
        "KCSC_ENV_FILE": "C:/path/to/KCSC-MCP-CLI/.env"
      }
    }
  }
}
```

저장소 루트 `.env` 대신 시스템 환경변수 `KCSC_API_KEY`를 설정해도 됩니다.

직접 CLI를 실행할 때는 `node dist/src/cli/index.js search "터널 방수"`를 사용합니다.

---

## 3. API 키 보안 규칙

KCSC OpenAPI 키는 반드시 환경변수로 다룹니다.

```text
KCSC_API_KEY
```

에이전트는 다음을 지켜야 합니다.

- 실제 API 키를 소스코드에 하드코딩하지 않습니다.
- 실제 API 키를 `README.md`, `AGENTS.md`, issue, PR, commit message에 쓰지 않습니다.
- `.env` 파일을 커밋하지 않습니다.
- `.env` 사용 시 MCP의 `KCSC_ENV_FILE`로 저장소의 설정 파일을 지정합니다. 다른 프로젝트의 `.env`를 자동으로 읽지 않습니다.
- 로그, 테스트 스냅샷, 오류 메시지에 API 키가 노출되지 않게 합니다.
- 기존 환경에 `KCSC_OPENAPI_KEY`, `KCSC_SERVICE_KEY`, `SERVICE_KEY`가 있더라도 사용 설명에서는 `KCSC_API_KEY`를 표준 이름으로 안내합니다.

---

## 4. 어떤 도구를 언제 써야 하나

MCP 서버는 다음 읽기 전용 도구를 제공합니다.

| 도구 | 사용 시점 |
|---|---|
| `search_standard` | 사용자가 주제, 공종, 자연어 질의를 줬고 기준 후보를 찾아야 할 때 |
| `search_standard_dual` | 같은 주제에서 KDS 설계기준과 KCS 표준시방서를 함께 봐야 할 때 |
| `get_standard` | 기준 코드가 있고 원문 섹션, 기준명, 출처 URL을 확인해야 할 때 |
| `find_clause` | 특정 기준 또는 후보 기준 안에서 조항 단위 근거를 찾아야 할 때 |
| `check_applicability` | 프로젝트/공종/세부작업 기준으로 참고용 적용성을 판단해야 할 때 |
| `latest_check` | 기준 코드가 현재 KCSC metadata에 존재하는지 확인해야 할 때 |
| `verify_citation` | AI 답변, 보고서, Markdown 문서의 KDS/KCS 인용을 검증해야 할 때 |

권장 흐름:

1. 코드가 아닌 주제 질의는 `search_standard`부터 사용합니다.
2. 설계와 시공을 모두 봐야 하면 `search_standard_dual`을 사용합니다.
3. 인용하거나 단정하기 전에는 `get_standard` 또는 `find_clause`로 원문을 확인합니다.
4. 사용자가 작성한 보고서나 AI 답변은 `verify_citation`으로 기준 코드 존재 여부를 점검합니다.
5. `latest_check` 결과를 “프로젝트에 적용된다”는 뜻으로 해석하지 않습니다.
6. `check_applicability` 결과는 참고 의견이며, 계약문서 우선순위 판단으로 단정하지 않습니다.

---

## 5. CLI fallback

MCP 연결이 어렵거나 사용자가 터미널 실행을 원하면 CLI를 사용합니다.

```bash
kcsc search "터널 방수"
kcsc search "되메우기 다짐" --project road --work earthwork
kcsc searchdual "터널 방수" --project tunnel --work waterproofing
kcsc get "KDS 11 10 05"
kcsc clause "되메우기 다짐" --code "KCS 11 20 15"
kcsc applicable "KDS 11 10 05" --work geotechnical
kcsc latest "KDS 11 10 05"
kcsc verify ./report.md
kcsc verify --text "KDS 11 10 05에 따른다"
```

로컬 개발 환경에서 실행할 때는 다음을 사용합니다.

```bash
npm install
npm run dev:cli -- search "되메우기 다짐"
npm run dev:mcp
```

---

## 6. 입력 분류값

에이전트는 사용자의 자연어를 다음 enum으로 매핑할 수 있습니다. 확신이 없으면 enum을 생략하고 자연어 query를 유지하세요.

### `standard_type`

- `KDS`
- `KCS`
- `specialty`
- `all`

### `specialty_type`

- `EXCS`
- `KRACS`
- `KRCCS`
- `KWCS`
- `LHCS`
- `NHCS`
- `SMCS`
- `all_specialty`

`specialty_type`은 API의 전문시방서 `codeType` 계열입니다. 발주처 또는 적용 프로젝트와 항상 1:1로 대응한다고 단정하지 마세요.

### `project_type`

- `road`
- `railway`
- `bridge`
- `tunnel`
- `river`
- `dam`
- `port`
- `waterworks`
- `site`
- `building`
- `plant`
- `common`

### `work_type`

- `earthwork`
- `geotechnical`
- `foundation`
- `concrete`
- `steel`
- `temporary`
- `pavement`
- `drainage`
- `waterproofing`
- `seismic`
- `quality_test`
- `measurement`
- `safety`
- `maintenance`

---

## 7. 답변 원칙

건설기준 관련 답변에는 가능한 경우 다음 정보를 포함합니다.

```text
- 기준유형:
- 기준코드:
- 기준명:
- 조항번호 또는 섹션 경로:
- 개정일 또는 update date:
- 원문 일부:
- 적용성 판단:
- 신뢰도:
- 출처 URL:
```

신뢰도 라벨은 다음 세 가지를 사용합니다.

- `원문 직접 근거`: 기준 원문 본문이 확인됨
- `관련 조항 추론`: 직접 문구는 아니지만 관련 조항이 확인됨
- `근거 미확인`: 현재 조회 범위에서 근거를 확인하지 못함

`원문 직접 근거`는 실제 조항 본문, 기준 코드, 기준명, 섹션 경로 또는 label, 개정/update date, 출처 URL이 있을 때만 사용합니다.

---

## 8. 토목 기준 해석 안전장치

에이전트는 다음을 단정하지 않습니다.

- 검색 결과가 없으므로 기준이 없다고 단정하지 않습니다.
- KCSC metadata에 존재하므로 해당 프로젝트에 반드시 적용된다고 단정하지 않습니다.
- 전문시방서가 항상 KCS보다 우선한다고 단정하지 않습니다.
- 기준 원문 없이 조항번호나 기준 문구를 만들어내지 않습니다.
- KCSC OpenAPI가 제공하지 않는 과거 기준 본문 비교를 지원한다고 말하지 않습니다.

특히 `latest_check`와 `check_applicability`를 구분하세요.

- `latest_check`: 현재 KCSC metadata에 기준 코드가 있는지 확인
- `check_applicability`: 프로젝트/공종/세부작업 기준의 참고용 적용성 판단

계약문서상 적용 우선순위는 별도 확인 대상입니다.

---

## 9. KCSC API 참고 사실

이 프로젝트는 우선 다음 KCSC OpenAPI endpoint를 사용합니다.

```text
GET https://kcsc.re.kr/OpenApi/CodeList?key={KCSC_API_KEY}
GET https://kcsc.re.kr/OpenApi/CodeViewer/{Type}/{Code}?key={KCSC_API_KEY}
```

확인된 코드 변환 예시:

- `KDS 11 10 05` → `CodeViewer/KDS/111005`
- `KCS 57 10 05` → `CodeViewer/KCS/571005`

사람이 입력할 수 있는 `KDS-11-10-05`, `KDS_11_10_05`, `KDS111005` 같은 변형은 정규화해서 처리합니다.

---

## 10. 이 레포를 수정해야 하는 경우

사용자가 이 저장소 자체를 개발하라고 요청한 경우에만 코드를 수정합니다. 수정 시 다음을 지키세요.

- TypeScript strict mode를 유지합니다.
- `as any`, `@ts-ignore`, `@ts-expect-error`를 사용하지 않습니다.
- 빈 `catch` 블록을 만들지 않습니다.
- 기준, 조항, 개정이력, source URL을 임의로 만들지 않습니다.
- CLI와 MCP는 같은 core service를 사용해야 합니다.
- 단위 테스트는 live network에 의존하지 않고 fixture를 우선 사용합니다.
- 의미 있는 변경 후 다음 검증을 실행합니다.

```bash
npm run typecheck
npm test
npm run build
```

KCSC live integration test는 `KCSC_API_KEY`가 있고 사용자가 네트워크 호출을 허용한 경우에만 실행합니다.
