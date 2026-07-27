import { Connection, Client } from '@temporalio/client'

let cachedClient: Client | null = null
let connectionPromise: Promise<Client | null> | null = null

/**
 * Get or create a Temporal client connection (singleton).
 * Returns null if Temporal server is unavailable.
 */
export async function getTemporalClient(): Promise<Client | null> {
  if (cachedClient) {
    return cachedClient
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = (async () => {
    try {
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
 * Returns true if a connection can be established.
 */
export async function isTemporalAvailable(): Promise<boolean> {
  try {
    const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233'

    const connection = await Connection.connect({
      address: temporalAddress,
    })

    await connection.close()
    return true
  } catch {
    return false
  }
}
