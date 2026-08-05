import { NextResponse } from 'next/server';
import { db, ensurePragmas } from '@/lib/db';

export async function GET() {
  try {
    // Ensure PRAGMAs are applied on warm start
    await ensurePragmas();

    const start = Date.now();
    // Use a fast lightweight query that exercises the connection and returns a result
    const result = await db.$queryRaw<Array<{ v: number }>>`SELECT 1 as v`;
    const dbLatencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      checks: {
        database: 'ok',
        dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[health] Database check failed:', message);
    return NextResponse.json(
      {
        status: 'degraded',
        checks: {
          database: 'error',
          dbLatencyMs: null,
        },
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
