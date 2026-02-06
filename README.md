# ModiNet (Redirect Rule Manager)

A Chrome extension that lets you handle browser network requests with **redirects**, **Mock API responses**, **header modification**, and **delay injection**.

## Key Features

### 1) Redirect
- Redirect requests to a different URL using URL or regex-based matching.
- Supports selecting resource types (script, stylesheet, main_frame, xmlhttprequest, image).

### 2) Mock API
- Mock responses directly in the browser without a server.
- Configure URL pattern, method (ANY/GET/POST/...), query inclusion, and body type (json/text/html/form/raw).
- Returns response body only (status codes/headers are not supported).

### 3) Header Modify
- Supports set/append/remove for request and response headers.
- Supports resource type and method filters.
- Supports query inclusion control (`includeQuery`).
- Some forbidden headers are blocked from being saved at input time.

### 4) Delay
- Delays fetch / XMLHttpRequest requests by a specified duration.
- Supports URL pattern, method, and query inclusion control.
- Does not delay synchronous XHR (`async=false`) and shows a console warning.
- Cancels transmission if `abort()` is called during delay.

### 5) Onboarding / Demo
- Automatically installs sample rules (redirect/mock/delay).
- Test immediately from the demo page.

### 6) Rule Management
- Global toggle to enable/disable all rules.
- Sorting/filtering.
- JSON export/import.

## Quick Start (Development)

```bash
npm install
npm run build
```

After building, load the `dist/` folder in Chrome Extensions via **Load unpacked**.

During development, you can use the script below to preview the UI:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## Usage

### Redirect Rule
1. Options page → Redirect tab
2. Select URL type (URL/Regex)
3. Enter source URL pattern and redirect URL
4. Select resource type and save

### Mock API Rule
1. Options page → Mock tab
2. Configure URL pattern, method, and `includeQuery`
3. Enter body type and response body
4. Save and enable

> Mock works through DNR redirect, so **status codes/headers are not applied**.

### Header Modify Rule
1. Options page → Header tab
2. Configure URL pattern, `includeQuery`, method, and resource type
3. Add request/response headers (set/append/remove)
4. Save and enable

> Forbidden headers (e.g., `cookie`, `set-cookie`, `host`) are blocked from being saved.

### Delay Rule
1. Options page → Delay tab
2. Configure URL pattern, `includeQuery`, method, and delay (ms)
3. Save and enable

> Delay only applies to fetch/XMLHttpRequest.  
> Synchronous XHR is not delayed and triggers a console warning.

## Data Storage
- All rules and settings are stored in `chrome.storage.local`.

## Permissions
- `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`, `storage`, `activeTab`, `scripting`
- `<all_urls>` host permission

## Agent Automation API
- Supports a background message-based automation API.
- Operates separately from existing options/popup features and does not change current user flows.
- Disabled by default; requires token / allowed extension IDs / `if_match` (optimistic locking) configuration.
- See `docs/AGENT_AUTOMATION.md` for detailed specs.

## Limitations / Notes
- Mock API supports **response body only**.
- Delay supports **fetch/XMLHttpRequest only**.
- Header Modify has **restricted headers that cannot be modified**, and saving is blocked at input time.
- Rule count limit applies (20 rules in free version).

## License / Upgrade
- The free version has a **20 dynamic rule limit**.
- A license upgrade is required for more rules.

## Folder Structure
- `src/`: app source
- `public/`: extension resources/manifest
- `dist/`: build output
- `tests/`: tests
