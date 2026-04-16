# Vercel → EC2 Reverse Proxy

A minimal Vercel project that proxies all incoming traffic to an AWS EC2 instance using a Node.js serverless function.

**Live URL:** `https://vercel-entry-point.vercel.app`
**Proxied Target:** `http://44.214.49.8`

---

## Project Structure

```
├── api/
│   └── index.js        # Serverless proxy function (Node.js runtime)
├── vercel.json          # Rewrite rules — routes all traffic to the function
└── README.md
```

---

## How It Works

1. A user visits `https://vercel-entry-point.vercel.app/any/path`
2. `vercel.json` rewrites the request to the `/api` serverless function
3. `api/index.js` forwards the full request (method, headers, body, path, query) to `http://44.214.49.8/any/path`
4. The EC2 response is streamed back to the user through Vercel

Vercel acts as a reverse proxy — the user never sees or connects to the EC2 IP directly.

---

## Setup Guide (From Scratch)

### Prerequisites

- A GitHub account
- A [Vercel](https://vercel.com) account (free tier works)
- An AWS EC2 instance with an Elastic IP and a running web application

### Step 1 — Clone or Create the Repo

```bash
git clone https://github.com/YOUR_USER/vercel-entry-point.git
cd vercel-entry-point
```

### Step 2 — Set Your EC2 IP

Open `api/index.js` and replace the IP on this line:

```js
const EC2_BASE = "http://44.214.49.8";
```

with your own EC2 Elastic IP. If your app runs on a specific port:

```js
const EC2_BASE = "http://YOUR_ELASTIC_IP:3000";
```

### Step 3 — Push to GitHub

```bash
git add .
git commit -m "Vercel proxy setup"
git push -u origin main
```

### Step 4 — Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your GitHub repo
3. **Framework Preset:** select **Other** (no framework)
4. Leave Build Command and Output Directory **empty**
5. Click **Deploy**

### Step 5 — Verify

Visit `https://your-project.vercel.app` — you should see your EC2 app's response.

---

## EC2 Requirements

Your EC2 instance must be reachable from the internet:

| Setting                  | Value                          |
| ------------------------ | ------------------------------ |
| Elastic IP               | Assigned and associated        |
| Security Group — Inbound | Port 80 (or your app port) open to `0.0.0.0/0` |
| App running              | Listening on `0.0.0.0` (not `127.0.0.1`) |

If your app only binds to `localhost` / `127.0.0.1`, external traffic (including Vercel) cannot reach it. Make sure it listens on `0.0.0.0`.

---

## Customization

### Use a Custom Domain

1. In Vercel dashboard → **Settings → Domains**
2. Add your domain (e.g. `app.example.com`)
3. Update DNS with the records Vercel provides
4. Vercel handles SSL automatically

### HTTPS to EC2

If your EC2 has an SSL certificate:

```js
const EC2_BASE = "https://YOUR_ELASTIC_IP";
```

### Specific Port

```js
const EC2_BASE = "http://YOUR_ELASTIC_IP:8080";
```

---

## Troubleshooting

| Problem | Cause | Fix |
| ------- | ----- | --- |
| 404 NOT_FOUND | Function not deployed | Check Vercel dashboard → Functions tab. Ensure `api/index.js` exists |
| 502 Bad Gateway | EC2 unreachable | Check security group, Elastic IP, and that the app is running |
| ERR_CONTENT_DECODING_FAILED | Encoding mismatch | Already handled in code — `accept-encoding` and `content-encoding` headers are stripped |
| Stuck on static page | `public/index.html` exists | Delete any files in `public/` — they override rewrites |
| Edge runtime IP error | Edge blocks raw IPs | Use Node.js runtime (default for `api/` folder), not Edge |

---

## Key Lessons Learned

- Vercel `rewrites` with external HTTP destinations don't work as a true proxy — use a serverless function instead
- Vercel **Edge Runtime** blocks `fetch()` to raw IP addresses — stick with the default **Node.js runtime**
- Static files in `public/` take priority over rewrite rules
- Response encoding headers (`content-encoding`, `transfer-encoding`) must be stripped when proxying to avoid browser decoding errors
