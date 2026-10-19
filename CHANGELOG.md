# Changelog

## Unreleased

Reliability and evidence-integrity work over the 1.0.0 surface. The public CLI commands and MCP tool
names are unchanged; several MCP response payloads gained fields.

### Added

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

### Fixed

- `sectionPath` could contain empty entries when the first heading had a deep level.
- `check_applicability` responses are shaped correctly in the published schema.
- A clause search could wait indefinitely when several candidate documents each hit the per-request
  deadline.

### Security

- Updated `@modelcontextprotocol/sdk` to 1.32.1 and refreshed the lockfile. `npm audit` reports no
  known vulnerabilities in production or development dependencies.

## 1.0.0 - 2026-04-30

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
