const ALLOWED_ORIGINS = ["https://riza.io"];

if (process.env.DEV_DOMAINS) {
  ALLOWED_ORIGINS.push(...process.env.DEV_DOMAINS.split(","));
}

// These allow Riza's marketing website to make cross-origin requests to this backend
export function getCORSHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
