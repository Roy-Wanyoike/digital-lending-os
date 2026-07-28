import { NextRequest } from 'next/server';

/**
 * Legacy alias for /api/payments/rates
 * Redirects to the canonical endpoint.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const forwardUrl = new URL('/api/payments/rates' + url.search, req.url);
  return fetch(forwardUrl.toString(), { headers: req.headers });
}
