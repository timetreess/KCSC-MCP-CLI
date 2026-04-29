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
```

During development:

```bash
npm run dev:cli -- search "되메우기 다짐"
npm run dev:cli -- get "KCS 57 10 05"
```

## MCP stdio server

```bash
npm run build
kcsc-mcp
```

The v0.1 server exposes read-only `search_standard` and `get_standard` tools.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
