# Contributing

Thank you for helping improve KCSC Standards MCP/CLI.

## Development Setup

```bash
git clone https://github.com/timetreess/kds.git
cd kds
npm install
cp .env.example .env
```

Set `KCSC_API_KEY` in `.env` for live API usage. Unit tests use fixtures and do not require network access.

## Scripts

```bash
npm run typecheck
npm test
npm run build
```

Run all three before opening a pull request.

## Pull Request Guidelines

1. Keep changes focused and evidence-oriented.
2. Add or update tests for behavior changes.
3. Do not commit `.env`, API keys, credentials, or proprietary project documents.
4. Preserve engineering caveats: this tool provides standards evidence, not final professional approval.

## Code Constraints

- No `as any`, `@ts-ignore`, or `@ts-expect-error`.
- No empty catch blocks.
- Do not fabricate standards, clauses, version history, or source URLs.
- Keep CLI and MCP behavior backed by shared core services.
