/**
 * Performance Monitoring Middleware
 * 
 * Provides:
 * - Request timing middleware
 * - Slow query logging
 * - Memory usage tracking
 * - Response time percentiles
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// TYPES
// =============================================================================

export interface RequestMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  userId?: string;
  tenantId?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number; // Median
  p95: number;
  p99: number;
  errorRate: number;
  requestsPerSecond: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

interface TimingEntry {
  timestamp: number;
  duration: number;
  statusCode: number;
  method: string;
  url: string;
}

// =============================================================================
// PERFORMANCE MONITOR CLASS
// =============================================================================

class PerformanceMonitor {
  private metrics: Map<string, RequestMetrics> = new Map();
  private timings: TimingEntry[] = [];
  private maxTimings: number = 10000; // Keep last 10k requests
  private startTime: number = Date.now();
  private activeConnections: number = 0;

  /**
   * Start tracking a request
   */
  startRequest(req: Request): string {
    const requestId = (req.headers['x-request-id'] as string) || 
                      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metrics: RequestMetrics = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: 0,
      startTime: Date.now(),
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
    };

    this.metrics.set(requestId, metrics);
    this.activeConnections++;

    return requestId;
  }

  /**
   * End tracking a request and record timing
   */
  endRequest(requestId: string, statusCode: number): void {
    const metrics = this.metrics.get(requestId);
    if (!metrics) return;

    const endTime = Date.now();
    const duration = endTime - metrics.startTime;

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.statusCode = statusCode;
    metrics.memoryUsage = process.memoryUsage();

    // Record timing
    this.timings.push({
      timestamp: metrics.startTime,
      duration,
      statusCode,
      method: metrics.method,
      url: this.sanitizeUrl(metrics.url),
    });

    // Trim old entries
    if (this.timings.length > this.maxTimings) {
      this.timings = this.timings.slice(-this.maxTimings);
    }

    this.metrics.delete(requestId);
    this.activeConnections--;

    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      console.warn(
        `[Performance] Slow request: ${metrics.method} ${metrics.url} - ${duration}ms (${statusCode})`
      );
    }
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    const now = Date.now();
    const recentTimings = this.timings.filter(t => now - t.timestamp < 60000); // Last minute

    if (recentTimings.length === 0) {
      return this.emptyStats();
    }

    const durations = recentTimings.map(t => t.duration).sort((a, b) => a - b);
    const errors = recentTimings.filter(t => t.statusCode >= 400);

    return {
      totalRequests: this.timings.length,
      averageResponseTime: Math.round(
        durations.reduce((sum, d) => sum + d, 0) / durations.length
      ),
      minResponseTime: durations[0],
      maxResponseTime: durations[durations.length - 1],
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      errorRate: errors.length / recentTimings.length,
      requestsPerSecond: recentTimings.length / 60,
      activeConnections: this.activeConnections,
      memoryUsage: process.memoryUsage(),
      uptime: now - this.startTime,
    };
  }

  /**
   * Get recent slow requests
   */
  getSlowRequests(thresholdMs: number = 1000, limit: number = 10): TimingEntry[] {
    return this.timings
      .filter(t => t.duration >= thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get endpoint-specific stats
   */
  getEndpointStats(): Record<string, {
    count: number;
    avgDuration: number;
    maxDuration: number;
    errorCount: number;
    errorRate: number;
  }> {
    const stats: Record<string, {
      count: number;
      totalDuration: number;
      maxDuration: number;
      errorCount: number;
    }> = {};

    for (const timing of this.timings) {
      const key = `${timing.method} ${timing.url.split('?')[0]}`;
      
      if (!stats[key]) {
        stats[key] = { count: 0, totalDuration: 0, maxDuration: 0, errorCount: 0 };
      }

      stats[key].count++;
      stats[key].totalDuration += timing.duration;
      stats[key].maxDuration = Math.max(stats[key].maxDuration, timing.duration);
      
      if (timing.statusCode >= 400) {
        stats[key].errorCount++;
      }
    }

    // Calculate averages and rates
    const result: Record<string, any> = {};
    
    for (const [key, stat] of Object.entries(stats)) {
      result[key] = {
        count: stat.count,
        avgDuration: Math.round(stat.totalDuration / stat.count),
        maxDuration: stat.maxDuration,
        errorCount: stat.errorCount,
        errorRate: stat.errorCount / stat.count,
      };
    }

    return result;
  }

  /**
   * Reset all collected data
   */
  reset(): void {
    this.metrics.clear();
    this.timings = [];
    this.startTime = Date.now();
  }

  private emptyStats(): PerformanceStats {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      activeConnections: this.activeConnections,
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private sanitizeUrl(url: string): string {
    // Remove query parameters that might contain sensitive data
    try {
      const [path, query] = url.split('?');
      if (!query) return path;

      // Keep only safe parameters
      const safeParams = ['page', 'limit', 'sort', 'status'];
      const params = new URLSearchParams(query);
      const filteredParams = new URLSearchParams();

      for (const param of safeParams) {
        if (params.has(param)) {
          filteredParams.set(param, params.get(param)!);
        }
      }

      const filteredQuery = filteredParams.toString();
      return filteredQuery ? `${path}?${filteredQuery}` : path;
    } catch {
      return url.split('?')[0];
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const performanceMonitor = new PerformanceMonitor();

// =============================================================================
// EXPRESS MIDDLEWARES
// =============================================================================

/**
 * Request timing middleware
 * 
 * Measures response time for each request and adds to monitoring.
 */
export function requestTimingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = performanceMonitor.startRequest(req);

  // Attach request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Track when response finishes
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    res.end = originalEnd;
    const result = res.end(chunk, encoding, callback);
    
    // Record metrics after response is sent
    performanceMonitor.endRequest(requestId, res.statusCode);
    
    // Add timing header in development
    if (process.env.NODE_ENV !== 'production') {
      const metrics = (performanceMonitor as any).metrics?.get(requestId);
      if (metrics?.duration) {
        res.setHeader('X-Response-Time', `${metrics.duration}ms`);
      }
    }

    return result;
  };

  next();
}

/**
 * Memory usage monitoring middleware
 * 
 * Logs warning when memory usage exceeds threshold.
 */
export function memoryMonitoringMiddleware(options?: {
  warningThresholdMB?: number;
  criticalThresholdMB?: number;
  intervalMs?: number;
}) {
  const warningThreshold = options?.warningThresholdMB || 500; // 500 MB
  const criticalThreshold = options?.criticalThresholdMB || 800; // 800 MB

  let lastWarning = 0;

  return (_req: Request, _res: Response, next: NextFunction): void => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const now = Date.now();

    // Only log every 30 seconds to avoid spam
    if (now - lastWarning > 30000) {
      if (heapUsedMB > criticalThreshold) {
        console.error(
          `[Memory] CRITICAL: Heap usage at ${heapUsedMB.toFixed(0)}MB (threshold: ${criticalThreshold}MB)`
        );
        lastWarning = now;
      } else if (heapUsedMB > warningThreshold) {
        console.warn(
          `[Memory] WARNING: Heap usage at ${heapUsedMB.toFixed(0)}MB (threshold: ${warningThreshold}MB)`
        );
        lastWarning = now;
      }
    }

    next();
  };
}

/**
 * Health check with performance data
 */
export function healthCheckWithPerformance(_req: Request, res: Response): void {
  const stats = performanceMonitor.getStats();
  
  const status = stats.errorRate < 0.05 && stats.p99 < 5000 ? 'healthy' : 'degraded';
  
  res.json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round(stats.uptime / 1000),
    memory: {
      used: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(stats.memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(stats.memoryUsage.rss / 1024 / 1024),
    },
    performance: {
      requestsPerMinute: Math.round(stats.requestsPerSecond * 60),
      averageResponseTime: `${stats.averageResponseTime}ms`,
      p95: `${stats.p95}ms`,
      p99: `${stats.p99}ms`,
      errorRate: `${(stats.errorRate * 100).toFixed(2)}%`,
      activeConnections: stats.activeConnections,
    },
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { PerformanceMonitor };
export default performanceMonitor;
