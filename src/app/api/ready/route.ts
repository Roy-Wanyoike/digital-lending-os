import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ready: true,
      db: 'connected',
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
