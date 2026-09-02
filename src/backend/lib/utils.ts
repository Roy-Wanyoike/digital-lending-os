import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { NextRequest } from "next/server"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derives the public base URL from the incoming request headers,
 * falling back to `fallback` (typically an env var like NEXT_PUBLIC_BASE_URL).
 *
 * This ensures payment callback/redirect URLs, referral links, etc.
 * work correctly behind a reverse proxy / preview deployment where
 * the app is reachable on a different host than localhost:3000.
 */
export function getRequestBaseUrl(request: NextRequest, fallback = ""): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.nextUrl.protocol === "https:" ? "https" : "http")
  if (host) {
    return `${proto}://${host}`
  }
  return fallback
}

export function generateTxRef(prefix = 'ESC'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
