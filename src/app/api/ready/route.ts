import { db, ensurePragmas } from '@/lib/db';
import { withErrorHandler, ok, error } from '@/backend/lib/api-response';

export const GET = withErrorHandler(async () => {
  const timestamp = new Date().toISOString();
  const checks: Record<string, string> = {};

  try {
    // Ensure PRAGMAs are applied on warm start
    await ensurePragmas();

    // ── Database connectivity ─────────────────────────────────────
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
    const dbLatencyMs = Date.now() - dbStart;

    // ── Schema verification — confirm core tables exist ────────────
    try {
      await db.$queryRaw`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('User', 'Account', 'Session', 'Wallet', 'Transaction')
      `;
      checks.schema = 'ok';
    } catch {
      checks.schema = 'missing_tables';
    }

    // ── Essential service: NextAuth secret is configured ───────────
    checks.auth = process.env.NEXTAUTH_SECRET ? 'ok' : 'misconfigured';

    const allOk = Object.values(checks).every((v) => v === 'ok');

    if (!allOk) {
      console.warn('[ready] Not all checks passed:', checks);
      return error('Service not ready', 503, 'NOT_READY');
    }

    return ok(
      {
        ready: true,
        checks,
        dbLatencyMs,
        timestamp,
      },
      undefined,
      { noCache: true },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ready] Readiness check failed:', message);
    return error('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
  }
});
