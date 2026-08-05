import { NextResponse } from 'next/server';
import { db, ensurePragmas } from '@/lib/db';

export async function GET() {
  try {
    // Ensure PRAGMAs are applied on warm start
    await ensurePragmas();

    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    return NextResponse.json({
      ready: true,
      db: 'connected',
      dbLatencyMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ready] Database check failed:', message);
    return NextResponse.json(
      {
        ready: false,
        db: 'disconnected',
      },
      { status: 503 },
    );
  }
}
