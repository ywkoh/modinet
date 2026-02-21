# Rule Schema (Public)

This document describes the public, agent-facing rule payload used by the automation API.

> Scope: contract for `rules.create`, `rules.patch`, and read responses.

---

## 1) Top-level Rule Shape

```json
{
  "id": "checkout-delay-01",
  "name": "Delay checkout API",
  "type": "delay",
  "enabled": true,
  "priority": 100,
  "match": {
    "url_pattern": "https://api.example.com/checkout/*",
    "method": "POST",
    "resource_type": "xmlhttprequest",
    "include_query": true
  },
  "action": {
    "delay_ms": 1200
  }
}
```

### Required fields

- `id` (string): external stable identifier controlled by the caller.
- `type` (enum): one of `mock`, `delay`, `redirect`, `headers`.
- `match.url_pattern` (string): URL/URL-like pattern the rule applies to.
- `action` (object): shape depends on `type`.

### Recommended fields

- `name` (string): human-readable label.
- `enabled` (boolean): default operational state.
- `priority` (number): tie-break and ordering hint.

---

## 2) Match Object

```json
{
  "url_pattern": "https://api.example.com/*",
  "method": "ANY",
  "resource_type": "xmlhttprequest",
  "include_query": false
}
```

Field notes:

- `url_pattern` (required): matcher pattern used by runtime rule engine.
- `method` (optional): HTTP method or `ANY`.
- `resource_type` (optional): request category (`xmlhttprequest`, `main_frame`, etc.).
- `include_query` (optional, default `false`): whether query string participates in matching.

---

## 3) Action Object by Rule Type

### 3.1 `redirect`

```json
{
  "to_url": "https://staging.example.com/$1"
}
```

- `to_url` (required): destination URL.

### 3.2 `mock`

```json
{
  "body_mode": "json",
  "body": "{\"ok\":true}"
}
```

- `body_mode` (required): `json` | `text` | `raw`.
- `body` (required): serialized response body.

### 3.3 `delay`

```json
{
  "delay_ms": 1500
}
```

- `delay_ms` (required): integer milliseconds, expected non-negative.

### 3.4 `headers`

```json
{
  "request_headers": [
    { "op": "set", "name": "x-env", "value": "staging" }
  ],
  "response_headers": [
    { "op": "remove", "name": "x-powered-by" }
  ]
}
```

- `request_headers` / `response_headers`: arrays of header operations.
- Operation shape:
  - `op`: `set` | `append` | `remove`
  - `name`: header name (case-insensitive)
  - `value`: required for `set` and `append`

---

## 4) Patch Semantics

`rules.patch` is partial by design:

- Only submitted fields are modified.
- Omitted fields remain unchanged.
- Type-incompatible patch attempts return `VALIDATION_ERROR`.

Suggested agent behavior:

1. Read current rule (`rules.get`).
2. Compute minimal patch.
3. Send patch with `if_match`.

---

## 5) Validation Expectations

Agents should pre-validate before sending:

- `id` uniqueness in caller context.
- `type/action` compatibility.
- Required action fields by type.
- Reasonable ranges (e.g., `delay_ms`).
- Header mutation legality for restricted headers.

Pre-validation reduces failed writes and avoids noisy retries.

