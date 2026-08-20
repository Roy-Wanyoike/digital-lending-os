'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface KPIItem {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ReactNode
  gradient: string
}

export function KPICards() {
  const kpis: KPIItem[] = [
    {
      title: 'Total Loan Book',
      value: 'KSh 840M',
      change: 12.5,
      changeLabel: 'vs last month',
      icon: <DollarSign className="w-6 h-6" />,
      gradient: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Active Loans',
      value: '182,432',
      change: 3.2,
      changeLabel: 'new this week',
      icon: <CreditCard className="w-6 h-6" />,
      gradient: 'from-slate-700 to-slate-800'
    },
    {
      title: 'PAR30 Ratio',
      value: '4.2%',
      change: -0.3,
      changeLabel: 'improvement',
      icon: <AlertTriangle className="w-6 h-6" />,
      gradient: 'from-amber-500 to-amber-600'
    },
    {
      title: 'Collections Today',
      value: 'KSh 18.4M',
      change: 8.7,
      changeLabel: 'of daily target',
      icon: <TrendingUp className="w-6 h-6" />,
      gradient: 'from-blue-600 to-blue-700'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className={`bg-gradient-to-br ${kpi.gradient} text-white border-0 overflow-hidden`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-white/80 text-sm font-medium">{kpi.title}</p>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                <div className="flex items-center gap-1 text-sm">
                  {kpi.change > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-200" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-emerald-200" />
                  )}
                  <span className="text-white/90">
                    {Math.abs(kpi.change)}% {kpi.changeLabel}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                {kpi.icon}
              </div>
            </div>
            
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
