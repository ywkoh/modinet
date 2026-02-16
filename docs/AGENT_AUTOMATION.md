
# ModiNet Agent Automation API

ModiNet now supports a background message API for automation agents.
This is additive and does not change existing UI flows.

## Message format

Send a runtime message with:

```json
{
  "type": "AGENT_API_REQUEST",
  "request": {
    "request_id": "req-20260204-0001",
    "operation": "rules.create",
    "args": {}
  }
}
```

Response:

```json
{
  "ok": true,
  "request_id": "req-20260204-0001",
  "operation": "rules.create",
  "data": {}
}
```

or

```json
{
  "ok": false,
  "request_id": "req-20260204-0001",
  "operation": "rules.create",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "..."
  }
}
```

## Supported operations

- `ping`
- `status`
- `rules.list` (`args.group` optional)
- `rules.get` (`args.id` required)
- `rules.create` (`args.group`, `args.rule`, `args.create_group_if_missing`)
- `rules.patch` (`args.id`, `args.patch`)
- `rules.enable` (`args.id`)
- `rules.disable` (`args.id`)
- `global.on`
- `global.off`

## Security and rollout defaults

Agent API is **disabled by default** and requires all three:

- `agentApiEnabled: true`
- `agentApiToken: "<secret-token>"`
- `agentAllowedExtensionIds: ["<companion-extension-id>"]`

Store these in `chrome.storage.local` before using the API.

Also update `public/manifest.json`:

- `externally_connectable.ids` must include your companion extension ID.
- The shipped placeholder (`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`) is a deny-by-default value.

## Agent rule fields

`rules.create` accepts:

- `rule.id` (string, required) - external rule id for automation
- `rule.name`
- `rule.type` (`mock`, `delay`, `redirect`, `headers`)
- `rule.enabled` (boolean)
- `rule.priority` (number; stored as metadata)
- `rule.match`:
  - `url_pattern` (required)
  - `method`
  - `resource_type`
  - `include_query`
- `rule.action`:
  - mock: `body_mode` (`json`/`text`/`raw`), `body`
  - delay: `delay_ms`
  - redirect: `to_url`
  - headers: `request_headers`, `response_headers`

## Optimistic lock (required for writes)

Write operations require `args.if_match`.

1. Call `status` or `rules.list` and read `rules_etag`
2. Send that value as `args.if_match` in write calls
3. If rules changed in between, API returns `ETAG_MISMATCH`

## Notes

- Rules created by agents are tagged with `agentGroup` and `agentRuleId`.
- Existing manual rules continue to work unchanged.
- Delete is intentionally not exposed in this API.
