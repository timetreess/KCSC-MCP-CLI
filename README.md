# KCSC 건설기준 MCP/CLI

KCSC 건설기준 MCP/CLI는 국가건설기준센터(KCSC) OpenAPI에서 KDS, KCS, 전문시방서의 검증 가능한 기준 근거를 조회하는 도구입니다.

이 도구는 출처 URL, 개정 메타데이터, 신뢰도 라벨, 적용성 한계를 함께 제공해야 하는 건설 실무자와 AI 에이전트를 위해 만들었습니다. 단, 계약문서 검토나 전문기술자의 최종 공학적 판단을 대체하지 않습니다.

## 기능

- KDS, KCS, 전문시방서 메타데이터 검색
- KCSC `CodeViewer` 기반 현행 기준문서 조회
- 기준 원문에서 조항 단위 근거 검색
- 동일 주제에 대한 KDS 설계기준과 KCS 표준시방서 병렬 검색
- 계약문서상 우선순위를 단정하지 않는 프로젝트/공종 적용성 판정(참고용)
- 일반 텍스트나 Markdown 문서의 기준 코드 인용 검증

## 설치

```bash
npm install -g kcsc-standards-mcp
```

로컬 개발 환경에서는 다음처럼 설치합니다.

```bash
git clone https://github.com/timetreess/kds.git
cd kds
npm install
```

## API 키 설정

KCSC OpenAPI 키를 발급받은 뒤 `KCSC_API_KEY` 환경변수로 설정합니다.

```bash
export KCSC_API_KEY=your-api-key
```

또는 로컬 `.env` 파일을 만들어 사용할 수 있습니다.

```bash
cp .env.example .env
```

```text
KCSC_API_KEY=your-api-key
```

기존 로컬 환경에서 쓰던 `KCSC_OPENAPI_KEY`, `KCSC_SERVICE_KEY`, `SERVICE_KEY`도 있으면 `KCSC_API_KEY`로 정규화해서 사용합니다.

`.env` 파일이나 API 키는 절대 커밋하지 마세요.

## CLI 사용법

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

개발 중에는 다음처럼 실행할 수 있습니다.

```bash
npm run dev:cli -- search "되메우기 다짐"
npm run dev:cli -- searchdual "되메우기 다짐" --project road --work earthwork
npm run dev:cli -- get "KCS 57 10 05"
npm run dev:cli -- clause "되메우기 다짐" --project road --work earthwork
npm run dev:cli -- applicable "KDS 11 10 05" --work geotechnical
npm run dev:cli -- latest "KDS 11 10 05"
npm run dev:cli -- verify --text "KDS 11 10 05에 따른다"
```

## MCP stdio 서버

전역 설치 후 MCP 클라이언트에서 다음처럼 서버를 실행할 수 있습니다.

```json
{
  "mcpServers": {
    "kcsc-standards": {
      "command": "kcsc-mcp",
      "args": [],
      "env": {
        "KCSC_API_KEY": "your-api-key"
      }
    }
  }
}
```

`npx`로도 실행할 수 있습니다.

```json
{
  "mcpServers": {
    "kcsc-standards": {
      "command": "npx",
      "args": ["-y", "--package", "kcsc-standards-mcp", "kcsc-mcp"],
      "env": {
        "KCSC_API_KEY": "your-api-key"
      }
    }
  }
}
```

서버는 다음 읽기 전용 도구를 제공합니다.

- `search_standard` - KDS, KCS, 전문시방서 메타데이터 검색
- `search_standard_dual` - 동일 주제에 대해 KDS 설계기준과 KCS 표준시방서를 병렬 검색
- `get_standard` - 정규화된 섹션과 함께 기준문서 조회
- `find_clause` - 기준 원문에서 조항 단위 근거 검색
- `check_applicability` - 전문기술 판단을 대체하지 않는 프로젝트/공종 적용성 판정(참고용)
- `latest_check` - 인용된 기준 코드가 현재 KCSC 메타데이터에 있는지 확인
- `verify_citation` - 텍스트에서 기준 코드 인용을 추출하고 검증

## 범위와 한계

- `latest_check`는 현재 KCSC 메타데이터에 기준이 존재하는지만 확인합니다. 프로젝트 계약상 적용 여부를 판단하지 않습니다.
- 지원 중인 KCSC OpenAPI 엔드포인트가 과거 기준문서 본문을 제공하지 않으므로, 개정 전후 비교 기능은 구현하지 않았습니다.
- 적용성 판단은 참고용입니다. 계약문서, 특기시방서, 발주처 요구사항, 현장 조건, 인허가, 전문기술자 검토를 반드시 별도로 확인해야 합니다.

## 개발 검증

```bash
npm run typecheck
npm test
npm run build
```

npm 배포 전에는 패키지에 포함될 파일을 확인합니다.

```bash
npm pack --dry-run
```

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 보안

[SECURITY.md](SECURITY.md)를 참고하세요.

## 라이선스

MIT 라이선스입니다. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
