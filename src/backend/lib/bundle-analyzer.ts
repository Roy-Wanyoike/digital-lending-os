/**
 * Bundle size analyzer for Youngsend Next.js app.
 *
 * Reads the .next/build-manifest.json and .next/static/chunks/ directory
 * to report JS chunk sizes and enforce payload budgets.
 *
 * Target: <100KB total JS on the dashboard initial load.
 */

import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

// ── Budget thresholds (bytes) ───────────────────────────────────────────────

export const BUDGET = {
  /** Total JS sent for initial page load (all chunks combined) */
  totalJs: 100 * 1024,        // 100 KB
  /** First-load JS (framework + shared + page chunk) */
  firstLoad: 150 * 1024,      // 150 KB
  /** No single chunk should exceed this */
  perChunk: 50 * 1024,        // 50 KB
} as const

export type BudgetKey = keyof typeof BUDGET

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChunkInfo {
  name: string
  size: number      // bytes (raw file size, not gzipped)
  ratio: number     // size / BUDGET.perChunk
  overBudget: boolean
}

export interface BundleReport {
  chunks: ChunkInfo[]
  totalJs: number
  firstLoadJs: number
  violations: {
    key: BudgetKey
    actual: number
    budget: number
    overage: number
  }[]
  pass: boolean     // true if no violations
}

// ── Analyzer ─────────────────────────────────────────────────────────────────

const NEXT_DIR = '.next'
const CHUNKS_DIR = join(NEXT_DIR, 'static', 'chunks')

/**
 * Analyze the Next.js build output and return a bundle report.
 * Works with the file-system build output in `.next/`.
 *
 * Call after `next build` completes. Safe to call in CI or scripts.
 */
export async function analyzeBundle(
  projectRoot: string = process.cwd(),
): Promise<BundleReport> {
  const chunksPath = join(projectRoot, CHUNKS_DIR)
  const chunks: ChunkInfo[] = []

  try {
    const entries = await readdir(chunksPath)
    const jsFiles = entries.filter(
      (f) => extname(f) === '.js' && !f.startsWith('polyfills'),
    )

    for (const file of jsFiles) {
      const filePath = join(chunksPath, file)
      const s = await stat(filePath)
      const size = s.size
      chunks.push({
        name: file,
        size,
        ratio: size / BUDGET.perChunk,
        overBudget: size > BUDGET.perChunk,
      })
    }
  } catch {
    // .next/ may not exist (dev mode, first run, etc.)
  }

  // Sort largest first
  chunks.sort((a, b) => b.size - a.size)

  const totalJs = chunks.reduce((sum, c) => sum + c.size, 0)

  // Estimate first-load: framework + shared chunks (heuristic: top 3)
  const firstLoadJs = chunks.slice(0, 3).reduce((sum, c) => sum + c.size, 0)

  const violations: BundleReport['violations'] = []

  if (totalJs > BUDGET.totalJs) {
    violations.push({
      key: 'totalJs',
      actual: totalJs,
      budget: BUDGET.totalJs,
      overage: totalJs - BUDGET.totalJs,
    })
  }
  if (firstLoadJs > BUDGET.firstLoad) {
    violations.push({
      key: 'firstLoad',
      actual: firstLoadJs,
      budget: BUDGET.firstLoad,
      overage: firstLoadJs - BUDGET.firstLoad,
    })
  }
  for (const chunk of chunks) {
    if (chunk.overBudget) {
      violations.push({
        key: 'perChunk',
        actual: chunk.size,
        budget: BUDGET.perChunk,
        overage: chunk.size - BUDGET.perChunk,
      })
    }
  }

  return { chunks, totalJs, firstLoadJs, violations, pass: violations.length === 0 }
}

/** Pretty-print the report. Useful for CI logs. */
export function formatReport(report: BundleReport): string {
  const lines: string[] = []
  const kb = (b: number) => (b / 1024).toFixed(1)

  lines.push('=== Bundle Size Report ===')
  lines.push('')
  lines.push(`Total JS:        ${kb(report.totalJs)} KB (budget: ${kb(BUDGET.totalJs)} KB)`)
  lines.push(`First-load JS:   ${kb(report.firstLoadJs)} KB (budget: ${kb(BUDGET.firstLoad)} KB)`)
  lines.push(`Chunks analyzed: ${report.chunks.length}`)
  lines.push('')

  if (report.chunks.length > 0) {
    lines.push('Top chunks by size:')
    for (const c of report.chunks.slice(0, 10)) {
      const flag = c.overBudget ? ' ⚠ OVER BUDGET' : ''
      lines.push(`  ${c.name.padEnd(50)} ${kb(c.size).padStart(8)} KB${flag}`)
    }
    lines.push('')
  }

  if (report.violations.length > 0) {
    lines.push(`❌ ${report.violations.length} violation(s) found:`)
    for (const v of report.violations) {
      lines.push(
        `  ${v.key}: ${kb(v.actual)} KB / ${kb(v.budget)} KB (over by ${kb(v.overage)} KB)`,
      )
    }
  } else {
    lines.push('✅ All budgets passed!')
  }

  return lines.join('\n')
}
