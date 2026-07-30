'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional label shown in the fallback (e.g. tab name) */
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary — isolates render crashes to the failed subtree.
 *
 * Usage: Wrap each dashboard tab so a crash in one tab does not
 * take down the entire dashboard shell.
 *
 * ```tsx
 * <ErrorBoundary name="Wallet">
 *   <WalletTab />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`,
      error,
      '\nComponent stack:',
      info.componentStack,
    )
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="text-center max-w-md">
            <p className="text-sm font-semibold text-foreground">
              Something went wrong{this.props.name ? ` in ${this.props.name}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {this.state.error?.message || 'An unexpected error occurred while rendering this tab.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Functional wrapper for use in client components that can't use class syntax directly.
 * Returns the ErrorBoundary class — use with JSX: <TabErrorBoundary><Tab /></TabErrorBoundary>
 */
export function TabErrorBoundary({ children, name }: { children: ReactNode; name?: string }) {
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>
}
