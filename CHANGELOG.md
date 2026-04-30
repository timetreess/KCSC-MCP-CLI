# Changelog

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
