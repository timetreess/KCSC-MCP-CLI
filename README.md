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

Legacy local key names are normalized to `KCSC_API_KEY` when present: `KCSC_OPENAPI_KEY`, `KCSC_SERVICE_KEY`, and `SERVICE_KEY`.

## CLI

```bash
npm run build
kcsc search "터널 방수"
kcsc searchdual "터널 방수" --project tunnel --work waterproofing
kcsc get "KDS 11 10 05"
kcsc clause "되메우기 다짐" --code "KCS 11 20 15"
kcsc applicable "KDS 11 10 05" --work geotechnical
kcsc latest "KDS 11 10 05"
kcsc verify ./report.md
```

During development:

```bash
npm run dev:cli -- search "되메우기 다짐"
npm run dev:cli -- searchdual "되메우기 다짐" --project road --work earthwork
npm run dev:cli -- get "KCS 57 10 05"
npm run dev:cli -- clause "되메우기 다짐" --project road --work earthwork
npm run dev:cli -- applicable "KDS 11 10 05" --work geotechnical
npm run dev:cli -- latest "KDS 11 10 05"
npm run dev:cli -- verify --text "KDS 11 10 05에 따른다"
```

## MCP stdio server

```bash
npm run build
kcsc-mcp
```

For local testing on Windows, install the package command shims from this repository:

```bash
npm run build
npm install -g .
kcsc --help
```

MCP clients can then launch the server with the generated command shim:

```json
{
  "mcpServers": {
    "kcsc-standards": {
      "command": "C:\\Users\\20240105\\AppData\\Roaming\\npm\\kcsc-mcp.cmd",
      "args": [],
      "env": {
        "KCSC_API_KEY": "your-api-key"
      }
    }
  }
}
```

Quick smoke tests:

```bash
kcsc latest "KDS 11 10 05"
kcsc verify --text "KDS 11 10 05에 따른다"
```

The server exposes these read-only tools:

- `search_standard` - search KDS, KCS, and specialty standard metadata.
- `search_standard_dual` - search KDS design standards and KCS construction specifications in parallel for the same topic.
- `get_standard` - retrieve a standard document with normalized sections.
- `find_clause` - find clause-level evidence from standard contents.
- `check_applicability` - provide advisory project/work applicability guidance without replacing engineering judgment.
- `latest_check` - check current KCSC metadata for a cited standard code.
- `verify_citation` - extract and verify standard code citations from text.

Latest checks confirm current KCSC metadata only. Project applicability and contract priority still require checking contract documents, special specifications, owner requirements, and professional engineering judgment.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
