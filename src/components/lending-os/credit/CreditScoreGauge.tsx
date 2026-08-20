'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import type { RiskGrade } from '@/lib/credit-engine'
import { getGradeColor, getGradeLabel } from '@/lib/credit-engine'

interface CreditScoreGaugeProps {
  score: number
  previousScore?: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  showLabels?: boolean
  className?: string
}

// Gauge zones configuration
const GAUGE_ZONES = [
  { min: 700, max: 850, color: '#22c55e', label: 'Excellent' },   // Green
  { min: 550, max: 699, color: '#eab308', label: 'Good' },       // Yellow
  { min: 400, max: 549, color: '#f97316', label: 'Fair' },       // Orange
  { min: 0, max: 399, color: '#ef4444', label: 'Poor' },         // Red
]

const SIZE_CONFIG = {
  sm: { width: 160, height: 90, strokeWidth: 10, radius: 60 },
  md: { width: 240, height: 140, strokeWidth: 14, radius: 90 },
  lg: { width: 320, height: 180, strokeWidth: 18, radius: 120 }
}

// Custom hook for animated score value
function useAnimatedValue(targetValue: number, animated: boolean, duration: number = 1500): number {
  const [currentValue, setCurrentValue] = useState(() => animated ? 0 : targetValue)
  const startValueRef = useRef(animated ? 0 : targetValue)
  const targetRef = useRef(targetValue)
  const animatingRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  // Update target and trigger animation
  useEffect(() => {
    targetRef.current = targetValue
    
    if (!animated) {
      // For non-animated mode, just update the ref (state will sync on next render)
      startValueRef.current = targetValue
      return
    }

    // Only start new animation if target changed
    if (targetValue === startValueRef.current && !animatingRef.current) {
      return
    }

    // Cancel any existing animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    animatingRef.current = true
    startTimeRef.current = performance.now()

    const tick = () => {
      if (startTimeRef.current === null) return
      
      const elapsed = performance.now() - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      
      const newValue = Math.round(startValueRef.current + (targetRef.current - startValueRef.current) * easedProgress)
      
      // Schedule state update via RAF callback (not synchronously in effect)
      setCurrentValue(newValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        animatingRef.current = false
        startValueRef.current = targetRef.current
        rafRef.current = null
        startTimeRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [targetValue, animated, duration])

  return currentValue
}

export function CreditScoreGauge({
  score,
  previousScore,
  size = 'md',
  animated = true,
  showLabels = true,
  className = ''
}: CreditScoreGaugeProps) {
  const displayScore = useAnimatedValue(score, animated)
  
  const config = SIZE_CONFIG[size]
  const centerX = config.width / 2
  const centerY = config.height - 10
  const startAngle = Math.PI // Start from left (180 degrees)
  const endAngle = 0 // End at right (0 degrees)
  const angleRange = Math.PI // 180 degrees total

  // Calculate the angle for a given score
  const getAngleForScore = useCallback((value: number): number => {
    const clampedValue = Math.max(0, Math.min(850, value))
    return startAngle - (clampedValue / 850) * angleRange
  }, [])

  // Get color for current score position
  const getColorForScore = useCallback((value: number): string => {
    for (const zone of GAUGE_ZONES) {
      if (value >= zone.min && value <= zone.max) {
        return zone.color
      }
    }
    return GAUGE_ZONES[GAUGE_ZONES.length - 1].color
  }, [])

  const needleAngle = getAngleForScore(displayScore)
  const scoreColor = getColorForScore(displayScore)
  const needleLength = config.radius - config.strokeWidth - 5
  
  // Calculate needle end point
  const needleX = centerX + Math.cos(needleAngle) * needleLength
  const needleY = centerY + Math.sin(needleAngle) * needleLength

  // Generate arc path for each zone
  const generateZoneArc = useCallback((zone: typeof GAUGE_Zones[number]): string => {
    const startAngleForZone = startAngle - (zone.min / 850) * angleRange
    const endAngleForZone = startAngle - (Math.min(zone.max, 850) / 850) * angleRange
    
    const startX = centerX + Math.cos(startAngleForZone) * config.radius
    const startY = centerY + Math.sin(startAngleForZone) * config.radius
    const endX = centerX + Math.cos(endAngleForZone) * config.radius
    const endY = centerY + Math.sin(endAngleForZone) * config.radius
    
    const largeArcFlag = endAngleForZone - startAngleForZone > Math.PI ? 1 : 0
    
    return `M ${startX} ${startY} A ${config.radius} ${config.radius} 0 ${largeArcFlag} 0 ${endX} ${endY}`
  }, [config.radius, centerX, centerY, startAngle, angleRange])

  // Determine grade from score
  const getGradeFromScore = useCallback((value: number): RiskGrade => {
    if (value >= 720) return 'A'
    if (value >= 660) return 'B'
    if (value >= 600) return 'C'
    if (value >= 500) return 'D'
    return 'E'
  }, [])

  const currentGrade = getGradeFromScore(displayScore)

  // Score change indicator
  const scoreChange = previousScore !== undefined ? displayScore - previousScore : null

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg 
        width={config.width} 
        height={config.height} 
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="drop-shadow-sm"
      >
        {/* Background arc (gray track) */}
        <path
          d={generateZoneArc({ min: 0, max: 850 })}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-gray-200 dark:text-gray-700"
          strokeLinecap="round"
        />

        {/* Colored zone arcs */}
        {GAUGE_ZONES.map((zone, index) => (
          <path
            key={index}
            d={generateZoneArc(zone)}
            fill="none"
            stroke={zone.color}
            strokeWidth={config.strokeWidth - 2}
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}

        {/* Needle */}
        <g className="transition-transform duration-300">
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke={scoreColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Needle center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={config.strokeWidth}
            fill={scoreColor}
            className="shadow-lg"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={config.strokeWidth - 3}
            fill="white"
            className="dark:bg-slate-900"
          />
        </g>

        {/* Score text below gauge */}
        <text
          x={centerX}
          y={centerY + 25}
          textAnchor="middle"
          className="fill-current text-foreground font-bold"
          fontSize={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
        >
          {displayScore}
        </text>
        
        {/* Grade badge */}
        <text
          x={centerX}
          y={centerY + (size === 'sm' ? 40 : size === 'md' ? 48 : 56)}
          textAnchor="middle"
          fontSize={size === 'sm' ? 10 : size === 'md' ? 12 : 14}
          fontWeight="bold"
          fill={getGradeColor(currentGrade)}
        >
          Grade {currentGrade} • {getGradeLabel(currentGrade)}
        </text>
      </svg>

      {/* Labels and change indicator */}
      {showLabels && (
        <div className="mt-2 flex flex-col items-center gap-1">
          {/* Zone labels */}
          <div className="flex gap-2 flex-wrap justify-center">
            {GAUGE_ZONES.slice().reverse().map((zone, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: zone.color }}
                />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {zone.label}
                </span>
              </div>
            ))}
          </div>

          {/* Score change indicator */}
          {scoreChange !== null && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              scoreChange > 0 ? 'text-emerald-600' : scoreChange < 0 ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {scoreChange > 0 ? '↑' : scoreChange < 0 ? '↓' : '='}
              <span>
                {scoreChange !== 0 ? `${Math.abs(scoreChange)} pts` : 'No change'}
              </span>
              <span className="text-xs text-muted-foreground">(vs previous)</span>
            </div>
          )}

          {/* Scale markers */}
          <div className="flex justify-between w-full text-xs text-muted-foreground mt-1 px-2">
            <span>0</span>
            <span>425</span>
            <span>850</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Mini gauge for inline use
export function MiniCreditGauge({ score, className = '' }: { score: number; className?: string }) {
  return (
    <CreditScoreGauge 
      score={score} 
      size="sm" 
      animated={false} 
      showLabels={false}
      className={className}
    />
  )
}

export default CreditScoreGauge
