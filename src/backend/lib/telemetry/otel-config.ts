/**
 * OpenTelemetry SDK Configuration for Youngsend Fintech Platform
 *
 * Initializes the full OTel NodeSDK with:
 * - TraceExporter: OTLP gRPC (falls back to console/no-op when no endpoint)
 * - MetricExporter: OTLP gRPC
 * - LogExporter: OTLP gRPC
 * - Auto-instrumentations (prisma & nextjs disabled — handled manually)
 * - Resource attributes: service.name, service.version, deployment.environment
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';

// Read version from package.json
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkgVersion: string = require('../../../../package.json').version || '0.0.0';

let sdk: NodeSDK | null = null;

/**
 * Whether a real OTel endpoint is configured
 */
export function isOtelConfigured(): boolean {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}

/**
 * Setup and start the OpenTelemetry SDK.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function setupOpenTelemetry(): Promise<void> {
  if (sdk) return;

  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const hasEndpoint = Boolean(otlpEndpoint);

  if (!hasEndpoint) {
    console.log('[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set — using console/no-op exporters');
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'youngsend-api',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || pkgVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
  });

  // ── Build SDK config ────────────────────────────────────────────────

  const sdkConfig: ConstructorParameters<typeof NodeSDK>[0] = {
    resource,

    // Auto-instrumentations (prisma & nextjs not included — handled manually)
    instrumentations: [
      getNodeAutoInstrumentations(),
    ],
  };

  if (hasEndpoint) {
    // Real OTel — use gRPC exporters
    sdkConfig.traceExporter = new OTLPTraceExporter();
    sdkConfig.metricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 30_000,
    });
    sdkConfig.logRecordProcessor = new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter(),
    });
  }
  // When no endpoint: NodeSDK defaults to no-op exporters (console logging via diag)

  sdk = new NodeSDK(sdkConfig);

  // ── Start & register shutdown ────────────────────────────────────────
  sdk.start();

  const shutdownSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of shutdownSignals) {
    process.on(signal, () => {
      void shutdownOpenTelemetry().then(() => process.exit(0));
    });
  }

  console.log(
    `[otel] SDK initialized — service=youngsend-api version=${pkgVersion} env=${process.env.NODE_ENV || 'development'} endpoint=${otlpEndpoint || 'none'}`
  );
}

/**
 * Gracefully shut down the OpenTelemetry SDK.
 * Flushes pending spans, metrics, and logs.
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
    console.log('[otel] SDK shut down successfully');
  } catch (err) {
    console.error('[otel] SDK shutdown error:', err);
  } finally {
    sdk = null;
  }
}
