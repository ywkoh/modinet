# ModiNet (Redirect Rule Manager)

브라우저에서 네트워크 요청을 **리다이렉트**, **Mock API**, **헤더 수정**, **지연(Delay)** 처리할 수 있는 Chrome 확장 프로그램입니다.

## 주요 기능

### 1) Redirect (리다이렉트)
- URL 또는 정규식 기반으로 요청을 다른 URL로 리다이렉트
- 리소스 타입 선택 지원 (script, stylesheet, main_frame, xmlhttprequest, image)

### 2) Mock API
- 서버 없이 브라우저에서 응답을 목업
- URL 패턴, 메서드(ANY/GET/POST/...), 쿼리 포함 여부, 바디 타입(json/text/html/form/raw) 지정 가능
- 응답 본문만 반환 (상태코드/헤더는 지원하지 않음)

### 3) Header Modify (헤더 수정)
- 요청/응답 헤더의 set/append/remove 지원
- 리소스 타입 및 메서드 필터 지원
- 쿼리 포함 여부(includeQuery) 지원
- 일부 금지 헤더는 입력 시 저장 자체를 차단

### 4) Delay (지연)
- fetch / XMLHttpRequest 요청을 지정 시간만큼 지연
- URL 패턴, 메서드, 쿼리 포함 여부 지원
- 동기 XHR(async=false)은 지연하지 않음 (콘솔 경고 표시)
- 지연 중 abort() 호출 시 전송 취소

### 5) 온보딩/데모
- 예시 룰(리다이렉트/목업/지연) 자동 설치
- 데모 페이지에서 바로 테스트 가능

### 6) 룰 관리
- 룰 전체 활성/비활성 토글
- 정렬/필터
- JSON 내보내기/가져오기

## 빠른 시작 (개발)

```bash
npm install
npm run build
```

빌드 후 `dist/` 폴더를 Chrome 확장 프로그램 관리 페이지에서 **압축해제된 확장 프로그램 로드**로 등록하세요.

개발 중 UI 확인은 아래 스크립트를 사용할 수 있습니다.

```bash
npm run dev
```

테스트 실행:

```bash
npm test
```

## 사용법

### Redirect 룰
1. 옵션 페이지 → Redirect 탭
2. URL 타입(URL/정규식) 선택
3. 원본 URL 패턴과 Redirect URL 입력
4. 리소스 타입 선택 후 저장

### Mock API 룰
1. 옵션 페이지 → Mock 탭
2. URL 패턴, 메서드, includeQuery 설정
3. 바디 타입 및 응답 본문 입력
4. 저장 후 활성화

> Mock은 DNR redirect 방식으로 동작하여 **상태코드/헤더는 적용되지 않습니다.**

### Header Modify 룰
1. 옵션 페이지 → Header 탭
2. URL 패턴, includeQuery, 메서드, 리소스 타입 설정
3. 요청/응답 헤더 추가 (set/append/remove)
4. 저장 후 활성화

> 금지 헤더(예: cookie, set-cookie, host 등)는 입력 시 저장이 차단됩니다.

### Delay 룰
1. 옵션 페이지 → Delay 탭
2. URL 패턴, includeQuery, 메서드, 지연 시간(ms) 설정
3. 저장 후 활성화

> Delay는 fetch/XMLHttpRequest만 지연합니다.  
> 동기 XHR은 지연하지 않으며 콘솔 경고가 표시됩니다.

## 데이터 저장
- 모든 룰과 설정은 `chrome.storage.local`에 저장됩니다.

## 권한
- `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `storage`, `activeTab`, `scripting`
- `<all_urls>` host permission

## Agent 자동화 API
- 백그라운드 메시지 기반 자동화 API를 지원합니다.
- 기존 옵션/팝업 기능과 분리되어 동작하며, 기존 사용자 흐름을 변경하지 않습니다.
- 기본값은 비활성화이며 토큰/허용 extension ID/if_match(낙관적 잠금) 설정이 필요합니다.
- 상세 스펙은 `docs/AGENT_AUTOMATION.md`를 참고하세요.

## 제한 사항 / 주의사항
- Mock API는 **응답 본문만 지원**합니다.
- Delay는 **fetch/XMLHttpRequest**만 지원합니다.
- Header Modify는 **일부 헤더 수정이 금지**되어 있으며, 입력 시 저장이 차단됩니다.
- 규칙 수 제한(무료 버전 20개) 적용

## 라이선스 / 업그레이드
- 무료 버전은 **동적 룰 20개 제한**이 있습니다.
- 더 많은 룰을 쓰려면 라이선스 업그레이드가 필요합니다.

## 폴더 구조
- `src/` : 앱 소스
- `public/` : 확장 리소스/manifest
- `dist/` : 빌드 산출물
- `tests/` : 테스트
