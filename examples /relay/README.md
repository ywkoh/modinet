# Relay Example

이 예시는 Method 2(WebSocket Relay) 구성을 로컬에서 검증하기 위한 최소 샘플입니다.

## 1) Relay server 실행

```bash
npm i ws
RELAY_SHARED_TOKEN=change-this-token node examples/relay/ws-relay-server.mjs
```

## 2) Relay page 열기

정적 파일 서버에서 `examples/relay/relay.html`을 열고 아래 값을 맞춥니다.

- WS URL: `ws://localhost:8787`
- Session ID: 임의 값
- Token: `change-this-token`
- Target Extension ID: ModiNet extension id

## 3) ModiNet 저장소 설정

DevTools 콘솔 또는 옵션 페이지에서 아래 storage 값을 설정합니다.

```js
chrome.storage.local.set({
  agentApiEnabled: true,
  agentApiToken: 'change-this-modinet-token',
  agentRelayEnabled: true,
  agentRelayAllowedOrigins: ['http://127.0.0.1:5500']
});
```

## 4) Ping 테스트

relay 페이지의 Ping 버튼을 누르면 `bridge.ping` 응답, 이어서 `status` 호출 결과가 로그에 보여야 합니다.

