import { auth } from '@/lib/auth'
import { LandingPage } from './LandingPageServer'
import { DashboardShell } from './DashboardShell'
import type { Session } from 'next-auth'

export default async function HomePage() {
  // Gracefully handle stale/invalid tokens — never crash the page
  let session: Session | null = null
  try {
    session = await auth()
  } catch {
    // JWT decryption can fail if secret rotated or token corrupted
    // Fall through to landing page
  }

  if (!session) {
    return <LandingPage />
  }

  return <DashboardShell session={session} />
}