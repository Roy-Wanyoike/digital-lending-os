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
import { SparklineChart, sparklineDataGenerators } from './DashboardCharts'

interface KPIItem {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ReactNode
  gradient: string
  sparklineType?: 'upward' | 'downward' | 'volatile' | 'stable'
  sparklineColor?: string
}

export function KPICards() {
  const kpis: KPIItem[] = [
    {
      title: 'Total Loan Book',
      value: 'KSh 840M',
      change: 12.5,
      changeLabel: 'vs last month',
      icon: <DollarSign className="w-6 h-6" />,
      gradient: 'from-emerald-500 to-teal-600',
      sparklineType: 'upward',
      sparklineColor: '#10b981'
    },
    {
      title: 'Active Loans',
      value: '182,432',
      change: 3.2,
      changeLabel: 'new this week',
      icon: <CreditCard className="w-6 h-6" />,
      gradient: 'from-slate-700 to-slate-900',
      sparklineType: 'upward',
      sparklineColor: '#94a3b8'
    },
    {
      title: 'PAR30 Ratio',
      value: '4.2%',
      change: -0.3,
      changeLabel: 'improvement',
      icon: <AlertTriangle className="w-6 h-6" />,
      gradient: 'from-amber-500 to-orange-600',
      sparklineType: 'downward',
      sparklineColor: '#f59e0b'
    },
    {
      title: 'Collections Today',
      value: 'KSh 18.4M',
      change: 8.7,
      changeLabel: 'of daily target',
      icon: <TrendingUp className="w-6 h-6" />,
      gradient: 'from-blue-600 to-indigo-700',
      sparklineType: 'volatile',
      sparklineColor: '#3b82f6'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <KpiCard key={index} kpi={kpi} />
      ))}
    </div>
  )
}

// Individual KPI Card Component with enhanced features
function KpiCard({ kpi }: { kpi: KPIItem }) {
  const isPositive = kpi.change > 0
  const sparklineData = kpi.sparklineType 
    ? sparklineDataGenerators[kpi.sparklineType]() 
    : sparklineDataGenerators.stable()
  
  const sparklineColor = kpi.sparklineColor || (isPositive ? '#10b981' : '#ef4444')

  return (
    <Card 
      className={`
        relative overflow-hidden bg-gradient-to-br ${kpi.gradient} text-white border-0
        transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-xl hover:shadow-black/20
        group cursor-default
      `}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>
      
      {/* Animated glow on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm -z-10" />

      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <p className="text-white/80 text-sm font-medium tracking-wide">{kpi.title}</p>
            <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
          </div>
          
          {/* Icon with glass effect */}
          <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
            {kpi.icon}
          </div>
        </div>

        {/* Change indicator with percentage */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-xs font-semibold text-white">
                  +{Math.abs(kpi.change)}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-xs font-semibold text-white">
                  {Math.abs(kpi.change)}%
                </span>
              </div>
            )}
            <span className="text-xs text-white/70 ml-1">{kpi.changeLabel}</span>
          </div>
          
          {/* Sparkline mini chart */}
          <SparklineChart 
            data={sparklineData}
            color={sparklineColor}
            width={72}
            height={28}
            showArea={true}
            positive={isPositive}
          />
        </div>

        {/* Decorative circle */}
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full transition-transform duration-500 group-hover:scale-110" />
        
        {/* Additional decorative element */}
        <div className="absolute top-1/2 -right-4 w-16 h-16 bg-white/3 rounded-full blur-md" />
      </CardContent>
    </Card>
  )
}
