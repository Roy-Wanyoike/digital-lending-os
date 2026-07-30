export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initTelemetry } = await import('@/backend/lib/telemetry');
      await initTelemetry();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn('OTel init skipped:', message);
    }
  }
}
