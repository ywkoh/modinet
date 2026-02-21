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
- Keep this allowlist minimal per environment and avoid broad/shared IDs.

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

## Rule limit and license policy (`rules.create`)

- Free tier allows up to **20 total rules**.
- Agent `rules.create` uses the same shared gate as UI flows.
- If the limit is exceeded without a valid license, the API returns:
  - `error.code: "RULE_LIMIT_EXCEEDED"`
- For previously valid license users over the limit:
  - License revalidation runs every **7 days**.
  - On transient verification failures (`network_error`, `gumroad_http_error`), a **one-day grace** is granted.
  - If transient failure repeats after that grace day, new rule creation is blocked until verification succeeds.
  - If the server explicitly returns invalid license (`license_verification_failed`), access is blocked immediately.

## Notes

- Rules created by agents are tagged with `agentGroup` and `agentRuleId`.
- Existing manual rules continue to work unchanged.
- Delete is intentionally not exposed in this API.


## WebSocket Relay mode (Method 2)

이 모드는 웹페이지(`relay.html`)를 브리지로 사용해 Agent 요청을 확장으로 전달합니다.

실전 운영 문서:
- 국문: `docs/RELAY_AGENT_GUIDE.ko.md`
- 영문: `docs/RELAY_AGENT_GUIDE.en.md`

필수 storage 설정:

- `agentApiEnabled: true`
- `agentApiToken: "<secret>"`
- `agentRelayEnabled: true`
- `agentRelayAllowedOrigins: ["https://relay.example.com"]`

`agentRelayAllowedOrigins`에 등록한 origin에 대해서는 bridge content script가 runtime에 자동 등록됩니다.
따라서 relay origin 변경 시 `manifest`를 직접 수정할 필요가 없습니다.

메시지 포맷은 `docs/WEBSOCKET_RELAY.md`를 따르며, 브리지 스크립트는 `src/content/agentRelayBridge.js` 입니다.
