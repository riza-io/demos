import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map();

// todo: delete this middleware
function rateLimitMiddleware(request: NextRequest) {
  // Only apply rate limiting to generate-code since it calls claude (expensive)
  if (
    !request.nextUrl.pathname.startsWith("/api/transform-data/generate-code")
  ) {
    return NextResponse.next();
  }

  const ip = request.headers.get("x-forwarded-for") || "0.0.0.0";
  const limit = 20; // Limiting requests to 20 per 10 minutes per IP
  const windowMs = 10 * 60 * 1000; // 10 minutes

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, {
      count: 0,
      lastReset: Date.now(),
    });
  }

  const ipData = rateLimitMap.get(ip);

  if (Date.now() - ipData.lastReset > windowMs) {
    ipData.count = 0;
    ipData.lastReset = Date.now();
  }

  if (ipData.count >= limit) {
    return new NextResponse("Too many requests; try again in 10 minutes", {
      status: 429,
    });
  }

  ipData.count += 1;

  return NextResponse.next();
}

export function middleware(request: NextRequest) {
  const response = rateLimitMiddleware(request);
  return response;
}
