import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED } from "./lib/constants";

// NOTE: have to have the "/:path*" here since NextJS doesn't allow any real JS to
// be run before the config is defined e.g. if we try and do a .map it will complain
export const config = {
  matcher: [
    "/admin/groups/:path*",
    "/admin/performance/usage/:path*",
    "/admin/performance/query-history/:path*",
    "/admin/whitelabeling/:path*",
    "/admin/performance/custom-analytics/:path*",
    "/admin/standard-answer/:path*",
    "/assistants/stats/:path*",

    // Cloud only
    "/admin/billing/:path*",
  ],
};

// removes the "/:path*" from the end
const stripPath = (path: string) =>
  path.replace(/(.*):\path\*$/, "$1").replace(/\/$/, "");

const strippedEEPaths = config.matcher.map(stripPath);

export async function middleware(request: NextRequest) {
  if (SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    const pathname = request.nextUrl.pathname;

    // Check if the current path is in the eePaths list
    if (strippedEEPaths.some((path) => pathname.startsWith(path))) {
      // Add '/ee' to the beginning of the pathname
      const newPathname = `/ee${pathname}`;

      // Create a new URL with the modified pathname
      const newUrl = new URL(newPathname, request.url);

      // Rewrite to the new URL
      return NextResponse.rewrite(newUrl);
    }
  }
  const url = request.nextUrl.clone();
  const tokenInfo = url.searchParams.get("tokenInfo");
  console.log("tokenInfo",tokenInfo)
  // ✅ Token logic
  if (tokenInfo) {
    const res = NextResponse.next();
    res.cookies.set("tokenInfo", tokenInfo, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // strip token from URL so it doesn't stay visible
    url.searchParams.delete("tokenInfo");
    res.headers.set("Location", url.toString());
    return res;
  }

  // Continue with the response if no rewrite is needed
  return NextResponse.next();
}
