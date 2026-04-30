# AGENTS.md - KCSC Standards MCP/CLI

This repository implements **KCSC Standards MCP/CLI**, a Korean construction standards reference tool for querying, citing, and validating KDS/KCS standards from the Korea Construction Standards Center (KCSC) OpenAPI.

Read `kcsc-standards-mcp-prd.md` before implementation. The PRD is the product source of truth.

## Product Intent

Build a practical tool for construction engineers and AI agents to retrieve verifiable standards evidence, not a generic keyword search app.

The product must help users:

- find KDS/KCS and specialty standards by code, title, and natural-language topic;
- retrieve original clauses with standard code, standard name, revision date, and source URL;
- check whether cited codes actually exist;
- compare design standards and construction specifications where relevant;
- retrieve and format evidence snippets that can be used in review comments, supervision responses, and technical proposals.

Never present this tool as replacing professional engineering judgment. Applicability judgments must remain recommendations and must include a reminder to verify contract documents, special specifications, and owner requirements.

## Current Project State

This is a greenfield project. At the time this file was created, the repository contains only:

- `kcsc-standards-mcp-prd.md` - product requirements;
- `.env` - local API credential storage.

Do not assume any existing framework, scripts, test runner, or package manager until you inspect the repository again.

## Target Stack

Use TypeScript/Node.js unless the user explicitly changes direction.

Recommended baseline:

- Runtime: Node.js 20+
- Language: TypeScript, strict mode
- MCP SDK: `@modelcontextprotocol/sdk`
- Validation: Zod schemas for every tool input
- CLI: a small Node CLI entrypoint sharing the same domain services as the MCP server
- Tests: Vitest or Node test runner; choose one and document it in `package.json`
- Formatting/linting: keep minimal, but enforce typecheck and tests in scripts

Prefer a shared core library used by both MCP tools and CLI commands. Do not duplicate API, parsing, search, or citation validation logic between MCP and CLI layers.

## Environment and Secrets

The KCSC OpenAPI key must come from an environment variable.

Use this canonical name in code and docs:

```text
KCSC_API_KEY
```

If supporting legacy local `.env` values, normalize them once in config loading. Do not scatter alternate names through the codebase.

Rules:

- Never hard-code API keys.
- Never commit `.env` contents.
- Add `.env.example` when implementing configuration.
- Fail with an actionable error if `KCSC_API_KEY` is missing.
- Redact credentials from logs, test snapshots, error messages, and README examples.

## KCSC API Facts Verified So Far

Use these endpoints first:

```text
GET https://kcsc.re.kr/OpenApi/CodeList?key={KCSC_API_KEY}
GET https://kcsc.re.kr/OpenApi/CodeViewer/{Type}/{Code}?key={KCSC_API_KEY}
```

Observed behavior:

- `CodeList` returns metadata only. Items include `no`, `codeType`, `code`, `fullCode`, `name`, `version`, `updateDate`, `list`, `listParentCodes`, and `message`. In observed responses, `list` is `null` and no `contents` field exists.
- `CodeViewer` returns detailed document content for valid code/type pairs. The detail body is in `list[]`, where each entry has fields such as `sort`, `title`, `level`, `label`, and HTML `contents`.
- Observed `CodeList` `codeType` values include national standards (`KDS`, `KCS`) and specialty standard families (`EXCS`, `KRACS`, `KRCCS`, `KWCS`, `LHCS`, `NHCS`, `SMCS`). Treat `specialty_type` as the API `codeType` family for specialty standards, not as a guaranteed one-to-one issuer/owner field.
- KDS example verified: `KDS 11 10 05` -> API path `CodeViewer/KDS/111005`, name `지반 설계 일반`, version `2025`.
- KCS example verified: `KCS 57 10 05` -> API path `CodeViewer/KCS/571005`, name `상수도공사 공통사항`, version `2017`.

Code conversion rule:

- Human code `KDS 11 10 05` maps to API type `KDS`, code `111005`.
- Human code `KCS 57 10 05` maps to API type `KCS`, code `571005`.

Implement robust parsing for variants like `KDS 11 10 05`, `KDS-11-10-05`, `KDS_11_10_05`, and `KDS111005`.

## MVP Scope and Priority

Follow the PRD release plan, but implement in thin, testable slices.

### v0.1 - Build first

1. KCSC API client
2. Standard code parser/formatter
3. `search_standard`
4. `get_standard`
5. Basic CLI commands: `kcsc search`, `kcsc get`
6. Basic MCP stdio server

### v0.2 - Then add

1. `find_clause`
2. `latest_check`
3. `verify_citation`
4. Project/work classification presets

### v1.0 - Open-source release

1. KDS/KCS simultaneous lookup
2. Advisory `check_applicability`
3. MIT license, README, tests, package metadata, and GitHub-ready documentation

Future proposal/report evidence review workflows should use only verified snippets and remain evidence-first.

Do not add answer-drafting features unless the PRD is explicitly changed. Keep the product evidence-first: retrieve, verify, classify, and format standards evidence rather than generating final response prose.

## MCP Tool Design

Use the MCP SDK `McpServer` and `server.registerTool(...)` pattern.

Tool names must match the PRD and use snake_case:

- `search_standard`
- `search_standard_dual`
- `get_standard`
- `find_clause`
- `check_applicability`
- `latest_check`
- `verify_citation`

Every MCP tool must have:

- concise description;
- Zod `inputSchema` with `.describe()` on every field;
- structured result shape where practical;
- text output suitable for an LLM to quote;
- `readOnlyHint: true` annotation because these tools should not mutate external state.

Tool errors should usually return an MCP tool result with `isError: true`, not crash the server. Error messages must tell the agent how to recover, for example: invalid code format, missing API key, KCSC returned empty document, or unsupported standard type.

The server-level `instructions` field should guide agents to:

1. call `search_standard` before `get_standard` when a user provides a topic instead of a code;
2. call `get_standard` before making a citation claim;
3. call `verify_citation` for generated reports or Markdown documents;
4. include source URL, revision date, and confidence level in answers;
5. treat applicability as advisory, not final engineering approval.

`search_standard` inputs should follow the PRD taxonomy:

- `standard_type`: `KDS`, `KCS`, `specialty`, or `all`;
- `specialty_type`: optional specialty family filter for `EXCS`, `KRACS`, `KRCCS`, `KWCS`, `LHCS`, `NHCS`, `SMCS`, or `all_specialty`;
- `project_type`: user-friendly project preset mapped to API `listParentCodes` branches and keywords;
- `work_type`: search/ranking heuristic, not a guaranteed native API hierarchy.

## CLI Design

The CLI should mirror MCP capabilities and call the same service functions.

Required command shape from the PRD:

```bash
kcsc search "터널 방수"
kcsc search "되메우기 다짐" --project road --work earthwork
kcsc get "KCS 57 10 05"
kcsc clause "교좌장치 설치 기준" --project bridge
kcsc latest "KDS 11 10 05"
kcsc verify ./report.md
```

Start with `search` and `get`; add the others only after their underlying services have tests.

## Suggested Source Layout

When creating the project, prefer this structure unless there is a clear reason to change it:

```text
src/
  api/
    kcsc-client.ts          # HTTP calls, auth, response decoding
    kcsc-types.ts           # Raw API response types
  core/
    code-parser.ts          # KDS/KCS code parsing and formatting
    standards.ts            # get/search orchestration
    clauses.ts              # clause extraction and ranking
    citations.ts            # citation extraction and verification
    applicability.ts        # advisory project/work matching
    formatting.ts           # HTML-to-text and evidence formatting
  mcp/
    server.ts               # McpServer construction and tool registration
    tools.ts                # tool schemas and handlers
  cli/
    index.ts                # command definitions
  config.ts                 # env loading and validation
  index.ts                  # public exports if needed
tests/
  fixtures/
  unit/
  integration/
```

Keep files focused. If a file grows beyond one responsibility, split it before adding more behavior.

## Data Handling and Output Rules

Normalize KCSC HTML `contents` into readable plain text or Markdown.

Preserve these fields whenever available:

- standard type (`KDS`, `KCS`, or `specialty`);
- API `codeType` and specialty family (`specialty_type`) when applicable;
- standard code in human format;
- API code;
- standard name;
- version;
- update date;
- section title;
- clause label;
- original text snippet;
- source URL.

Outputs should follow the PRD principle:

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

Use these confidence labels exactly:

- `원문 직접 근거`
- `관련 조항 추론`
- `근거 미확인`

If a result lacks original clause text, do not label it as `원문 직접 근거`.

## Search and Clause Matching Expectations

Start simple and transparent.

For MVP search:

- fetch/use `CodeList` metadata;
- match query terms against `code`, formatted code, `name`, and parent category names;
- support `standard_type`, `specialty_type`, `project_type`, and `work_type` filters;
- return ranked candidates with clear reason fields.

Classification rules:

- `specialty` is an umbrella over multiple API `codeType` families, not a single KCSC type.
- `specialty_type` means specialty standard family; do not model it as a pure issuer field because API families can reflect institution, facility type, project type, or construction-work type.
- `project_type` should map to API `listParentCodes` branches where stable, and fall back to Korean keyword matching when specialty family structures differ.
- `work_type` is a transparent heuristic for ranking by parent path, title, standard name, contents, and synonyms. Do not present it as a native KCSC taxonomy unless the API branch directly supports it.
- For `standard_type=all`, search KDS/KCS first for national baseline evidence, then expand to specialty standards when direct evidence is insufficient or the user asks for a specialty family.

Project preset caveats from the PRD:

- `waterworks` should search both water supply and sewer/sewer-pipeline branches where the API separates them.
- `site` may appear more strongly in specialty families such as LHCS/NHCS than in KDS/KCS.
- `port` may need keyword-based matching because a clear KDS/KCS parent branch may not exist.
- `plant` should consider mechanical, electrical, and industrial-environmental facility branches together.
- `common` should include KDS/KCS common sections and specialty common-specification branches.

Search priority:

1. If the user provides an exact standard code, query that `codeType` and API code directly.
2. If `specialty_type` is provided, prioritize that specialty standard family.
3. If `standard_type` is provided, search that standard type first.
4. If `standard_type=all`, search KDS/KCS first, then expand to specialty standards when direct evidence is insufficient.
5. When citing a different specialty family as reference evidence, clearly show the specialty family, standard type, and applicability limitation.

For MVP clause search:

- call `get_standard` for candidate standards;
- normalize each `list[]` item;
- preserve section path, label, and body text together;
- rank by keyword overlap, synonyms, and section context;
- return top snippets with section path and confidence.

Do not claim semantic precision until embeddings, Korean morphological analysis, or a stronger ranking method is actually implemented.

Keep search roles separate:

- `search_standard` uses `CodeList` metadata to find candidate standards.
- `find_clause` uses `CodeViewer` document contents to find clause-level evidence.
- Do not treat a matching title or empty section as direct textual evidence.

Use practical civil-engineering synonym expansion where helpful, especially for Korean field terms such as 되메우기/되메움/backfill, 다짐/compaction/밀도관리, 흙막이/가시설/토류벽, 배수/집수/우수/관거/암거, 연약지반/지반개량/치환/압밀, and 방수/차수/누수/지수.

When normalizing HTML, preserve evidence-critical details where possible: tables, formulas, numbering, units, threshold values, safety factors, tolerances, test frequency, table numbers, and formula numbers. Accuracy as evidence is more important than pretty Markdown.

## Version and Latest Checks

`CodeList` appears to expose current metadata. Use it as the source of truth for latest checks in MVP.

KCSC OpenAPI does not currently expose historical document bodies through the supported `CodeList` and `CodeViewer` endpoints. Do not implement or advertise `compare_versions` unless a verified historical-version endpoint becomes available.

## Citation Verification

`verify_citation` is safety-critical. It should:

- extract `KDS XX XX XX` and `KCS XX XX XX` patterns from text/Markdown;
- normalize code variants;
- check existence through metadata or `CodeViewer`;
- mark nonexistent, malformed, and ambiguous citations;
- include corrected formatting when possible;
- never invent clause text.

## Korean Construction Domain Safety

This tool supports engineering review; it does not make final engineering decisions.

Always preserve caveats for:

- contract documents;
- special specifications;
- project-specific owner requirements;
- local regulations and permits;
- professional engineer review.

When implementing `check_applicability`, phrase conclusions as recommendations, not final approvals.

Separate current/latest status from project applicability:

- `latest_check` confirms current KCSC metadata, not whether the standard is contractually applicable to a project.
- KDS/KCS simultaneous lookup should be topic-based parallel search, not naive one-to-one code-number pairing.
- Absence of search results is not proof that no standard exists. Say the direct basis was not found within the current search scope and recommend checking contract documents, special specifications, or expanded keywords.
- `원문 직접 근거` requires actual clause text plus code, standard name, section path/label, revision or update date, and source URL.

Separate standards hierarchy from contract priority:

- KCS is the national standard construction specification and serves as the baseline for specialty specifications.
- Specialty specifications concretize KCS for particular institutions, facilities, work types, or project conditions.
- Do not state that a specialty specification always overrides KCS unless the project contract documents establish that priority.
- Outputs should distinguish `국가기준상 위계` from `계약문서상 적용 우선순위` when KCS and specialty specifications are both relevant.
- If contract documents, special specifications, or owner requirements are unavailable, explicitly say the priority cannot be finally determined.

## Testing Requirements

Use test-first or test-near development for core logic.

Minimum tests before considering a feature complete:

- code parser handles valid and invalid KDS/KCS forms;
- API client builds correct URLs without leaking keys;
- HTML content is normalized without losing Korean text;
- `CodeList` metadata is parsed;
- `CodeViewer` detail content is parsed;
- citation verifier detects valid, invalid, malformed, and duplicate citations;
- missing API key produces actionable error;
- CLI commands call shared services, not separate logic;
- MCP tool handlers return recoverable errors with `isError: true` for user-correctable issues.

Use fixtures for KCSC responses whenever possible. Do not make unit tests depend on live network calls. Put live API tests behind an explicit integration test command that requires `KCSC_API_KEY`.

## Verification Commands

After implementing scripts, every meaningful change should pass:

```bash
npm run typecheck
npm test
npm run build
```

If integration tests exist:

```bash
npm run test:integration
```

Run integration tests only when `KCSC_API_KEY` is present and the user has not asked to avoid network calls.

## Coding Constraints

- No `as any`, `@ts-ignore`, or `@ts-expect-error`.
- No empty catch blocks.
- No fabricated standards, clauses, version history, or source URLs.
- No full standard corpus redistribution unless explicitly allowed by the data provider and project policy.
- No broad abstractions before two real uses exist.
- Keep public interfaces small and documented.
- Prefer explicit types at module boundaries.

## Documentation Requirements

When implementation begins, create or update:

- `README.md` with installation, `.env` setup, CLI examples, and MCP client setup;
- `.env.example` with `KCSC_API_KEY=`;
- CLI help text matching README examples;
- sample MCP client configuration for Claude Desktop, Cursor, and opencode once verified.

## Definition of Done

A feature is done only when:

1. it satisfies the relevant PRD scenario;
2. it uses shared core services for MCP and CLI where applicable;
3. it has unit tests and, if needed, fixture coverage;
4. typecheck, tests, and build pass;
5. outputs include code, name, revision/update date, original snippet when available, confidence, and source URL;
6. limitations are explicit rather than hidden.
