// ─── Temporal Client (lazy) ─────────────────────────────────────────────
// The @temporalio/client package is only needed for production cloud
// deployments. In dev/demo it's unavailable — all calls return null and
// the runner falls back to direct execution.


let cachedClient: any = null
let connectionPromise: Promise<any | null> | null = null

/**
 * Get or create a Temporal client connection (singleton).
 * Returns null if @temporalio/client is not installed or Temporal server is unavailable.
 */
export async function getTemporalClient(): Promise<any | null> {
  if (cachedClient) {
    return cachedClient
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = (async () => {
    try {
      // @ts-expect-error -- @temporalio/client is optional; not installed in dev
      const temporal = await import('@temporalio/client')
      const { Connection, Client } = temporal

      const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233'

      const connection = await Connection.connect({
        address: temporalAddress,
      })

      cachedClient = new Client({
        connection,
        namespace: 'default',
      })

      console.log(`[Temporal] Connected to Temporal server at ${temporalAddress}`)
      return cachedClient
    } catch (err) {
      console.warn(
        '[Temporal] Failed to connect to Temporal server. ' +
          'Workflows will fall back to direct execution.',
        err
      )
      return null
    } finally {
      connectionPromise = null
    }
  })()

  return connectionPromise
}

/**
 * Check whether the Temporal server is reachable.
 * Returns false if @temporalio/client is not installed.
 */
export async function isTemporalAvailable(): Promise<boolean> {
  try {
    // @ts-expect-error -- @temporalio/client is optional; not installed in dev
    const temporal = await import('@temporalio/client')
    const { Connection } = temporal
    const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233'
    const connection = await Connection.connect({ address: temporalAddress })
    await connection.close()
    return true
  } catch {
    return false
  }
}
