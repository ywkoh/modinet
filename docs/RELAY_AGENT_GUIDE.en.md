# Relay Agent Guide (Local First)

This guide is for agent developers who want to control ModiNet rules through the Relay path.

## 1) Is Relay usable right now?

Yes, for developer and team workflows.

Current status:
- Good for local debugging and automated rule management.
- Practical for power users and agents.
- Slightly less convenient for non-technical users because a relay page tab must stay open.

## 2) When to use Relay vs Companion Extension

Use Relay when:
- You do not want to build/install a separate companion extension yet.
- You want to connect an external agent process over WebSocket.

Use Companion Extension when:
- You want browser-only packaging and tighter extension-to-extension control.

You do not need both at the same time.

## 3) Architecture in one line

`Agent -> WebSocket relay server -> relay page tab -> ModiNet bridge -> background Agent API`

## 4) Prerequisites

- ModiNet extension installed and enabled.
- This project checked out locally (for relay scripts/pages).
- A fixed token for local use.

## 5) One-time extension setup

Open ModiNet service worker console and run:

```js
chrome.storage.local.set({
  agentApiEnabled: true,
  agentApiToken: "<AGENT_API_TOKEN>",
  agentRelayEnabled: true,
  agentRelayAllowedOrigins: ["http://127.0.0.1:5500"]
});
```

Notes:
- `agentRelayAllowedOrigins` is the exact relay page origin.
- Bridge injection is registered dynamically at runtime from this setting.

## 6) Local start commands

Terminal A:

```bash
RELAY_SHARED_TOKEN=<AGENT_API_TOKEN> npm run relay:server
```

Terminal B:

```bash
npm run relay:page
```

Browser:
- Open `http://127.0.0.1:5500`
- Set:
  - WS URL: `ws://127.0.0.1:8787`
  - Session ID: any value
  - Relay Token: `<AGENT_API_TOKEN>`
  - API Token: `<AGENT_API_TOKEN>`
- Click `Connect`

## 7) Agent message contract (over WebSocket)

Send request payload to relay server:

```json
{
  "request": {
    "request_id": "req-0001",
    "operation": "status",
    "auth_token": "<AGENT_API_TOKEN>",
    "args": {}
  }
}
```

Response forwarded back to agent:

```json
{
  "namespace": "modinet-agent-relay-v1",
  "direction": "extension-to-page",
  "request_id": "req-0001",
  "response": {
    "ok": true,
    "request_id": "req-0001",
    "operation": "status",
    "data": {
      "global_active": true,
      "rule_count": 0,
      "rules_etag": "etag-..."
    }
  }
}
```

## 8) Recommended write workflow for agents

1. `status` (or `rules.list`) to fetch `rules_etag`
2. `rules.create` / `rules.patch` with `args.if_match`
3. On `ETAG_MISMATCH`, re-read state and retry with new etag
4. Verify with `rules.get` or `rules.list`

Important: all write operations require `args.if_match`.

## 9) License policy when creating over 20 rules (applies to agents too)

- The free tier limit is **20 total rules**.
- Agent `rules.create` is enforced by the same license gate as UI.
- If over limit without a valid license, you get `RULE_LIMIT_EXCEEDED`.
- For previously valid license users creating beyond the free limit:
  - License revalidation runs every **7 days**.
  - Transient failures (`network_error`, `gumroad_http_error`) get a **one-day grace**.
  - If transient failure repeats after the grace day, creation is blocked until verification succeeds.
  - If server returns `license_verification_failed`, creation is blocked immediately.

## 10) Minimal debug playbook

1. Health check:
   - relay server process alive
   - relay page connected (`ws.open` in page log)
2. Bridge check:
   - send `bridge.ping` from relay page
3. API check:
   - send `status` with valid token
4. Write check:
   - `status` -> get `rules_etag` -> `rules.create`

## 11) Common errors and fixes

- `AGENT_API_DISABLED`
  - Set `agentApiEnabled: true` in `chrome.storage.local`.
- `AUTH_REQUIRED`
  - Token mismatch or missing `auth_token`.
- `IF_MATCH_REQUIRED`
  - Missing `args.if_match` on write operations.
- `ETAG_MISMATCH`
  - State changed; re-read `status` and retry.
- `RULE_LIMIT_EXCEEDED`
  - Creation over the free limit failed license validation. Validate license and retry.
- `BRIDGE_DISABLED`
  - Set `agentRelayEnabled: true`.
- No response from relay
  - Confirm relay page tab is open and origin matches `agentRelayAllowedOrigins`.

## 12) Practical limitations

- Relay path depends on an active relay page tab.
- This repo provides relay server and page, but does not ship a built-in generic WS client for every agent runtime.
- For large-scale public automation, consider adding a companion extension later.
