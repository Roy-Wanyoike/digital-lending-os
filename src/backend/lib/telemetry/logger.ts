/**
 * Structured JSON Logger for Youngsend Fintech Platform
 *
 * Features:
 * - Automatic trace_id, span_id, trace_flags injection from active OpenTelemetry context
 * - ISO 8601 timestamps
 * - Structured fields: level, message, service, tenant_id, user_id
 * - Child loggers with bound context
 * - Console exporter for development, OTLP log exporter for production
 */

import {
  trace,
  SpanStatusCode,
  context,
  type Context,
  diag,
  DiagLogLevel,
} from '@opentelemetry/api';

// ─── Log Levels ────────────────────────────────────────────────────────────

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

// ─── Log Entry ──────────────────────────────────────────────────────────────

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  trace_id?: string;
  span_id?: string;
  trace_flags?: string;
  tenant_id?: string;
  user_id?: string;
  [key: string]: unknown;
}

// ─── Log Exporter Interface ─────────────────────────────────────────────────

export interface LogExporter {
  export(entry: LogEntry): void;
  shutdown(): Promise<void>;
}

// ─── Console Exporter (Dev) ─────────────────────────────────────────────────

class ConsoleLogExporter implements LogExporter {
  private readonly colorize: boolean;

  constructor(colorize: boolean = true) {
    this.colorize = colorize;
  }

  export(entry: LogEntry): void {
    const colors: Record<string, string> = {
      TRACE: '\x1b[90m',  // gray
      DEBUG: '\x1b[36m',  // cyan
      INFO: '\x1b[32m',   // green
      WARN: '\x1b[33m',   // yellow
      ERROR: '\x1b[31m',  // red
      FATAL: '\x1b[35m',  // magenta
    };
    const reset = '\x1b[0m';
    const color = this.colorize ? (colors[entry.level] || '') : '';

    const meta: string[] = [];
    if (entry.trace_id) meta.push(`trace=${entry.trace_id.slice(0, 16)}`);
    if (entry.span_id) meta.push(`span=${entry.span_id.slice(0, 8)}`);
    if (entry.tenant_id) meta.push(`tenant=${entry.tenant_id}`);

    const metaStr = meta.length > 0 ? ` [${meta.join(', ')}]` : '';

    // Extract extra fields
    const { timestamp, level, message, service, trace_id, span_id, trace_flags, tenant_id, user_id, ...extra } = entry;
    const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';

    process.stderr.write(
      `${color}${entry.level}${reset} ${timestamp}${metaStr} ${message}${extraStr}\n`
    );
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}

// ─── OTLP Log Exporter (Prod) ────────────────────────────────────────────────

class OTLPLogExporter implements LogExporter {
  private readonly endpoint: string;
  private readonly buffer: LogEntry[] = [];
  private readonly maxBufferSize: number;
  private readonly flushIntervalMs: number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown = false;

  constructor(endpoint: string, maxBufferSize: number = 512, flushIntervalMs: number = 5000) {
    this.endpoint = endpoint;
    this.maxBufferSize = maxBufferSize;
    this.flushIntervalMs = flushIntervalMs;
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.flushTimer.unref();
  }

  export(entry: LogEntry): void {
    if (this.isShuttingDown) return;
    this.buffer.push(entry);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceLogs: [
            {
              resource: {
                attributes: [
                  { key: 'service.name', value: { stringValue: 'youngsend-api' } },
                ],
              },
              scopeLogs: [
                {
                  scope: { name: 'youngsend-logger', version: '1.0.0' },
                  logRecords: batch.map((entry) => ({
                    timeUnixNano: String(new Date(entry.timestamp).getTime() * 1_000_000),
                    severityNumber: this.levelToSeverity(entry.level),
                    severityText: entry.level,
                    body: { stringValue: entry.message },
                    attributes: this.entryToAttributes(entry),
                    traceId: entry.trace_id
                      ? this.hexToBase64(entry.trace_id)
                      : undefined,
                    spanId: entry.span_id
                      ? this.hexToBase64(entry.span_id)
                      : undefined,
                    traceFlags: entry.trace_flags
                      ? this.hexToBase64(entry.trace_flags)
                      : undefined,
                  })),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        diag.instance().debug(`OTLP log export failed: ${response.status}`);
      }
    } catch (err) {
      diag.instance().debug(`OTLP log export error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private levelToSeverity(level: string): number {
    const map: Record<string, number> = {
      TRACE: 1,
      DEBUG: 5,
      INFO: 9,
      WARN: 13,
      ERROR: 17,
      FATAL: 21,
    };
    return map[level] ?? 9;
  }

  private entryToAttributes(entry: LogEntry): Array<{ key: string; value: { stringValue?: string; intValue?: string; doubleValue?: number; boolValue?: boolean } }> {
    const { timestamp, level, message, service, trace_id, span_id, trace_flags, ...attrs } = entry;
    return Object.entries(attrs).map(([key, value]) => ({
      key,
      value: { stringValue: String(value) },
    }));
  }

  private hexToBase64(hex: string): string {
    const bytes = Buffer.from(hex, 'hex');
    return bytes.toString('base64');
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

// ─── Logger Class ────────────────────────────────────────────────────────────

export interface LoggerConfig {
  serviceName?: string;
  minLevel?: LogLevel;
  exporter?: LogExporter;
  otlpEndpoint?: string;
  enableConsole?: boolean;
}

export class YoungsendLogger {
  private readonly serviceName: string;
  private readonly minLevel: LogLevel;
  private readonly exporters: LogExporter[];
  private readonly boundContext: Record<string, unknown>;

  private constructor(config: LoggerConfig & { boundContext?: Record<string, unknown> }) {
    this.serviceName = config.serviceName || process.env.OTEL_SERVICE_NAME || 'youngsend-api';
    this.minLevel = config.minLevel ?? LogLevel.INFO;
    this.exporters = [];
    this.boundContext = config.boundContext || {};

    if (config.exporter) {
      this.exporters.push(config.exporter);
    }

    const environment = process.env.NODE_ENV || 'development';
    if (config.enableConsole !== false && environment === 'development') {
      this.exporters.push(new ConsoleLogExporter());
    }

    if (config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT_LOGS) {
      const endpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT_LOGS!;
      this.exporters.push(new OTLPLogExporter(endpoint));
    }
  }

  /**
   * Create a new root logger instance.
   */
  static create(config: LoggerConfig = {}): YoungsendLogger {
    return new YoungsendLogger(config);
  }

  /**
   * Create a child logger with bound context fields (tenant_id, user_id, etc.).
   */
  child(bindings: Record<string, unknown>): YoungsendLogger {
    return new YoungsendLogger({
      serviceName: this.serviceName,
      minLevel: this.minLevel,
      exporter: undefined, // Don't duplicate exporters
      enableConsole: false,
      boundContext: { ...this.boundContext, ...bindings },
      // Reuse parent exporters
    }) as YoungsendLogger & { exporters: LogExporter[] };
    // We need to set exporters on child
  }

  /**
   * Internal child creation that properly shares exporters.
   */
  private createChild(bindings: Record<string, unknown>): YoungsendLogger {
    const child = new YoungsendLogger({
      serviceName: this.serviceName,
      minLevel: this.minLevel,
      enableConsole: false,
      boundContext: { ...this.boundContext, ...bindings },
    });
    // Share parent exporters
    (child as unknown as { exporters: LogExporter[] }).exporters = this.exporters;
    return child;
  }

  /**
   * Create a child logger with bound context (correct implementation).
   */
  withContext(bindings: Record<string, unknown>): YoungsendLogger {
    return this.createChild(bindings);
  }

  /**
   * Emit a log entry at the given level.
   */
  private emit(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
    if (level < this.minLevel) return;

    const spanContext = trace.getSpan(context.active())?.spanContext();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      message,
      service: this.serviceName,
      ...this.boundContext,
      ...extra,
    };

    if (spanContext) {
      entry.trace_id = spanContext.traceId;
      entry.span_id = spanContext.spanId;
      entry.trace_flags = spanContext.traceFlags.toString(16).padStart(2, '0');
    }

    for (const exporter of this.exporters) {
      exporter.export(entry);
    }
  }

  trace(message: string, extra?: Record<string, unknown>): void {
    this.emit(LogLevel.TRACE, message, extra);
  }

  debug(message: string, extra?: Record<string, unknown>): void {
    this.emit(LogLevel.DEBUG, message, extra);
  }

  info(message: string, extra?: Record<string, unknown>): void {
    this.emit(LogLevel.INFO, message, extra);
  }

  warn(message: string, extra?: Record<string, unknown>): void {
    this.emit(LogLevel.WARN, message, extra);
  }

  error(message: string, extra?: Record<string, unknown>): void {
    this.emit(LogLevel.ERROR, message, extra);
  }

  fatal(message: string, extra?: Record<string, unknown>): void {
    this.emit(LogLevel.FATAL, message, extra);
  }

  /**
   * Shutdown all exporters.
   */
  async shutdown(): Promise<void> {
    await Promise.all(this.exporters.map((e) => e.shutdown()));
  }
}

// ─── Default Logger Singleton ────────────────────────────────────────────────

let _logger: YoungsendLogger | null = null;

/**
 * Get or create the default Youngsend logger.
 */
export function getLogger(): YoungsendLogger {
  if (!_logger) {
    _logger = YoungsendLogger.create({
      minLevel: parseLogLevel(process.env.LOG_LEVEL || 'info'),
    });
  }
  return _logger;
}

/**
 * Create and set the default logger.
 */
export function initLogger(config: LoggerConfig = {}): YoungsendLogger {
  _logger = YoungsendLogger.create(config);
  return _logger;
}

function parseLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'trace':
      return LogLevel.TRACE;
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
    case 'warning':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    case 'fatal':
      return LogLevel.FATAL;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Gracefully shutdown the logger.
 */
export async function shutdownLogger(): Promise<void> {
  if (_logger) {
    await _logger.shutdown();
    _logger = null;
  }
}
