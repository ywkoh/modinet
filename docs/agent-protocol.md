# Agent Protocol (Public)

This document defines a stable, implementation-facing protocol for automation agents that need to read or modify redirect, mock, delay, and header rules in **ModiNet / redirect-rule-manager**.

> Status: Public draft
> Compatibility target: `v1`

---

## 1) Transport and Envelope

Agents communicate with the extension background context using `chrome.runtime.sendMessage`.

### Request envelope

```json
{
  "type": "AGENT_API_REQUEST",
  "request": {
    "request_id": "req-2026-01-01-0001",
    "operation": "rules.list",
    "args": {}
  }
}
```

### Response envelope (success)

```json
{
  "ok": true,
  "request_id": "req-2026-01-01-0001",
  "operation": "rules.list",
  "data": {
    "rules": []
  }
}
```

### Response envelope (error)

```json
{
  "ok": false,
  "request_id": "req-2026-01-01-0001",
  "operation": "rules.list",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Agent API is disabled"
  }
}
```

### Protocol guarantees

- `request_id` is echoed back verbatim for correlation.
- `operation` is echoed back verbatim for observability.
- `ok=false` responses always include an `error.code` and human-readable `error.message`.
- Unknown fields in `args` are ignored unless explicitly rejected by validation logic.

---

## 2) Supported Operations

### Read-only

- `ping`
- `status`
- `rules.list`
- `rules.get`

### Mutating

- `rules.create`
- `rules.patch`
- `rules.enable`
- `rules.disable`
- `global.on`
- `global.off`

> Deletion is intentionally not exposed in the public automation surface.

---

## 3) Concurrency Model (Optimistic Lock)

All mutating operations require an `if_match` token.

1. Call `status` or `rules.list` and read `rules_etag`.
2. Send that value as `args.if_match` in the write request.
3. If state changed, server returns `ETAG_MISMATCH`.

This gives agents deterministic conflict detection and prevents blind overwrites.

---

## 4) Idempotency and Retry Guidance

- Treat reads as safe to retry.
- Treat writes as **conditionally retriable**:
  - Retry on transport failures.
  - Do **not** retry on validation/auth errors without changing input.
  - On `ETAG_MISMATCH`, refresh state and re-plan before retrying.
- Prefer stable external IDs (`rule.id`) to avoid duplicate rule creation.

---

## 5) Error Taxonomy (Public Contract)

The exact list can grow, but agents should handle these classes:

- `INVALID_REQUEST` — malformed envelope or missing required fields.
- `UNAUTHORIZED` — missing/invalid token, disallowed caller, or API disabled.
- `NOT_FOUND` — requested rule/group not found.
- `ETAG_MISMATCH` — optimistic lock conflict.
- `VALIDATION_ERROR` — payload schema failed validation.
- `INTERNAL_ERROR` — unexpected runtime failure.

Agent best practice: branch by `error.code`, log `request_id`, and include last observed `rules_etag`.

---

## 6) Minimal Lifecycle Example

1. `ping` for liveness.
2. `status` for capability + `rules_etag`.
3. `rules.create` with `if_match`.
4. `rules.list` to verify final state.

This sequence is short, debuggable, and safe under concurrent writers.

---

## 7) Versioning and Forward Compatibility

- The protocol is additive-first.
- New operations and fields may be introduced without breaking existing clients.
- Agents should ignore unknown response fields.
- Breaking changes (if ever required) should be released behind a new protocol version.
