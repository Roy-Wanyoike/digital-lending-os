'use client'

import { useSyncExternalStore } from 'react'

/**
 * Custom hook to track if component is mounted on the client.
 * Uses useSyncExternalStore to avoid React hooks ESLint warnings.
 * 
 * @returns {boolean} true if component is mounted on client, false during SSR
 */

// Empty subscribe function (never changes)
const emptySubscribe = () => () => {}

// getSnapshot returns true after first call (client-side)
let isClient = false

function getSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function useMounted(): boolean {
  // On first render, this will use getServerSnapshot (false)
  // After hydration, it subscribes and uses getSnapshot (true)
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)
}
