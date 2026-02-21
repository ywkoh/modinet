# WebSocket Relay Mode (Method 2)

이 문서는 ModiNet의 기존 Agent Automation API를 그대로 사용하면서,
`AI <-> WebSocket <-> relay web page <-> extension` 경로를 붙이는 방법을 설명합니다.

실전 운영 문서:
- 국문: `docs/RELAY_AGENT_GUIDE.ko.md`
- 영문: `docs/RELAY_AGENT_GUIDE.en.md`

## 1) 목표

- 기존 `AGENT_API_REQUEST` 스펙 재사용
- Companion extension 없이 relay 페이지 + content bridge만으로 연결
- 기본값은 비활성(deny-by-default)

## 2) 아키텍처

```text
AI Agent
  <-> WebSocket Relay Server
  <-> relay.html (browser tab)
  <-> window.postMessage
  <-> content/agentRelayBridge.js
  <-> chrome.runtime.sendMessage
  <-> background.js (AGENT API handler)
```

## 3) 보안 게이트

Relay 경로를 열기 전에 아래를 모두 설정해야 요청이 성공합니다.

1. `agentApiEnabled=true`
2. `agentApiToken=<secret>`
3. `agentRelayEnabled=true`
4. `agentRelayAllowedOrigins=["https://relay.example.com"]`

참고:
- `agentAllowedExtensionIds` / `externally_connectable.ids`는 외부 extension 호출 경로용입니다.
- WebSocket relay 경로는 content bridge를 통해 내부 메시지 경로로 들어오므로,
  origin allowlist와 token 통제가 핵심입니다.
- `agentRelayAllowedOrigins` 변경 시 bridge script 주입 대상도 runtime에서 자동 갱신됩니다.

## 3-1) relay 페이지는 어디에 두나?

- `examples/relay/relay.html`은 샘플입니다.
- 개발 환경: `http://127.0.0.1:5500` 같은 로컬 정적 서버에서 열어도 됩니다.
- 운영 환경: `https://your-domain/modinet/relay.html`처럼 직접 운영하는 URL에 올려야 합니다.

중요:
- `agentRelayAllowedOrigins`에는 **페이지의 정확한 origin**만 넣습니다.
- 예: `https://your-domain` 또는 `http://127.0.0.1:5500`

## 3-2) 20개 초과 룰 생성 시 라이선스 게이트

- 무료 한도: 총 20개 룰
- Agent/Relay 경로도 UI와 동일한 라이선스 검사 적용
- 초과 생성 시 라이선스가 유효하지 않으면 `RULE_LIMIT_EXCEEDED` 반환
- 기존 유효 라이선스 사용자는 7일 주기로 재검증
- 재검증 중 일시 장애(`network_error`, `gumroad_http_error`)는 1일 grace 허용
- 서버가 `license_verification_failed`를 반환하면 즉시 차단

## 4) 브리지 메시지 포맷

relay page -> extension:

```json
{
  "namespace": "modinet-agent-relay-v1",
  "direction": "page-to-extension",
  "request": {
    "request_id": "req-2026-02-16-0001",
    "operation": "status",
    "auth_token": "<agentApiToken>",
    "args": {}
  }
}
```

extension -> relay page:

```json
{
  "namespace": "modinet-agent-relay-v1",
  "direction": "extension-to-page",
  "request_id": "req-2026-02-16-0001",
  "response": {
    "ok": true,
    "request_id": "req-2026-02-16-0001",
    "operation": "status",
    "data": {}
  }
}
```

## 5) 운영 체크리스트

1. relay 도메인 고정 (와일드카드 금지)
2. token 주기적 교체
3. relay 탭 닫힘/연결 끊김 시 세션 재협상
4. write 작업은 항상 `if_match` 사용
5. 외부 공지 시 실제 token/운영 extension ID 공개 금지

## 6) 예제 파일

- `examples/relay/relay.html`
- `examples/relay/ws-relay-server.mjs`
- `examples/relay/static-server.mjs`
- `examples/relay/README.md`

로컬 quick start:

```bash
RELAY_SHARED_TOKEN=change-this-token npm run relay:server
npm run relay:page
```
