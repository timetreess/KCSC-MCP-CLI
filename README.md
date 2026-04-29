# KCSC Standards MCP/CLI

KCSC Standards MCP/CLI retrieves verifiable evidence from the Korea Construction Standards Center OpenAPI.

## Setup

```bash
npm install
cp .env.example .env
```

Set the API key:

```text
KCSC_API_KEY=your-api-key
```

## CLI

```bash
npm run build
kcsc search "터널 방수"
kcsc get "KDS 11 10 05"
kcsc clause "되메우기 다짐" --code "KCS 11 20 15"
kcsc latest "KDS 11 10 05"
kcsc verify ./report.md
```

During development:

```bash
npm run dev:cli -- search "되메우기 다짐"
npm run dev:cli -- get "KCS 57 10 05"
npm run dev:cli -- clause "되메우기 다짐" --project road --work earthwork
npm run dev:cli -- latest "KDS 11 10 05"
npm run dev:cli -- verify --text "KDS 11 10 05에 따른다"
```

## MCP stdio server

```bash
npm run build
kcsc-mcp
```

The server exposes these read-only tools:

- `search_standard` - search KDS, KCS, and specialty standard metadata.
- `get_standard` - retrieve a standard document with normalized sections.
- `find_clause` - find clause-level evidence from standard contents.
- `latest_check` - check current KCSC metadata for a cited standard code.
- `verify_citation` - extract and verify standard code citations from text.

Latest checks confirm current KCSC metadata only. Project applicability and contract priority still require checking contract documents, special specifications, owner requirements, and professional engineering judgment.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
