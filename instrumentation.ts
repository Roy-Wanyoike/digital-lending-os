// instrumentation.ts — Next.js instrumentation hook
// OTel setup disabled (FIX-1): auto-instrumentations crash the server in sandboxed environments.
// Re-enable once a real OTel collector endpoint is available.
export async function register() {
  // Intentionally empty — OTel setup commented out per FIX-1
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   try {
  //     const { setupOpenTelemetry } = await import('./src/backend/lib/telemetry/otel-config');
  //     await setupOpenTelemetry();
  //   } catch (e: unknown) {
  //     const message = e instanceof Error ? e.message : String(e);
  //     console.warn('OTel init skipped:', message);
  //   }
  // }
}
