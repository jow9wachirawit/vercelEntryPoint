# Vercel → EC2 Proxy

A minimal Vercel deployment that forwards all traffic to your EC2 instance.

## Setup

1. **Edit `vercel.json`** — replace `YOUR_ELASTIC_IP` with your EC2's Elastic IP address:

   ```json
   {
     "rewrites": [
       {
         "source": "/:path*",
         "destination": "http://3.14.159.26/:path*"
       }
     ]
   }
   ```

2. **Push to GitHub**:

   ```bash
   git add .
   git commit -m "Initial Vercel proxy setup"
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. **Connect to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repo
   - Deploy — no build settings needed

4. You'll get a `yourapp.vercel.app` URL that proxies everything to your EC2.

## How It Works

The `vercel.json` rewrite rule catches every incoming request and forwards it to your EC2 instance, preserving the original path. Vercel acts as a reverse proxy.

## Notes

- Your EC2 security group must allow inbound traffic on the port your app listens on (typically 80 or 443).
- If your EC2 app runs on a non-standard port, include it in the destination: `http://YOUR_ELASTIC_IP:3000/:path*`
- For HTTPS on the EC2 side, change `http://` to `https://` in the destination.
