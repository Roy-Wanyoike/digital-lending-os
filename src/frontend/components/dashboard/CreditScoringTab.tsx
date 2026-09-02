'use client'

import { Brain } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function CreditScoringTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Credit Scoring</h2>
        <p className="text-sm text-muted-foreground">AI-powered credit risk assessment</p>
      </div>
      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <Brain className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center max-w-md">
            <p className="text-sm font-medium text-foreground">Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-2">
              AI-powered credit scoring is being configured. This module provides automated credit risk assessment using CRB data, mobile money transaction history, and alternative data sources.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
