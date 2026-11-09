import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Basic cookie-presence protection.
// Real verification happens on the server on every API call.
const authPages = ["/login", "/create-mess"];
const protectedPrefixes = [
  "/dashboard",
  "/manager",
  "/controller",
  "/jorimana",
  "/daily",
  "/bazar",
  "/summary",
  "/members",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = Boolean(req.cookies.get("token"));

  if (hasToken && authPages.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!hasToken && protectedPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/create-mess",
    "/dashboard/:path*",
    "/manager/:path*",
    "/controller/:path*",
    "/jorimana/:path*",
    "/daily/:path*",
    "/bazar/:path*",
    "/summary/:path*",
    "/members/:path*",
    "/notices/:path*",
    "/memories/:path*",
    "/calculator/:path*",
    "/history/:path*",
  ],
};
