import { NextRequest, NextResponse } from "next/server";
import { parseTenantFromHost, getBaseDomain } from "@/lib/tenant-parser";

export function middleware(request: NextRequest) {
  // Webhook recebe chamadas diretas da Twilio sem contexto de tenant
  if (request.nextUrl.pathname.startsWith("/api/whatsapp/webhook")) {
    return NextResponse.next();
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const { kind } = parseTenantFromHost(host, getBaseDomain());

  if (kind === "invalid") {
    return Response.json({ error: "Host invalido" }, { status: 400 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
