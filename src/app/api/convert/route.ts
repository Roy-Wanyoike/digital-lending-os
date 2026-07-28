import { NextRequest } from 'next/server';

/**
 * Legacy alias for /api/wallets/convert
 * Redirects POST to the canonical endpoint.
 */
export async function POST(req: NextRequest) {
  const forwardUrl = new URL('/api/wallets/convert', req.url);
  return fetch(forwardUrl.toString(), {
    method: 'POST',
    headers: req.headers,
    body: req.body,
    // @ts-expect-error Node fetch supports duplex
    duplex: 'half',
  });
}
