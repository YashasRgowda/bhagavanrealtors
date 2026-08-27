import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the Supabase session on every request and gate /(app)/* routes.
 * Public routes: /login, /share/[token], /_next, static assets, /api/share.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without these, createServerClient throws and the middleware crashes — which
  // surfaces as a bare MIDDLEWARE_INVOCATION_FAILED 500 on *every* route with no
  // hint as to why. Fail loudly and specifically instead.
  //
  // Deliberately does NOT fall through to the app: with no Supabase client we
  // cannot verify a session, so continuing would serve gated pages to anyone.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [
      !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
      !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean).join(" and ");
    return new NextResponse(
      `Server misconfigured: ${missing} is not set.\n\n` +
        `Add it under Vercel → Project → Settings → Environment Variables, ` +
        `then redeploy (existing deployments do not pick up new variables).`,
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/api/share/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/properties";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
