# Runtime contracts

## Search and clause discovery

`search_standard` ranks KCSC CodeList metadata: standard code, name, and classification path. It does not search every document body. Exact standard-code queries return only that code. Generic request words such as `기준` and `찾아줘` do not affect ranking. Name matches rank above classification-path and code-token matches.

`find_clause` reports which documents it searched:

- `standard`: the caller supplied a standard code.
- `candidates`: the service found candidate metadata and read those documents.
- `unresolved`: it found no candidate body to search. An empty clause list in this scope is not evidence that the standard has no relevant clause.

`limit` caps the number of returned clauses. `candidate_limit` separately caps documents inspected; it defaults to 5. A non-empty `failures` list means the result is partial. If all candidate document reads fail, the tool returns an error.

The CLI and MCP server use the same core services. The MCP input uses `standard_code`, `candidate_limit`, and `limit`; the CLI uses `--code`, `--candidate-limit`, and `--limit`.

## Timeouts and cancellation

Each KCSC request has a 15-second deadline that covers both response headers and JSON body parsing. A caller cancellation also stops waiting for the body. `find_clause` has a separate 30-second total budget; candidates not read before the budget expires appear in `failures`.

Timeout, cancellation, transport, HTTP, invalid-JSON, and invalid-response errors remain distinct. A malformed response is not converted into an empty result.

## `get_standard` response

The MCP `get_standard` tool returns section text by default and omits source HTML. `include_html: true` includes original HTML. `include_text: false` returns a table of contents without section bodies. `section_labels` restricts the response to exact section labels.

The MCP text content is a short status line. The section payload appears once in `structuredContent`, avoiding a second full copy of a long standard.

## Evidence and metadata

- `원문 직접 근거` requires body text, a standard name, and a revision date or update date.
- `관련 조항 추론` identifies relevant material without all direct-evidence fields.
- `근거 미확인` means the current search scope did not provide enough evidence.
- `latest_check` confirms presence in current KCSC CodeList metadata. It does not compare historical versions or decide project applicability.
- `check_applicability` is an advisory keyword match. It does not replace contract documents, special specifications, owner requirements, site conditions, or professional review.

The `sourceUrl` field currently points to the KCSC CodeViewer OpenAPI endpoint. It is an API source address, not a promise that the URL opens a human-readable page without authentication.
