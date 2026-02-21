# ModiNet API Delay Feature

Add **real delays** to API requests without needing a separate server. The delay feature intercepts fetch and XMLHttpRequest calls in the browser and adds configurable delays before making the actual request.

## Features

| Feature                | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| **No Server Required** | Works entirely in the browser using content scripts      |
| **Real API Responses** | Delays the request, then returns the actual API response |
| **Pattern Matching**   | Supports wildcard patterns like `api.example.com/*`      |
| **Easy Configuration** | Simple UI in the extension options page                  |

## How It Works

The delay feature uses a **content script** that intercepts network requests:

1. Content script (`delayInterceptor.js`) is injected into all pages
2. It wraps `window.fetch` and `XMLHttpRequest`
3. When a request matches a delay rule, it waits for the specified time
4. Then makes the actual request and returns the real response

**No server required** - everything runs in the browser!

## Usage

### Via Extension UI

1. Build and load the extension:

   ```bash
   npm run build
   # Load dist/ folder in chrome://extensions
   ```

2. Open extension options page

3. Click the "Delay" tab (지연)

4. Add a delay rule:
   - **Rule Name**: e.g., "Slow API"
   - **URL Pattern**: e.g., `https://api.example.com/*`
   - **Method**: ANY, GET, POST, etc.
   - **Resource Types**: xmlhttprequest, script, etc.
   - **Delay (ms)**: e.g., 5000 (5 seconds)

5. Save and activate the rule

6. Visit a page that makes requests to the matching URL - they will be delayed!

### Via Chrome Storage (Programmatic)

You can also add delay rules programmatically:

```javascript
// Get existing rules
const { rules = [] } = await chrome.storage.local.get("rules");

// Add a delay rule
rules.push({
  id: Date.now(),
  type: "delay",
  ruleName: "Slow API",
  urlFilter: "https://api.example.com/*",
  resourceTypes: ["xmlhttprequest"],
  method: "ANY",
  delayMs: 5000,
  active: true,
});

// Save
await chrome.storage.local.set({ rules });
```

## Examples

### Example 1: Delay all API calls to a specific domain

```
URL Pattern: https://api.example.com/*
Delay: 3000ms
```

All requests to `api.example.com` will be delayed by 3 seconds.

### Example 2: Delay only POST requests

```
URL Pattern: https://api.example.com/users
Method: POST
Delay: 5000ms
```

Only POST requests to `/users` endpoint will be delayed by 5 seconds.

### Example 3: Test slow network conditions

```
URL Pattern: *
Delay: 2000ms
```

All network requests will be delayed by 2 seconds (simulates slow 3G).

## Technical Details

### Content Script Injection

The delay interceptor is injected as a content script at `document_start` to ensure it runs before any page scripts:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/delayInterceptor.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ]
}
```

### Intercepted APIs

- `window.fetch()` - Modern fetch API
- `XMLHttpRequest` - Legacy XHR requests

### Pattern Matching

URL patterns support wildcards:

- `*` matches any characters
- Example: `https://api.example.com/*` matches all paths under that domain

## Troubleshooting

### Delay not working?

1. **Check if rule is active**: Open extension options, verify the rule is enabled
2. **Check URL pattern**: Make sure the pattern matches your request URL
3. **Reload the page**: Content script is injected on page load
4. **Check console**: Look for `[DelayInterceptor]` logs in browser console

### How to disable?

1. Open extension options
2. Find the delay rule
3. Click the toggle to disable it
4. Or delete the rule entirely

## Limitations

- Only works for `fetch()` and `XMLHttpRequest` requests
- Does not delay:
  - Image/CSS/Script tags loaded via HTML
  - WebSocket connections
  - Service Worker requests (in some cases)
- Delay is added **before** the request, not after receiving the response
- Maximum delay: 60 seconds (60000ms)

## Comparison with Mock API

| Feature                   | Delay              | Mock API             |
| ------------------------- | ------------------ | -------------------- |
| Returns real API response | ✅ Yes             | ❌ No (returns mock) |
| Requires server           | ❌ No              | ❌ No                |
| Can modify response       | ❌ No              | ✅ Yes               |
| Adds network delay        | ✅ Yes             | ❌ No                |
| Use case                  | Test slow networks | Test error handling  |
