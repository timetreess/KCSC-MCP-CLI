# Changelog

## 2.0.0 - Unreleased

This unreleased major version groups the public contract changes made since 1.0.0.

### Breaking

- `get_standard` omits source HTML by default; request `include_html: true` to include it. Its text
  response is now a short status line, while the document is returned once in `structuredContent`.
- `latest_check` no longer returns `latestKnown`, which duplicated `exists` and implied a version
  comparison the API does not provide.
- The package now depends on Zod 4. Consumers using the exported Zod schemas should use Zod 4.

### Added

- Remote Streamable HTTP endpoint (`src/http/handler.ts`, `kcsc-mcp-http`) and Vercel deployment config so the tools can be added to Claude on the web as a custom connector. Each request carries its own KCSC key via `?key=` or the `x-kcsc-api-key` header; keyless requests are rejected with 401.

- `ClauseFinder.findClauseWithDiagnostics()` returns `{ clauses, failures, searchScope, searchedCodes, scopeNote }`.
  `find_clause` reports the same fields, and `kcsc clause` prints the scope note on stderr.
- `StandardDocument.evidenceGaps` lists evidence fields KCSC did not supply (for example a missing
  standard name or revision date).
- `ApplicabilityResult.evidence` reports each matched keyword with where it was found.
- Default 15s per-request deadline (`KcscClient` `requestTimeoutMs`) and caller cancellation via
  `signal`. `KcscClientError.reason` distinguishes http, timeout, cancelled, transport, invalid-json,
  and invalid-response.
- Default 30s total budget for a clause search (`ClauseFinder` `totalTimeoutMs`), so waiting time no
  longer scales with the number of candidates. Candidates left unread are reported in `failures`.
- MCP tools publish real output schemas, so malformed payloads are rejected instead of shipped.
- `get_standard` supports table-of-contents mode and exact section-label filtering.
- `find_clause` has a separate `candidate_limit` so document retrieval is independent from the
  maximum number of returned clauses.
- CLI supports per-command `--help`, `--version`, and `--json`; unknown options return an error.
- `npm run verify:package` verifies the packed artifact's CLI and stdio entry points.

### Changed

- Malformed KCSC responses now raise an error instead of being read as an empty result or a missing document.
- Clause search failure is reported: total retrieval failure errors out, partial failure returns
  `failures` alongside the evidence that did load.
- `원문 직접 근거` is used only when body text, standard name, and revision date are all confirmed;
  otherwise the result is `관련 조항 추론`.
- Superscripts, subscripts, and images survive HTML normalization as `^`, `_`, and `[그림: …]`.
- `kcsc get` prints every clause and reports the clause count instead of silently truncating at 30.
- Candidate discovery expands query synonyms, and single-syllable applicability keywords were removed.
- Concurrent metadata reads share one in-flight `CodeList` request.
- Search ranks standard names above classification paths and ignores generic request words.
- `.env` loading is limited to the package root or a path explicitly selected with `KCSC_ENV_FILE`.
- The CLI and MCP server read their version from `package.json`.

### Fixed

- `sectionPath` could contain empty entries when the first heading had a deep level.
- `check_applicability` responses are shaped correctly in the published schema.
- A clause search could wait indefinitely when several candidate documents each hit the per-request
  deadline.

### Security

- Updated `@modelcontextprotocol/sdk` and Zod, and refreshed transitive dependencies. `npm audit`
  reports no known vulnerabilities in production or development dependencies.

## 1.0.0 - 2026-05-05

Initial open-source release under the MIT License.

### Added

- KCSC OpenAPI client for `CodeList` and `CodeViewer`.
- Standard code parsing for KDS, KCS, and specialty standard families.
- CLI commands: `search`, `searchdual`, `get`, `clause`, `applicable`, `latest`, and `verify`.
- MCP stdio server with read-only tools:
  - `search_standard`
  - `search_standard_dual`
  - `get_standard`
  - `find_clause`
  - `check_applicability`
  - `latest_check`
  - `verify_citation`
- Fixture-based unit tests for core logic.
- Advisory applicability caveats for contract documents, special specifications, owner requirements, and professional engineering review.

### Notes

- Historical version comparison is not included because the currently supported KCSC OpenAPI endpoints do not expose previous document bodies.
- `latest_check` confirms presence in current KCSC metadata only; it does not determine project contractual applicability.
