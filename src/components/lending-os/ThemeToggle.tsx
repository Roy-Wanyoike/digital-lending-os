'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/hooks/use-mounted'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  // Avoid hydration mismatch by only rendering interactive elements after mount
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-slate-200 dark:border-slate-700"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`
        h-9 w-9 relative overflow-hidden
        border-slate-200 hover:bg-slate-100 
        dark:border-slate-700 dark:hover:bg-slate-800
        transition-all duration-300 ease-in-out
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sun icon - visible in dark mode */}
      <Sun 
        className={`
          h-4 w-4 absolute transition-all duration-300 ease-in-out
          ${isDark 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
          }
        `} 
      />
      
      {/* Moon icon - visible in light mode */}
      <Moon 
        className={`
          h-4 w-4 absolute transition-all duration-300 ease-in-out
          ${!isDark 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
          }
        `} 
      />
      
      {/* Screen reader text for accessibility */}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
