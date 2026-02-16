# Relay External Communication Template

## Release Note Draft

Title: `ModiNet Agent Relay (Beta) 지원`

본문 예시:

- ModiNet은 Agent Automation API에 WebSocket relay 연결 방식을 추가로 지원합니다.
- Relay 모드는 `AGENT_API_REQUEST` 프로토콜을 재사용하며, 기존 UI 사용 흐름은 변경되지 않습니다.
- 보안 기본값은 비활성 상태이며, 운영자가 명시적으로 `agentRelayEnabled`와 허용 origin/token을 설정해야 동작합니다.
- write 작업은 기존과 동일하게 `if_match`(optimistic lock)가 필요합니다.

## README 공개 문구

```md
## Agent Relay (Beta)

ModiNet supports an optional WebSocket relay mode for automation agents.

- Transport: WebSocket relay + relay web page
- Bridge: content/agentRelayBridge.js
- Safety: token auth, origin allowlist, optimistic lock for writes

See `docs/WEBSOCKET_RELAY.md`.
```

## FAQ

Q. Relay가 기본 활성화인가요?
- 아닙니다. 기본 비활성입니다.

Q. 아무 웹사이트에서 제어 가능한가요?
- 아닙니다. `agentRelayAllowedOrigins` allowlist에 있는 origin만 허용됩니다.

Q. 기존 companion extension 기반 자동화와 충돌하나요?
- 아닙니다. 동일한 Agent API를 공유하지만 진입 경로만 다릅니다.

