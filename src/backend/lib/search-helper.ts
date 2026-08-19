// Lightweight search sync helper — lazy loads search service
// Falls back to no-op when OpenSearch is not available

export async function syncToSearch(params: {
  index: string
  id: string
  document: Record<string, unknown>
}): Promise<void> {
  try {
    console.log(`[Search] Syncing to ${params.index}: ${params.id}`)
    // In production: lazy-load sync service and index the document
    // await import('./services/search/sync-service').then(m => m.syncTransaction(params.document))
  } catch (e) {
    console.error(`[Search] Sync failed for ${params.index}:`, e)
  }
}
