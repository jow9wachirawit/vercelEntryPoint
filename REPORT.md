# Development Report: Vercel → EC2 Reverse Proxy

**Date:** April 16, 2026
**Status:** Working

---

## Objective

Deploy a minimal project on Vercel that acts as a reverse proxy, forwarding all traffic from `yourapp.vercel.app` to an EC2 instance at `44.214.49.8`.

---

## Approach Evolution

### Attempt 1 — Static rewrite (Failed)

**Idea:** Use `vercel.json` rewrites to point directly to the EC2 IP.

```json
{
  "rewrites": [{ "source": "/:path*", "destination": "http://44.214.49.8/:path*" }]
}
```

**Result:** Vercel served the `public/index.html` placeholder instead. Static files take priority over rewrites. Even after removing the static file, Vercel's rewrites don't truly proxy to external HTTP URLs — they're designed for internal route mapping.

**Lesson:** Vercel rewrites are not a reverse proxy for external origins.

---

### Attempt 2 — Catch-all serverless function with bracket filename (Failed)

**Idea:** Create `api/[...path].js` as a catch-all serverless function.

**Result:** 404 NOT_FOUND. The bracket filename syntax may not have deployed correctly, or the rewrite wasn't matching.

**Lesson:** Simpler filenames are more reliable. Use `api/index.js` with a rewrite rule instead.

---

### Attempt 3 — Edge Runtime function (Failed)

**Idea:** Use Vercel Edge Runtime for lower latency.

```js
export const config = { runtime: "edge" };
```

**Result:** Vercel Edge Runtime blocks `fetch()` calls to raw IP addresses (hostnames only). This is a platform restriction.

**Lesson:** Edge Runtime cannot proxy to IP addresses. Use Node.js runtime.

---

### Attempt 4 — Explicit Node.js runtime declaration (Failed)

**Idea:** Explicitly set the runtime in `vercel.json`:

```json
{ "functions": { "api/index.js": { "runtime": "@vercel/node@3" } } }
```

**Result:** Build error: `Function Runtimes must have a valid version`.

**Lesson:** Don't manually specify the runtime. Vercel auto-detects Node.js for files in the `api/` directory.

---

### Attempt 5 — Node.js function with auto-detected runtime (Partial)

**Idea:** Remove all runtime config, let Vercel auto-detect.

**Result:** 200 OK but `ERR_CONTENT_DECODING_FAILED` in the browser. The proxy was forwarding `content-encoding: gzip` headers, but the body was already decompressed by `fetch()`.

**Lesson:** Strip encoding-related headers when proxying.

---

### Attempt 6 — Final working version (Success)

**Changes applied:**
- Removed `accept-encoding` from outgoing request (EC2 sends uncompressed)
- Stripped `content-encoding`, `content-length`, and `transfer-encoding` from response headers
- Let Vercel auto-detect the Node.js runtime

**Result:** Fully working proxy.

---

## Final Architecture

```
User Browser
    │
    ▼
Vercel (yourapp.vercel.app)
    │  vercel.json rewrites /(.*) → /api
    ▼
api/index.js (Node.js Serverless Function)
    │  fetch() to EC2
    ▼
EC2 (44.214.49.8:80)
    │
    ▼
Response flows back through the same chain
```

---

## Final File Contents

### vercel.json

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

### api/index.js

- Receives all requests via the rewrite rule
- Forwards method, headers, body, path, and query string to EC2
- Strips problematic headers (host, accept-encoding, content-encoding, transfer-encoding, content-length)
- Returns EC2 response to the browser
- Handles both text and binary responses
- Returns 502 with error details if EC2 is unreachable

---

## Issues Encountered and Solutions

| # | Issue | Root Cause | Solution |
|---|-------|-----------|----------|
| 1 | Page stuck on "Proxying to EC2..." | `public/index.html` served instead of rewrite | Deleted static files |
| 2 | 404 NOT_FOUND | Rewrites to external URLs don't proxy | Used serverless function |
| 3 | 404 NOT_FOUND | `[...path].js` filename issue | Switched to `index.js` |
| 4 | IP fetch blocked | Edge Runtime restriction | Switched to Node.js runtime |
| 5 | Build error on runtime version | Invalid `functions` config | Removed explicit runtime config |
| 6 | ERR_CONTENT_DECODING_FAILED | Encoding header mismatch | Stripped encoding headers |

---

## Recommendations

1. **Use a domain name instead of raw IP** — Point a domain to your EC2 and use that in the proxy. This would also allow Edge Runtime if needed in the future.
2. **Add caching headers** — If your EC2 serves static assets, add `Cache-Control` headers to reduce function invocations.
3. **Monitor function usage** — Vercel's free tier has limits on serverless function invocations. Check the dashboard regularly.
4. **Consider environment variables** — Move the EC2 IP to a Vercel environment variable instead of hardcoding it:
   ```js
   const EC2_BASE = process.env.EC2_BASE_URL || "http://44.214.49.8";
   ```
   Set `EC2_BASE_URL` in Vercel dashboard → Settings → Environment Variables.
