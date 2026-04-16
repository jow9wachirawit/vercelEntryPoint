export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  const EC2_BASE = "http://44.214.49.8";

  const url = new URL(request.url);
  const targetUrl = `${EC2_BASE}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const fetchOptions = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
    fetchOptions.duplex = "half";
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Bad Gateway", message: error.message }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
