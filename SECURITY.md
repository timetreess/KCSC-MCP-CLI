# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

## Reporting a Vulnerability

Please report security vulnerabilities through GitHub Security Advisories:

https://github.com/timetreess/kds/security/advisories/new

If advisories are unavailable, open a private maintainer contact channel before disclosing publicly. Do not include API keys, credentials, or sensitive project documents in public issues.

## Credential Handling

This project requires `KCSC_API_KEY` at runtime. Never commit `.env` files or API keys. If a key is accidentally exposed, revoke or rotate it immediately through the issuing service.
