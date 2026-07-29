/**
 * Youngsend PostgreSQL Read/Write Splitting Router
 *
 * Provides getReadClient() for read-replica queries and getWriteClient() for primary queries.
 * Auto-failover: if the replica is unhealthy or lagged, reads fall back to the primary.
 *
 * Usage:
 *   import { getReadClient, getWriteClient } from './read-replica-router';
 *
 *   // Read from replica (with auto-failover)
 *   const readClient = await getReadClient();
 *   const accounts = await readClient.account.findMany({ where: { tenantId } });
 *
 *   // Write to primary
 *   const writeClient = await getWriteClient();
 *   await writeClient.account.create({ data: { ... } });
 */

import { PrismaClient } from '@prisma/client';
import type { PrismaClientOptions } from '@prisma/client';

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------

const REPLICA_HEALTH_CHECK_INTERVAL_MS = 10_000; // 10s between health checks
const REPLICA_LAG_THRESHOLD_MS = 500;            // Max acceptable replica lag
const REPLICA_CONNECT_TIMEOUT_MS = 3_000;        // Connection timeout for health check
const HEALTH_CHECK_QUERY_TIMEOUT_MS = 2_000;     // Query timeout for SELECT 1

interface RouterConfig {
  /** Database URL for the primary (writes) */
  primaryUrl?: string;
  /** Database URL for the read replica */
  readReplicaUrl?: string;
  /** Max acceptable replication lag in ms before failing over to primary */
  maxReplicaLagMs?: number;
  /** How often to health-check the replica */
  healthCheckIntervalMs?: number;
  /** Additional Prisma client options passed to both clients */
  prismaOptions?: PrismaClientOptions;
}

// ------------------------------------------------------------------
// Health State
// ------------------------------------------------------------------

interface ReplicaHealth {
  isHealthy: boolean;
  latencyMs: number | null;
  replicationLagMs: number | null;
  lastCheckedAt: Date | null;
  consecutiveFailures: number;
  lastError: string | null;
}

const defaultHealth: ReplicaHealth = {
  isHealthy: false,
  latencyMs: null,
  replicationLagMs: null,
  lastCheckedAt: null,
  consecutiveFailures: 0,
  lastError: null,
};

// ------------------------------------------------------------------
// Router Class
// ------------------------------------------------------------------

class ReadReplicaRouter {
  private config: Required<RouterConfig>;
  private writeClient: PrismaClient | null = null;
  private readClient: PrismaClient | null = null;
  private health: ReplicaHealth = { ...defaultHealth };
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: RouterConfig = {}) {
    this.config = {
      primaryUrl: config.primaryUrl ?? process.env.DATABASE_URL ?? '',
      readReplicaUrl: config.readReplicaUrl ?? process.env.DATABASE_READ_URL ?? '',
      maxReplicaLagMs: config.maxReplicaLagMs ?? REPLICA_LAG_THRESHOLD_MS,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? REPLICA_HEALTH_CHECK_INTERVAL_MS,
      prismaOptions: config.prismaOptions ?? {},
    };
  }

  // --------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------

  /**
   * Initialize the router. Creates client instances and starts health checks.
   * Safe to call multiple times - returns the same promise.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _initialize(): Promise<void> {
    // Always create the write client
    this.writeClient = new PrismaClient({
      datasources: { db: { url: this.config.primaryUrl } },
      ...this.config.prismaOptions,
    });

    // Only create read client if a read replica URL is configured
    if (this.config.readReplicaUrl) {
      this.readClient = new PrismaClient({
        datasources: { db: { url: this.config.readReplicaUrl } },
        ...this.config.prismaOptions,
      });

      // Start periodic health checks
      this.startHealthChecks();
    }

    this.isInitialized = true;
  }

  // --------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------

  /**
   * Get a Prisma client for READ operations.
   * Returns the read replica client if healthy, otherwise falls back to primary.
   */
  async getReadClient(): Promise<PrismaClient> {
    await this.initialize();

    if (this.readClient && this.health.isHealthy) {
      return this.readClient;
    }

    // Failover to primary
    if (this.readClient && !this.health.isHealthy) {
      console.warn(
        `[ReadReplicaRouter] Replica unhealthy (failures: ${this.health.consecutiveFailures}, ` +
        `error: ${this.health.lastError}). Falling back to primary for reads.`
      );
    }

    return this.writeClient!;
  }

  /**
   * Get a Prisma client for WRITE operations.
   * Always returns the primary client.
   */
  async getWriteClient(): Promise<PrismaClient> {
    await this.initialize();
    return this.writeClient!;
  }

  /**
   * Execute a read-only callback using the replica (with auto-failover).
   *
   * @example
   * const accounts = await router.withRead(client =>
   *   client.account.findMany({ where: { tenantId } })
   * );
   */
  async withRead<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
    const client = await this.getReadClient();
    return fn(client);
  }

  /**
   * Execute a write callback using the primary.
   *
   * @example
   * const account = await router.withWrite(client =>
   *   client.account.create({ data: { ... } })
   * );
   */
  async withWrite<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
    const client = await this.getWriteClient();
    return fn(client);
  }

  /**
   * Execute a read-only transaction on the replica.
   * Uses interactiveTransactions for consistency.
   */
  async readTransaction<T>(
    fn: (client: PrismaClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<T> {
    const client = await this.getReadClient();
    return client.$transaction(fn, {
      ...options,
      isolationLevel: 'ReadCommitted',
    });
  }

  /**
   * Execute a write transaction on the primary.
   */
  async writeTransaction<T>(
    fn: (client: PrismaClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<T> {
    const client = await this.getWriteClient();
    return client.$transaction(fn, options);
  }

  // --------------------------------------------------------------
  // Health Monitoring
  // --------------------------------------------------------------

  /**
   * Start periodic health checks on the read replica.
   */
  startHealthChecks(): void {
    if (this.healthCheckTimer) return;

    // Run first check immediately
    this.checkReplicaHealth();

    this.healthCheckTimer = setInterval(
      () => this.checkReplicaHealth(),
      this.config.healthCheckIntervalMs
    );

    // Don't prevent process exit
    if (this.healthCheckTimer.unref) {
      this.healthCheckTimer.unref();
    }
  }

  /**
   * Stop periodic health checks.
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform a single health check on the read replica.
   * Checks: (1) connectivity, (2) latency, (3) replication lag.
   */
  async checkReplicaHealth(): Promise<ReplicaHealth> {
    if (!this.readClient) {
      this.health = { ...defaultHealth, lastError: 'No read replica configured' };
      return this.health;
    }

    const startTime = Date.now();

    try {
      // 1. Connectivity + latency check
      await this.readClient.$queryRawUnsafe('SELECT 1 AS health_check');
      const latencyMs = Date.now() - startTime;

      // 2. Replication lag check (only if we have a separate raw connection)
      let replicationLagMs: number | null = null;
      try {
        const lagResult = await this.readClient.$queryRawUnsafe<
          Array<{ replication_lag: string | null }>
        >(`
          SELECT
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 AS replication_lag
        `);

        if (lagResult[0]?.replication_lag !== null) {
          replicationLagMs = parseFloat(lagResult[0].replication_lag);
        }
      } catch {
        // pg_last_xact_replay_timestamp may not be available if not a replica
        // This is fine - treat as zero lag
        replicationLagMs = 0;
      }

      // 3. Determine health
      const lagExceeded = replicationLagMs !== null && replicationLagMs > this.config.maxReplicaLagMs;
      const isHealthy = !lagExceeded && latencyMs < HEALTH_CHECK_QUERY_TIMEOUT_MS;

      this.health = {
        isHealthy,
        latencyMs,
        replicationLagMs,
        lastCheckedAt: new Date(),
        consecutiveFailures: isHealthy ? 0 : this.health.consecutiveFailures + 1,
        lastError: lagExceeded
          ? `Replication lag ${replicationLagMs}ms exceeds threshold ${this.config.maxReplicaLagMs}ms`
          : null,
      };

      if (!isHealthy && this.health.consecutiveFailures <= 3) {
        console.warn(
          `[ReadReplicaRouter] Health check failed: ${this.health.lastError} ` +
          `(latency: ${latencyMs}ms, lag: ${replicationLagMs}ms)`
        );
      }

      // Auto-recover after 3 consecutive successes
      if (isHealthy && this.health.consecutiveFailures > 0) {
        console.info('[ReadReplicaRouter] Replica recovered and is healthy.');
      }
    } catch (error) {
      this.health = {
        isHealthy: false,
        latencyMs: null,
        replicationLagMs: null,
        lastCheckedAt: new Date(),
        consecutiveFailures: this.health.consecutiveFailures + 1,
        lastError: error instanceof Error ? error.message : String(error),
      };

      if (this.health.consecutiveFailures <= 3) {
        console.error(
          `[ReadReplicaRouter] Replica connection failed: ${this.health.lastError} ` +
          `(consecutive failures: ${this.health.consecutiveFailures})`
        );
      }
    }

    return this.health;
  }

  /**
   * Get the current health status of the read replica.
   */
  getHealth(): Readonly<ReplicaHealth> {
    return { ...this.health };
  }

  /**
   * Check if the read replica is currently being used (healthy).
   */
  isReplicaActive(): boolean {
    return this.readClient !== null && this.health.isHealthy;
  }

  // --------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------

  /**
   * Gracefully shutdown all clients and stop health checks.
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();

    const disconnect = async (client: PrismaClient | null, label: string) => {
      if (client) {
        try {
          await client.$disconnect();
          console.info(`[ReadReplicaRouter] ${label} client disconnected.`);
        } catch (error) {
          console.error(`[ReadReplicaRouter] Error disconnecting ${label}:`, error);
        }
      }
    };

    await Promise.all([
      disconnect(this.readClient, 'read'),
      disconnect(this.writeClient, 'write'),
    ]);

    this.readClient = null;
    this.writeClient = null;
    this.isInitialized = false;
  }
}

// ------------------------------------------------------------------
// Singleton Export
// ------------------------------------------------------------------

/**
 * Default router instance using DATABASE_URL and DATABASE_READ_URL env vars.
 */
let defaultRouter: ReadReplicaRouter | null = null;

/**
 * Get the default singleton ReadReplicaRouter instance.
 */
export function getRouter(config?: RouterConfig): ReadReplicaRouter {
  if (!defaultRouter) {
    defaultRouter = new ReadReplicaRouter(config);
  }
  return defaultRouter;
}

/**
 * Get a Prisma client for READ operations.
 * Uses the read replica if healthy, otherwise falls back to primary.
 */
export async function getReadClient(): Promise<PrismaClient> {
  return getRouter().getReadClient();
}

/**
 * Get a Prisma client for WRITE operations.
 * Always uses the primary.
 */
export async function getWriteClient(): Promise<PrismaClient> {
  return getRouter().getWriteClient();
}

/**
 * Execute a read-only operation with automatic replica routing.
 */
export async function withRead<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  return getRouter().withRead(fn);
}

/**
 * Execute a write operation on the primary.
 */
export async function withWrite<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  return getRouter().withWrite(fn);
}

/**
 * Get the health status of the read replica.
 */
export function getReplicaHealth(): Readonly<ReplicaHealth> {
  return getRouter().getHealth();
}

/**
 * Gracefully shutdown the router and all database connections.
 * Call this in your process shutdown handler.
 */
export async function shutdownRouter(): Promise<void> {
  if (defaultRouter) {
    await defaultRouter.shutdown();
    defaultRouter = null;
  }
}

export { ReadReplicaRouter };
export type { RouterConfig, ReplicaHealth };
