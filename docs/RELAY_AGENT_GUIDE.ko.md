# Relay 에이전트 가이드 (로컬 우선)

이 문서는 에이전트가 Relay 경로로 ModiNet 룰을 제어할 때 바로 따라할 수 있도록 만든 실전 가이드입니다.

## 1) 지금 Relay 방식, 실사용 가능한가?

네, 개발/팀 워크플로우 기준으로는 충분히 실사용 가능합니다.

현재 판단:
- 로컬 디버깅과 자동 룰 관리에는 적합합니다.
- 파워유저/에이전트 자동화에는 실용적입니다.
- 비개발 사용자에게는 relay 페이지 탭을 열어둬야 해서 약간 번거로울 수 있습니다.

## 2) Relay vs 동반 확장(Companion)

Relay가 맞는 경우:
- 지금은 동반 확장을 별도로 개발/배포하고 싶지 않을 때
- 외부 에이전트 프로세스를 WebSocket으로 붙이고 싶을 때

동반 확장이 맞는 경우:
- 확장-확장 통신으로 더 닫힌 배포를 원할 때

둘 다 동시에 필수는 아닙니다.

## 3) 아키텍처 한 줄 요약

`Agent -> WebSocket relay server -> relay 페이지 탭 -> ModiNet bridge -> background Agent API`

## 4) 준비물

- ModiNet 확장 설치 + 활성화
- 이 저장소 로컬 체크아웃(릴레이 스크립트/페이지 사용)
- 로컬 고정 토큰 1개

## 5) 확장 1회 설정

ModiNet 서비스워커 콘솔에서 실행:

```js
chrome.storage.local.set({
  agentApiEnabled: true,
  agentApiToken: "<AGENT_API_TOKEN>",
  agentRelayEnabled: true,
  agentRelayAllowedOrigins: ["http://127.0.0.1:5500"]
});
```

설명:
- `agentRelayAllowedOrigins`에는 relay 페이지의 정확한 origin을 넣어야 합니다.
- 이 값 기준으로 bridge 주입 대상이 runtime에 동적으로 등록됩니다.

## 6) 로컬 실행 명령

터미널 A:

```bash
RELAY_SHARED_TOKEN=<AGENT_API_TOKEN> npm run relay:server
```

터미널 B:

```bash
npm run relay:page
```

브라우저:
- `http://127.0.0.1:5500` 접속
- 값 설정:
  - WS URL: `ws://127.0.0.1:8787`
  - Session ID: 임의 문자열
  - Relay Token: `<AGENT_API_TOKEN>`
  - API Token: `<AGENT_API_TOKEN>`
- `Connect` 클릭

## 7) 에이전트 메시지 포맷 (WebSocket)

에이전트가 relay 서버로 보내는 요청:

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

에이전트가 받는 응답(릴레이 경유):

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

## 8) 에이전트 권장 쓰기 절차

1. `status`(또는 `rules.list`)로 `rules_etag` 조회
2. `rules.create`/`rules.patch`에 `args.if_match` 포함
3. `ETAG_MISMATCH`면 상태 재조회 후 새 etag로 재시도
4. `rules.get`/`rules.list`로 결과 검증

주의: 모든 쓰기 작업은 `args.if_match`가 필요합니다.

## 9) 20룰 초과 시 라이선스 정책 (Agent 동일 적용)

- 무료 한도는 총 **20개 룰**입니다.
- Agent의 `rules.create`도 UI와 동일한 라이선스 게이트를 사용합니다.
- 한도를 넘고 유효 라이선스가 없으면 `RULE_LIMIT_EXCEEDED`가 반환됩니다.
- 기존 유효 라이선스 사용자의 20룰 초과 생성 시:
  - 라이선스 재검증은 **7일 주기**입니다.
  - `network_error`/`gumroad_http_error` 같은 일시 장애에는 **1일 grace**가 적용됩니다.
  - grace 다음 날에도 검증 실패가 반복되면 생성이 차단됩니다.
  - 서버가 `license_verification_failed`를 반환하면 즉시 차단됩니다.

## 10) 빠른 디버깅 절차

1. Relay 서버 정상 여부 확인
2. relay 페이지 연결 로그(`ws.open`) 확인
3. `bridge.ping`으로 브리지 확인
4. 유효 토큰으로 `status` 호출
5. `status -> etag 확보 -> rules.create` 순서로 쓰기 테스트

## 11) 자주 보는 오류와 대응

- `AGENT_API_DISABLED`
  - `agentApiEnabled: true` 설정
- `AUTH_REQUIRED`
  - `auth_token` 누락/불일치
- `IF_MATCH_REQUIRED`
  - 쓰기 요청에 `args.if_match` 누락
- `ETAG_MISMATCH`
  - 동시 변경 충돌, 상태 재조회 후 재시도
- `RULE_LIMIT_EXCEEDED`
  - 20개 초과 생성 시 라이선스 검증 실패/미보유 상태. 라이선스 확인 후 재시도
- `BRIDGE_DISABLED`
  - `agentRelayEnabled: true` 설정
- 응답이 안 옴
  - relay 페이지 탭이 열려 있는지, origin이 `agentRelayAllowedOrigins`와 일치하는지 확인

## 12) 현실적인 제약

- Relay 방식은 relay 페이지 탭이 살아 있어야 동작합니다.
- 이 저장소는 relay 서버/페이지는 제공하지만, 모든 런타임용 공용 WS 클라이언트까지는 포함하지 않습니다.
- 대규모 배포 자동화가 필요하면 추후 companion extension 추가를 고려하세요.
