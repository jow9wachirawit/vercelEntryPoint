export default async function handler(req, res) {
  const EC2_BASE = "http://44.214.49.8";
  const targetUrl = `${EC2_BASE}${req.url}`;

  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];
    // Request uncompressed response from EC2
    delete headers["accept-encoding"];

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Forward response headers, but skip encoding-related ones
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower !== "transfer-encoding" &&
        lower !== "content-encoding" &&
        lower !== "content-length"
      ) {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);

    const contentType = response.headers.get("content-type") || "";
    if (
      contentType.includes("text") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("javascript")
    ) {
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
