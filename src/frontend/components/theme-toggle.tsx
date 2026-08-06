'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'

// `useSyncExternalStore` is the React 18+ canonical way to detect
// whether we are on the client (post-hydration) without calling setState
// inside an effect (which the react-hooks/set-state-in-effect rule forbids).
// On the server we return false, on the client (after hydration) we return true.
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

const CYCLE: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']

type ThemeValue = 'light' | 'dark' | 'system'

function getNext(current: string | undefined): ThemeValue {
  const idx = CYCLE.indexOf((current as ThemeValue) ?? 'system')
  return CYCLE[(idx + 1) % CYCLE.length]
}

function ThemeIcon({ theme }: { theme: string | undefined }) {
  if (theme === 'system') {
    return <Monitor className="h-4 w-4" />
  }
  if (theme === 'dark') {
    return <Moon className="h-4 w-4" />
  }
  return <Sun className="h-4 w-4" />
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const label = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(getNext(theme))}
      aria-label={`Current: ${label}. Click to switch theme.`}
    >
      <ThemeIcon theme={theme} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}