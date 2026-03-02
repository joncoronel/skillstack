import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/explore"];

function isPublicRoute(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  if (pathname.startsWith("/sign-in")) return true;
  if (pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/stack/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  // Skill detail pages: /:org/:repo/:skillId (3 segments)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 3) return true;
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isLoggedIn = !!sessionCookie;

  // Redirect signed-in users away from auth pages
  if (isAuthRoute(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect non-public routes
  if (!isPublicRoute(pathname) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
