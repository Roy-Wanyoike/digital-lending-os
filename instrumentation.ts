export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { setupOpenTelemetry } = await import('./src/backend/lib/telemetry/otel-config');
      await setupOpenTelemetry();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn('OTel init skipped:', message);
    }
  }
}
