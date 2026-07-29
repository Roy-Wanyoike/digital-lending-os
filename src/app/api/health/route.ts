import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      checks: {
        database: 'ok',
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
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
