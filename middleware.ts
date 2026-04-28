import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/api/diary", "/api/emotions", "/api/ai"];
const authPaths = ["/auth/signin", "/auth/signup"];

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const path = req.nextUrl.pathname;
  const isProtected = protectedPaths.some((p) => path.startsWith(p));
  const isAuthPage = authPaths.some((p) => path.startsWith(p));

  if (isProtected && !token) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(signIn);
  }
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/journal/:path*", "/auth/:path*", "/api/diary/:path*", "/api/emotions/:path*", "/api/ai/:path*"],
};
