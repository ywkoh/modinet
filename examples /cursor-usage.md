# Cursor Usage Guide (Public)

This guide shows how an agent developer can use Cursor (or a similar coding assistant) to work safely with `redirect-rule-manager` protocol artifacts.

---

## 1) Recommended Prompting Pattern

Use a structured prompt with explicit constraints:

```text
Task: Create one delay rule via the ModiNet Agent Protocol.
Constraints:
- Read status first and use rules_etag for writes.
- Use request_id in every call.
- If ETAG_MISMATCH occurs, re-read and retry once.
- Return final JSON transcript only.
```

Why this works:

- It enforces concurrency safety.
- It produces reproducible logs.
- It minimizes accidental destructive actions.

---

## 2) Safe Workflow Template

1. `ping` (liveness)
2. `status` (capabilities + etag)
3. one write (`rules.create` or `rules.patch`) with `if_match`
4. `rules.get` or `rules.list` for verification

Keep each run narrow and observable.

---

## 3) Suggested Guardrails in Cursor Rules

If you maintain a project-level AI rule file, add guardrails like:

- "Never send mutating operations without `if_match`."
- "Always include a deterministic `request_id`."
- "Do not use undocumented operations."
- "Treat `UNAUTHORIZED` and `VALIDATION_ERROR` as hard stops."

---

## 4) Example Agent Prompt (Copy/Paste)

```text
You are operating a rule automation client for ModiNet.

Goal:
- Add a redirect rule from production API to staging API for GET requests only.

Must-follow protocol:
1) Call status and capture rules_etag.
2) Call rules.create with if_match=rules_etag.
3) Verify with rules.get.

Output format:
- Provide a compact JSON array of request/response pairs.

Failure policy:
- On ETAG_MISMATCH: refresh etag and retry once.
- On UNAUTHORIZED or VALIDATION_ERROR: stop and explain.
```

---

## 5) Publishing Checklist

Before copying this content to an external public repo:

- Remove all real tokens/IDs.
- Replace internal hostnames with placeholders.
- Keep examples minimal and non-sensitive.
- Validate that docs match the currently shipped API fields.
