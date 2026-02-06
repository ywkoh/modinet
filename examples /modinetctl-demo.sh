#!/usr/bin/env bash
set -euo pipefail

# Demo script for a hypothetical CLI wrapper: modinetctl
# Purpose: show an end-to-end, agent-like workflow against the public protocol.

REQUEST_ID_PREFIX="demo-$(date +%Y%m%d-%H%M%S)"

echo "[1/4] Health check"
modinetctl ping --request-id "${REQUEST_ID_PREFIX}-ping"

echo "[2/4] Fetch status and ETag"
ETAG="$(modinetctl status --json | jq -r '.data.rules_etag')"
echo "rules_etag=${ETAG}"

echo "[3/4] Create a delay rule"
modinetctl rules create \
  --request-id "${REQUEST_ID_PREFIX}-create" \
  --if-match "${ETAG}" \
  --group "demo" \
  --rule-json '{
    "id": "demo-delay-checkout",
    "name": "Demo checkout delay",
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
  }'

echo "[4/4] Verify rule exists"
modinetctl rules list --group demo --json | jq '.data.rules[] | select(.id=="demo-delay-checkout")'

echo "Done."
