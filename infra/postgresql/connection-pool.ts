import * as os from 'os';

// ============================================================
// Pool Size Formula
// ============================================================
//
// PostgreSQL connection pool sizing (from PgBouncer docs):
//   pool_size = (core_count * 2) + effective_spindle_count
//
// For NVMe SSDs, effective_spindle_count is typically 15-32
// For spinning disks, effective_spindle_count equals the number of disks
//

export interface SystemResources {
  /** Number of CPU cores available */
  cpuCores: number;
  /** Effective spindle count (disk parallelism) */
  effectiveSpindleCount: number;
  /** Total system RAM in bytes */
  totalMemoryBytes: number;
  /** Calculated base pool size */
  poolSize: number;
  /** Recommended max client connections */
  maxClientConn: number;
}

/**
 * Detect system resources and calculate optimal pool size.
 * Formula: pool_size = (core_count * 2) + effective_spindle_count
 *
 * @param overrides - Optional overrides for detection values
 */
export function detectSystemResources(overrides?: Partial<SystemResources>): SystemResources {
  const cpuCores = overrides?.cpuCores ?? os.cpus().length;
  const effectiveSpindleCount = overrides?.effectiveSpindleCount ?? 32; // NVMe SSD default
  const totalMemoryBytes = overrides?.totalMemoryBytes ?? os.totalmem();
  const poolSize = overrides?.poolSize ?? (cpuCores * 2) + effectiveSpindleCount;
  // Rule of thumb: max client conn = 10x pool size (PgBouncer multiplexing)
  const maxClientConn = overrides?.maxClientConn ?? poolSize * 10;

  return {
    cpuCores,
    effectiveSpindleCount,
    totalMemoryBytes,
    poolSize,
    maxClientConn,
  };
}

// ============================================================
// Pool Mode Configuration
// ============================================================

export type PoolMode = 'transaction' | 'session' | 'statement';

export interface PoolConfig {
  /** PgBouncer pool mode */
  mode: PoolMode;
  /** Database name in PgBouncer */
  database: string;
  /** PgBouncer listen port */
  port: number;
  /** Maximum client connections PgBouncer will accept */
  maxClientConn: number;
  /** Default pool size (server connections per database) */
  defaultPoolSize: number;
  /** Minimum pool size (pre-warm connections) */
  minPoolSize: number;
  /** Reserve pool size (for sudden spikes) */
  reservePoolSize: number;
  /** Seconds to wait for reserve pool connection */
  reservePoolTimeout: number;
  /** Server idle timeout in seconds */
  serverIdleTimeout: number;
  /** Server lifetime in seconds (reconnect after this) */
  serverLifetime: number;
  /** Server connect timeout in seconds */
  serverConnectTimeout: number;
  /** Client idle timeout in seconds (0 = no timeout) */
  clientIdleTimeout: number;
  /** Client login timeout in seconds */
  clientLoginTimeout: number;
  /** Suspect pool connections after this many seconds (transaction mode only) */
  serverCheckDelay: number;
  /** Max connections per user per database */
  maxDbConnections: number;
  /** Max connections per user */
  maxUserConnections: number;
}

// ============================================================
// Preset Configurations
// ============================================================

/**
 * Transaction mode — Best for OLTP workloads (default for Youngsend).
 * Server connection held only for duration of transaction.
 * Maximum multiplexing efficiency.
 */
export function getTransactionPoolConfig(resources?: Partial<SystemResources>): PoolConfig {
  const sys = detectSystemResources(resources);
  const poolSize = sys.poolSize;

  return {
    mode: 'transaction',
    database: 'youngsend',
    port: 6432,
    maxClientConn: sys.maxClientConn,
    defaultPoolSize: poolSize,
    minPoolSize: Math.max(5, Math.floor(poolSize * 0.15)),
    reservePoolSize: Math.max(10, Math.floor(poolSize * 0.15)),
    reservePoolTimeout: 3,
    serverIdleTimeout: 300,
    serverLifetime: 3600,
    serverConnectTimeout: 15,
    clientIdleTimeout: 0,
    clientLoginTimeout: 60,
    serverCheckDelay: 30,
    maxDbConnections: poolSize,
    maxUserConnections: Math.floor(poolSize * 0.8),
  };
}

/**
 * Session mode — For long-running operations (migrations, admin tasks, BULK imports).
 * Server connection held for entire client session.
 * Less multiplexing but supports session-level features (SET commands, temp tables, prepared statements).
 */
export function getSessionPoolConfig(resources?: Partial<SystemResources>): PoolConfig {
  const sys = detectSystemResources(resources);
  const poolSize = Math.max(10, Math.floor(sys.poolSize * 0.25));

  return {
    mode: 'session',
    database: 'youngsend',
    port: 6433,
    maxClientConn: Math.min(100, poolSize * 4),
    defaultPoolSize: poolSize,
    minPoolSize: 2,
    reservePoolSize: 5,
    reservePoolTimeout: 10,
    serverIdleTimeout: 600,
    serverLifetime: 7200,
    serverConnectTimeout: 30,
    clientIdleTimeout: 1800,
    clientLoginTimeout: 120,
    serverCheckDelay: 0,
    maxDbConnections: poolSize,
    maxUserConnections: Math.floor(poolSize * 0.6),
  };
}

/**
 * Statement mode — For analytics and reporting queries.
 * Server connection released after every statement.
 * Maximum multiplexing at cost of no multi-statement transactions.
 */
export function getStatementPoolConfig(resources?: Partial<SystemResources>): PoolConfig {
  const sys = detectSystemResources(resources);
  const poolSize = Math.max(5, Math.floor(sys.poolSize * 0.15));

  return {
    mode: 'statement',
    database: 'youngsend',
    port: 6434,
    maxClientConn: Math.min(50, poolSize * 5),
    defaultPoolSize: poolSize,
    minPoolSize: 1,
    reservePoolSize: 3,
    reservePoolTimeout: 15,
    serverIdleTimeout: 60,
    serverLifetime: 1800,
    serverConnectTimeout: 10,
    clientIdleTimeout: 600,
    clientLoginTimeout: 60,
    serverCheckDelay: 15,
    maxDbConnections: poolSize,
    maxUserConnections: poolSize,
  };
}

/**
 * Generate a PgBouncer ini configuration string from a PoolConfig.
 */
export function generatePgbouncerIni(
  oltpConfig: PoolConfig,
  sessionConfig: PoolConfig,
  analyticsConfig: PoolConfig,
  primaryHost: string,
  replicaHost: string,
  primaryPort: number = 5432,
  replicaPort: number = 5432,
): string {
  const poolToIni = (cfg: PoolConfig, name: string) => {
    const lines = [
      `[${name}]`,
      `host=${name === 'youngsend_primary' ? primaryHost : replicaHost}`,
      `port=${name === 'youngsend_primary' ? primaryPort : replicaPort}`,
      `dbname=${cfg.database}`,
      `pool_mode=${cfg.mode}`,
      `default_pool_size=${cfg.defaultPoolSize}`,
      `min_pool_size=${cfg.minPoolSize}`,
      `reserve_pool_size=${cfg.reservePoolSize}`,
      `reserve_pool_timeout=${cfg.reservePoolTimeout}`,
    ];
    return lines.join('\n');
  };

  return [
    '[databases]',
    poolToIni(oltpConfig, 'youngsend_primary'),
    poolToIni(oltpConfig, 'youngsend_read'),
    poolToIni(sessionConfig, 'youngsend_admin'),
    poolToIni(analyticsConfig, 'youngsend_analytics'),
    '',
    '[pgbouncer]',
    `listen_addr = 0.0.0.0`,
    `listen_port = ${oltpConfig.port}`,
    `auth_type = scram-sha-256`,
    `auth_file = /etc/pgbouncer/userlist.txt`,
    `admin_users = postgres, youngsend_admin`,
    `stats_period = 60`,
    `log_connections = 1`,
    `log_disconnections = 1`,
    `log_pooler_errors = 1`,
    `verbose = 0`,
    '',
    `max_client_conn = ${oltpConfig.maxClientConn}`,
    `server_idle_timeout = ${oltpConfig.serverIdleTimeout}`,
    `server_lifetime = ${oltpConfig.serverLifetime}`,
    `server_connect_timeout = ${oltpConfig.serverConnectTimeout}`,
    `client_idle_timeout = ${oltpConfig.clientIdleTimeout}`,
    `client_login_timeout = ${oltpConfig.clientLoginTimeout}`,
    `server_check_delay = ${oltpConfig.serverCheckDelay}`,
    `server_reset_query = DISCARD ALL`,
    '',
    `; Connection budgets per database',
    `max_db_connections = ${oltpConfig.maxDbConnections}`,
    `max_user_connections = ${oltpConfig.maxUserConnections}`,
    '',
    `; Connection budgets for admin',
    `; (admin db uses its own max_client_conn on port ${sessionConfig.port})`,
  ].join('\n');
}

/**
 * Generate PgBouncer DATABASE_URL connection strings for each pool.
 */
export function generateConnectionStrings(
  pgbouncerHost: string,
  oltpConfig: PoolConfig,
  sessionConfig: PoolConfig,
  analyticsConfig: PoolConfig,
  user: string = 'youngsend_app',
): {
  primaryUrl: string;
  readUrl: string;
  adminUrl: string;
  analyticsUrl: string;
  directPrimaryUrl: string;
} {
  const makeUrl = (port: number, db: string) =>
    `postgresql://${user}@${pgbouncerHost}:${port}/${db}`;

  return {
    primaryUrl: makeUrl(oltpConfig.port, 'youngsend_primary'),
    readUrl: makeUrl(oltpConfig.port, 'youngsend_read'),
    adminUrl: makeUrl(sessionConfig.port, 'youngsend_admin'),
    analyticsUrl: makeUrl(analyticsConfig.port, 'youngsend_analytics'),
    directPrimaryUrl: `postgresql://${user}@localhost:5432/youngsend`, // For migrations (bypasses PgBouncer)
  };
}

/**
 * Print a summary of pool configuration for logging.
 */
export function getPoolSummary(
  resources: SystemResources,
  oltpConfig: PoolConfig,
  sessionConfig: PoolConfig,
  analyticsConfig: PoolConfig,
): string {
  const lines = [
    '=== PgBouncer Pool Configuration Summary ===',
    `System: ${resources.cpuCores} CPU cores, ${(resources.totalMemoryBytes / 1024 / 1024 / 1024).toFixed(1)} GB RAM`,
    `Formula: (cores * 2) + spindles = (${resources.cpuCores} * 2) + ${resources.effectiveSpindleCount} = ${resources.poolSize}`,
    '',
    `OLTP (Transaction Mode) — Port ${oltpConfig.port}:`,
    `  Pool size: ${oltpConfig.defaultPoolSize}, Min: ${oltpConfig.minPoolSize}, Reserve: ${oltpConfig.reservePoolSize}`,
    `  Max clients: ${oltpConfig.maxClientConn} (multiplexing ratio: ${(oltpConfig.maxClientConn / oltpConfig.defaultPoolSize).toFixed(1)}:1)`,
    '',
    `Admin (Session Mode) — Port ${sessionConfig.port}:`,
    `  Pool size: ${sessionConfig.defaultPoolSize}, Min: ${sessionConfig.minPoolSize}`,
    `  Max clients: ${sessionConfig.maxClientConn}`,
    '',
    `Analytics (Statement Mode) — Port ${analyticsConfig.port}:`,
    `  Pool size: ${analyticsConfig.defaultPoolSize}, Min: ${analyticsConfig.minPoolSize}`,
    `  Max clients: ${analyticsConfig.maxClientConn}`,
    '===========================================',
  ];
  return lines.join('\n');
}
