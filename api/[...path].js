export default async function handler(req, res) {
  const EC2_BASE = "http://44.214.49.8";

  // Build the target URL from the incoming path and query string
  const path = req.url.replace(/^\/api/, "") || "/";
  const targetUrl = `${EC2_BASE}${path}`;

  try {
    const headers = { ...req.headers };
    // Remove headers that shouldn't be forwarded
    delete headers.host;
    delete headers["content-length"];

    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Forward body for non-GET/HEAD requests
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text") || contentType.includes("json") || contentType.includes("xml")) {
      const text = await response.text();
      res.send(text);
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    }
  } catch (error) {
    res.status(502).json({ error: "Bad Gateway", message: error.message });
  }
}
