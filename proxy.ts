import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk's middleware is needed only where the server calls auth() or
// currentUser(): the API routes and the admin pages and their server actions.
// Public pages read the session in the browser, so they skip the proxy and
// are served straight from the CDN. A page that starts calling auth() on the
// server must be added here.
//
// The public read APIs, /api/feed and /api/search, read no session either.
// Skipping the proxy there means a CDN hit runs no compute at all.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/((?!feed(?:/|$)|search(?:/|$)).*)",
    "/trpc/:path*",
  ],
};
