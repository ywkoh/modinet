# Security Model (Public)

This document explains the trust boundaries and control points for the public agent automation interface.

---

## 1) Threat Model

The automation API is designed for **trusted companion agents/extensions**, not arbitrary websites.

Primary risks considered:

- Unauthorized caller modifies network behavior.
- Accidental mass edits by buggy automation.
- Rule races between multiple writers.
- Silent policy drift due to stale state.

---

## 2) Access Controls

Agent API access is deny-by-default and requires all of the following:

1. **Feature flag enabled** (`agentApiEnabled=true`)
2. **Shared secret token** (`agentApiToken`)
3. **Caller allowlist** (`agentAllowedExtensionIds`)
4. **Manifest allowlist** (`externally_connectable.ids`)

If any check fails, request is rejected with `UNAUTHORIZED`.

---

## 3) Write Safety Controls

Mutating operations are guarded by optimistic locking:

- Caller must provide `if_match`.
- Token is compared against current `rules_etag`.
- Mismatch returns `ETAG_MISMATCH`.

This prevents stale clients from overwriting newer state.

---

## 4) Least-Privilege Operational Guidance

For production agent deployments:

- Use a dedicated companion extension ID per environment.
- Rotate `agentApiToken` regularly.
- Limit allowed callers to the smallest possible set.
- Keep automation scoped to known rule groups.
- Separate read-only health checks from write-capable workflows.

---

## 5) Auditability Recommendations

The protocol exposes correlation fields to support audits:

- `request_id` for per-call tracing.
- `operation` for action classification.
- `error.code` for incident triage.

Recommended logging tuple:

`timestamp, caller_extension_id, request_id, operation, result, rules_etag_before, rules_etag_after`

---

## 6) Failure Handling Principles

- Fail closed on auth/config errors.
- Prefer explicit, machine-readable error codes over ambiguous messages.
- Never auto-resolve etag conflicts blindly; re-read and re-plan.
- Treat repeated `UNAUTHORIZED`/`VALIDATION_ERROR` as policy issues, not transient errors.

---

## 7) Public Disclosure Notes

Safe to publish:

- Protocol envelopes
- Operation names
- Error classes
- Concurrency model

Do **not** publish:

- Real production tokens
- Internal extension IDs tied to sensitive environments
- Environment-specific rule payloads containing private endpoints



---

## 8) WebSocket Relay-specific Controls

Relay 모드에서는 아래 통제가 추가로 필요합니다.

- `agentRelayEnabled`를 기본 false로 유지
- `agentRelayAllowedOrigins`를 정확한 origin으로만 설정
- relay 페이지에서 사용하는 `auth_token`은 단기 토큰으로 운용
- relay 서버는 메시지 중계만 수행하고 비즈니스 로직을 두지 않기
