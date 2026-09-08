'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function LoansTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Loans</h2>
        <p className="text-sm text-muted-foreground">Manage loan products, applications, and approvals</p>
      </div>
      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center max-w-md">
            <p className="text-sm font-medium text-foreground">Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-2">
              Loan management module is being configured. Create and manage loan products, applications, approval workflows, and disbursement schedules.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
