import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk's middleware is needed only where the server calls auth() or
// currentUser(): the API routes and the admin pages and their server actions.
// Public pages read the session in the browser, so they skip the proxy and
// are served straight from the CDN. A page that starts calling auth() on the
// server must be added here.
export default clerkMiddleware();

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/trpc/:path*"],
};
