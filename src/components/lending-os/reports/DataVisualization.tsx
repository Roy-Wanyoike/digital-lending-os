'use client'

import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Chart Color Palette - Digital Lending OS Theme
export const CHART_COLORS = {
  primary: '#059669',      // emerald-600
  secondary: '#0d9488',    // teal-600
  tertiary: '#2563eb',     // blue-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  success: '#16a34a',      // green-600
  info: '#0891b2',         // cyan-600
  purple: '#7c3aed',       // violet-600
  neutral: '#6b7280',      // gray-500
  light: '#e5e7eb'         // gray-200
}

// Color arrays for multi-series charts
export const COLOR_PALETTES = {
  default: [
    CHART_COLORS.primary,
    CHART_COLORS.tertiary,
    CHART_COLORS.warning,
    CHART_COLORS.purple,
    CHART_COLORS.secondary,
    CHART_COLORS.danger,
    CHART_COLORS.info,
    CHART_COLORS.success
  ],
  sequential: [
    '#dcfce7',   // emerald-100
    '#bbf7d0',   // emerald-200
    '#86efac',   // emerald-300
    '#4ade80',   // emerald-400
    '#22c55e',   // emerald-500
    '#16a34a',   // emerald-600
    '#15803d',   // emerald-700
    '#166534'    // emerald-800
  ],
  risk: [
    '#22c55e',   // green (low)
    '#84cc16',   // lime (medium-low)
    '#eab308',   // yellow (medium)
    '#f97316',   // orange (high)
    '#ef4444'    // red (very high)
  ]
}

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (value: number) => string
  prefix?: string
  suffix?: string
}

export function ChartTooltip({ 
  active, 
  payload, 
  label, 
  formatter = (v) => v.toLocaleString(),
  prefix = '',
  suffix = ''
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {prefix}{formatter(entry.value)}{suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

// Format currency for Kenyan Shillings
export const formatKES = (value: number): string => {
  if (value >= 1000000) {
    return `KSh ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `KSh ${(value / 1000).toFixed(1)}K`
  }
  return `KSh ${value.toFixed(0)}`
}

// Format percentage
export const formatPercent = (value: number): string => `${value.toFixed(1)}%`

// ============================================
// LINE CHART COMPONENT
// ============================================

interface LineChartDataItem {
  [key: string]: any
}

interface LineChartProps {
  data: LineChartDataItem[]
  lines: Array<{
    dataKey: string
    name: string
    color?: string
    strokeDasharray?: string
  }>
  xAxisKey?: string
  height?: number
  title?: string
  formatValue?: (value: number) => string
  showGrid?: boolean
  showLegend?: boolean
  curveType?: 'monotone' | 'linear' | 'step' | 'natural'
}

export function ReportLineChart({
  data,
  lines,
  xAxisKey = 'date',
  height = 300,
  title,
  formatValue = (v) => v.toLocaleString(),
  showGrid = true,
  showLegend = true,
  curveType = 'monotone'
}: LineChartProps) {
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis 
              dataKey={xAxisKey} 
              tick={{ fontSize: 12 }} 
              stroke="#9ca3af"
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip content={<ChartTooltip formatter={formatValue} />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type={curveType}
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                strokeDasharray={line.strokeDasharray}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// BAR CHART COMPONENT
// ============================================

interface BarChartProps {
  data: any[]
  bars: Array<{
    dataKey: string
    name: string
    color?: string
    stackId?: string
  }>
  xAxisKey?: string
  height?: number
  title?: string
  layout?: 'horizontal' | 'vertical'
  formatValue?: (value: number) => string
  showGrid?: boolean
  showLegend?: boolean
  animated?: boolean
}

export function ReportBarChart({
  data,
  bars,
  xAxisKey = 'name',
  height = 300,
  title,
  layout = 'horizontal',
  formatValue = (v) => v.toLocaleString(),
  showGrid = true,
  showLegend = true,
  animated = true
}: BarChartProps) {
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            layout={layout}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />}
            {layout === 'horizontal' ? (
              <>
                <XAxis 
                  dataKey={xAxisKey} 
                  tick={{ fontSize: 11 }} 
                  stroke="#9ca3af"
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="#9ca3af"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatValue}
                />
              </>
            ) : (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={formatValue} />
                <YAxis 
                  dataKey={xAxisKey} 
                  type="category" 
                  tick={{ fontSize: 11 }} 
                  stroke="#9ca3af"
                  width={100}
                />
              </>
            )}
            <Tooltip content={<ChartTooltip formatter={formatValue} />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}
                radius={bar.stackId ? undefined : [4, 4, 0, 0]}
                stackId={bar.stackId}
                isAnimationActive={animated}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// PIE/DONUT CHART COMPONENT
// ============================================

interface PieChartProps {
  data: Array<{
    name: string
    value: number
    color?: string
  }>
  height?: number
  title?: string
  innerRadius?: number
  outerRadius?: number
  showLabels?: boolean
  formatValue?: (value: number) => string
  showLegend?: boolean
}

export function ReportPieChart({
  data,
  height = 300,
  title,
  innerRadius = 60,
  outerRadius = 100,
  showLabels = true,
  formatValue = (v) => v.toLocaleString(),
  showLegend = true
}: PieChartProps) {
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={showLabels ? ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)` : false}
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              content={<ChartTooltip formatter={(val) => formatValue(Number(val))} />} 
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// AREA CHART COMPONENT
// ============================================

interface AreaChartProps {
  data: any[]
  areas: Array<{
    dataKey: string
    name: string
    color?: string
    fillOpacity?: number
    strokeDasharray?: string
  }>
  xAxisKey?: string
  height?: number
  title?: string
  formatValue?: (value: number) => string
  showGrid?: boolean
  stacked?: boolean
}

export function ReportAreaChart({
  data,
  areas,
  xAxisKey = 'date',
  height = 300,
  title,
  formatValue = (v) => v.toLocaleString(),
  showGrid = true,
  stacked = false
}: AreaChartProps) {
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={formatValue} />
            <Tooltip content={<ChartTooltip formatter={formatValue} />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {areas.map((area, index) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stroke={area.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}
                fill={area.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}
                fillOpacity={area.fillOpacity || 0.15}
                strokeWidth={2}
                stackId={stacked ? 'stack' : undefined}
                strokeDasharray={area.strokeDasharray}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// RADAR/SPIDER CHART COMPONENT
// ============================================

interface RadarChartProps {
  data: any[]
  metrics: Array<{
    dataKey: string
    name: string
    color?: string
  }>
  height?: number
  title?: string
}

export function ReportRadarChart({
  data,
  metrics,
  height = 300,
  title
}: RadarChartProps) {
  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            {metrics.map((metric, index) => (
              <Radar
                key={metric.dataKey}
                name={metric.name}
                dataKey={metric.dataKey}
                stroke={metric.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}
                fill={metric.color || COLOR_PALETTES.default[index % COLOR_PALETTES.default.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================
// SPARKLINE COMPONENT (for KPI cards)
// ============================================

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  showArea?: boolean
}

export function Sparkline({
  data,
  color = CHART_COLORS.primary,
  height = 40,
  width = 120,
  showArea = true
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }))
  
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`sparkGradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={showArea ? `url(#sparkGradient-${color.replace('#', '')})` : 'transparent'}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ============================================
// GAUGE/METER COMPONENT (for single metric)
// ============================================

interface GaugeProps {
  value: number
  max?: number
  min?: number
  title?: string
  unit?: string
  thresholds?: Array<{ value: number; color: string; label?: string }>
  size?: number
}

export function Gauge({
  value,
  max = 100,
  min = 0,
  title,
  unit = '%',
  thresholds = [
    { value: 33, color: CHART_COLORS.danger },
    { value: 66, color: CHART_COLORS.warning },
    { value: 100, color: CHART_COLORS.success }
  ],
  size = 150
}: GaugeProps) {
  const percentage = ((value - min) / (max - min)) * 100
  
  const getColor = () => {
    for (const threshold of thresholds) {
      if (percentage <= threshold.value) return threshold.color
    }
    return thresholds[thresholds.length - 1].color
  }

  const color = getColor()
  const radius = size * 0.75
  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75 // Only 270 degrees

  return (
    <div className="flex flex-col items-center gap-2">
      {title && <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background arc */}
          <path
            d={`M ${size * 0.15} ${size * 0.85} A ${radius} ${radius} 0 1 1 ${size * 0.85} ${size * 0.85}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${size * 0.15} ${size * 0.85} A ${radius} ${radius} 0 1 1 ${size * 0.85} ${size * 0.85}`}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        {/* Value text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HEATMAP/TREEMAP FOR VINTAGE ANALYSIS
// ============================================

interface HeatmapDataItem {
  name: string
  size: number
  par?: number
  colorIndex?: number
}

interface TreemapHeatmapProps {
  data: HeatmapDataItem[]
  height?: number
  title?: string
  colorKey?: string
  nameKey?: string
  valueKey?: string
}

export function TreemapHeatmap({
  data,
  height = 250,
  title,
  colorKey = 'par'
}: TreemapHeatmapProps) {
  const getParColor = (par: number) => {
    if (par <= 3) return '#22c55e' // green
    if (par <= 5) return '#84cc16' // lime
    if (par <= 8) return '#eab308' // yellow
    if (par <= 12) return '#f97316' // orange
    return '#ef4444' // red
  }

  return (
    <Card className="w-full">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            strokeWidth={2}
            content={({ x, y, width, height, name, par }: any) => (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={getParColor(par || 0)}
                  rx={4}
                />
                {width > 60 && height > 40 && (
                  <>
                    <text
                      x={x + width / 2}
                      y={y + height / 2 - 8}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={600}
                    >
                      {name}
                    </text>
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + 10}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={14}
                      fontWeight={700}
                    >
                      PAR: {par?.toFixed(1)}%
                    </text>
                  </>
                )}
              </g>
            )}
          />
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> &lt;3%</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-lime-500"></span> 3-5%</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> 5-8%</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> 8-12%</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> &gt;12%</div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export all components
export default {
  ReportLineChart,
  ReportBarChart,
  ReportPieChart,
  ReportAreaChart,
  ReportRadarChart,
  Sparkline,
  Gauge,
  TreemapHeatmap,
  ChartTooltip
}
