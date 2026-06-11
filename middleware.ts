import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("admin_token")?.value;
  const password = process.env.ADMIN_PASSWORD;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!token || !password || token !== password) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/auth") {
    if (!token || !password || token !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
