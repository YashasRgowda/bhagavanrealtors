"use client";

import { useEffect, useState } from "react";

/**
 * Where a share link actually points.
 *
 * These URLs used to be built from `NEXT_PUBLIC_APP_URL`, which is a promise
 * about where the app is running rather than a fact. The moment the two drift
 * — a dev server that took the next free port, a preview deployment, a phone
 * hitting the LAN address — every link the dealer copies goes somewhere else.
 * That is exactly what happened: the env var said :3000, the app was on :3001,
 * and :3000 was a different project, so previews 404'd on someone else's site.
 *
 * The browser already knows the answer, so ask it. The env value is only the
 * first-paint fallback, so server and client agree on the initial HTML and
 * hydration stays clean.
 */
export function useShareOrigin(fallback: string): string {
  const [origin, setOrigin] = useState(fallback);
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

/** Build a public share URL from a token. */
export function buildShareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/share/${token}`;
}
