import { db } from '@/lib/db';
import { withErrorHandler, ok, error } from '@/backend/lib/api-response';

export const GET = withErrorHandler(async () => {
  try {
    const start = Date.now();
    // Use a fast lightweight query that exercises the connection and returns a result
    const result = await db.$queryRaw<Array<{ v: number }>>`SELECT 1 as v`;
    const dbLatencyMs = Date.now() - start;

    return ok(
      {
        status: 'ok',
        checks: {
          database: 'ok',
          dbLatencyMs,
        },
        timestamp: new Date().toISOString(),
      },
      undefined,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[health] Database check failed:', message);
    return error('Service degraded', 503, 'SERVICE_DEGRADED');
  }
});
