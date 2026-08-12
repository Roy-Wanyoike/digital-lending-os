/**
 * Phase 11A: WCAG 2.2 AA Accessibility Audit — Static Analysis Tests
 *
 * These tests perform static source-code analysis of all page.tsx files and
 * key components to verify accessibility compliance. Since the test environment
 * is Node (not jsdom), we parse the TSX source as strings.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ─── Helpers ───────────────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '../../src')

/** Read file content or return empty string if not found */
function read(file: string): string {
  try { return fs.readFileSync(path.join(SRC, file), 'utf-8') }
  catch { return '' }
}

/** Find all page.tsx files under src/app */
function getPageFiles(): string[] {
  const files: string[] = []
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === 'page.tsx') files.push(path.relative(SRC, full))
    }
  }
  walk(path.join(SRC, 'app'))
  return files
}

/** Read all page files as { path, content }[] */
function getPages(): { path: string; content: string }[] {
  return getPageFiles().map(p => ({ path: p, content: read(p) }))
}

/** Read a component file */
function comp(name: string): string {
  return read(name)
}

// ════════════════════════════════════════════════════════════════════════
// 11A.1: Image alt text
// ════════════════════════════════════════════════════════════════════════

describe('11A.1: All images have alt text', () => {
  it('no <img> tags without alt attribute exist in page files', () => {
    const pages = getPages()
    const violations: string[] = []
    for (const { path: p, content } of pages) {
      // Match <img without alt (allow alt="" as valid)
      const imgMatches = content.match(/<img\s[^>]*>/g)
      if (imgMatches) {
        for (const img of imgMatches) {
          if (!/alt\s*=/.test(img)) {
            violations.push(`${p}: ${img.slice(0, 80)}`)
          }
        }
      }
    }
    expect(violations, 'Found <img> without alt attribute').toEqual([])
  })

  it('decorative SVGs have aria-hidden="true"', () => {
    const pages = getPages()
    const violations: string[] = []
    // Look for inline SVGs that are purely decorative (icons in spans/divs without text)
    // but missing aria-hidden. We check specific patterns known to be decorative.
    for (const { path: p, content } of pages) {
      // The not-found page has an SVG icon that should have aria-hidden
      if (p === 'app/not-found.tsx') {
        // Find SVG tags without aria-hidden
        const svgMatches = content.match(/<svg[^>]*>/g)
        if (svgMatches) {
          for (const svg of svgMatches) {
            if (!/aria-hidden/.test(svg)) {
              violations.push(`${p}: SVG missing aria-hidden: ${svg.slice(0, 60)}`)
            }
          }
        }
      }
    }
    expect(violations, 'Found decorative SVGs without aria-hidden').toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.2: Form inputs have associated labels
// ════════════════════════════════════════════════════════════════════════

describe('11A.2: Form inputs have associated labels', () => {
  it('login page inputs have htmlFor/id associations', () => {
    const content = read('app/(auth)/login/page.tsx')
    // Should have Label with htmlFor="email" and Input with id="email"
    expect(content).toContain('htmlFor="email"')
    expect(content).toContain('id="email"')
    expect(content).toContain('htmlFor="password"')
    expect(content).toContain('id="password"')
  })

  it('register page inputs have htmlFor/id associations', () => {
    const content = read('app/(auth)/register/page.tsx')
    expect(content).toContain('htmlFor="tenantName"')
    expect(content).toContain('htmlFor="ownerName"')
    expect(content).toContain('htmlFor="email"')
    expect(content).toContain('htmlFor="password"')
    expect(content).toContain('htmlFor="confirmPassword"')
  })

  it('payment checkout page payer inputs have htmlFor/id associations', () => {
    const content = read('app/pay/[ref]/page.tsx')
    // Payer name, email, amount inputs should have id + label htmlFor
    expect(content).toContain('htmlFor="payerName"')
    expect(content).toContain('id="payerName"')
    expect(content).toContain('htmlFor="payerEmail"')
    expect(content).toContain('id="payerEmail"')
  })

  it('conversion page form fields have htmlFor/id associations', () => {
    const content = read('app/(dashboard)/conversion/page.tsx')
    expect(content).toContain('htmlFor="fromWallet"')
    expect(content).toContain('id="fromWallet"')
    expect(content).toContain('htmlFor="amount"')
    expect(content).toContain('id="amount"')
  })

  it('deposits page form fields have htmlFor/id associations', () => {
    const content = read('app/(dashboard)/deposits/page.tsx')
    expect(content).toContain('htmlFor="walletId"')
    expect(content).toContain('id="walletId"')
    expect(content).toContain('htmlFor="depAmount"')
    expect(content).toContain('id="depAmount"')
  })

  it('withdrawals page form fields have htmlFor/id associations', () => {
    const content = read('app/(dashboard)/withdrawals/page.tsx')
    expect(content).toContain('htmlFor="walletId"')
    expect(content).toContain('id="walletId"')
    expect(content).toContain('htmlFor="wdAmount"')
    expect(content).toContain('id="wdAmount"')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.3: Interactive elements have accessible names
// ════════════════════════════════════════════════════════════════════════

describe('11A.3: Interactive elements have accessible names', () => {
  it('icon-only buttons have aria-label', () => {
    const pages = getPages()
    const violations: string[] = []
    for (const { path: p, content } of pages) {
      // Find button tags with only an icon child (no text content)
      // Look for pattern: <button ...>  <Icon ... /> </button>
      const btnMatches = content.match(/<button[^>]*>[\s\S]*?<\/button>/g)
      if (btnMatches) {
        for (const btn of btnMatches) {
          // If button has no visible text (only whitespace, icons, or <span className="sr-only">)
          const textContent = btn
            .replace(/<[^>]+>/g, '')
            .trim()
          if (textContent === '' && !/aria-label/.test(btn) && !/aria-labelledby/.test(btn)) {
            violations.push(`${p}: ${btn.slice(0, 100)}`)
          }
        }
      }
    }
    expect(violations, 'Found icon-only buttons without aria-label').toEqual([])
  })

  it('mobile menu toggle has aria-label', () => {
    const content = read('app/LandingPage.tsx')
    expect(content).toContain('aria-label="Toggle menu"')
  })

  it('dashboard sidebar open button has aria-label', () => {
    const content = read('app/DashboardShell.tsx')
    expect(content).toContain('aria-label="Open navigation menu"')
  })

  it('theme toggle has accessible name', () => {
    const content = comp('frontend/components/theme-toggle.tsx')
    // Should have either aria-label or sr-only text
    expect(content).toMatch(/aria-label|sr-only/)
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.4: No positive tabIndex values
// ════════════════════════════════════════════════════════════════════════

describe('11A.4: No positive tabIndex values', () => {
  it('no tabIndex > 0 in source files', () => {
    const pages = getPages()
    const violations: string[] = []
    for (const { path: p, content } of pages) {
      if (/tabIndex=\s*[1-9]/.test(content)) {
        violations.push(p)
      }
    }
    expect(violations, 'Found positive tabIndex values').toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.5: All links have href or are buttons
// ════════════════════════════════════════════════════════════════════════

describe('11A.5: All links have href or are buttons', () => {
  it('no <a> tags without href in page files', () => {
    const pages = getPages()
    const violations: string[] = []
    for (const { path: p, content } of pages) {
      const aMatches = content.match(/<a\s[^>]*>/g)
      if (aMatches) {
        for (const a of aMatches) {
          if (!/href\s*=/.test(a) && !/onClick/.test(a)) {
            violations.push(`${p}: ${a.slice(0, 80)}`)
          }
        }
      }
    }
    expect(violations, 'Found <a> tags without href or onClick').toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.6: No autofocus on non-essential elements
// ════════════════════════════════════════════════════════════════════════

describe('11A.6: No autofocus on non-essential elements', () => {
  it('no autoFocus or autofocus attributes in page files', () => {
    const pages = getPages()
    const violations: string[] = []
    for (const { path: p, content } of pages) {
      if (/autoFocus|autofocus/i.test(content)) {
        violations.push(p)
      }
    }
    expect(violations, 'Found autofocus on non-essential elements').toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.7: Button components use type="button" or are submit buttons
// ════════════════════════════════════════════════════════════════════════

describe('11A.7: Button component type safety', () => {
  it('Button component renders native <button> by default', () => {
    const content = comp('frontend/components/ui/button.tsx')
    // Should use Slot from Radix or native button
    expect(content).toMatch(/asChild.*Slot|Comp.*button/)
  })

  it('native <button> elements in forms have explicit type', () => {
    // Check login and register forms - submit buttons should have type="submit"
    const login = read('app/(auth)/login/page.tsx')
    expect(login).toContain('type="submit"')

    const register = read('app/(auth)/register/page.tsx')
    expect(register).toContain('type="submit"')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.8: Dialog has role="dialog" and aria-modal (via Radix)
// ════════════════════════════════════════════════════════════════════════

describe('11A.8: Dialog accessibility (Radix-based)', () => {
  it('Dialog uses @radix-ui/react-dialog which provides role and aria-modal', () => {
    const content = comp('frontend/components/ui/dialog.tsx')
    expect(content).toContain('@radix-ui/react-dialog')
  })

  it('Dialog close button has sr-only text', () => {
    const content = comp('frontend/components/ui/dialog.tsx')
    expect(content).toContain('sr-only')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.9: Proper heading hierarchy
// ════════════════════════════════════════════════════════════════════════

describe('11A.9: Proper heading hierarchy', () => {
  it('each page has at least one <h1>', () => {
    const pages = getPages()
    const noH1: string[] = []
    for (const { path: p, content } of pages) {
      if (path.basename(p) !== 'page.tsx') continue
      // Skip the root page (it delegates to LandingPage or DashboardShell)
      if (p === 'app/page.tsx') continue
      if (!/<h1[\s>]/.test(content)) {
        noH1.push(p)
      }
    }
    expect(noH1, 'Pages missing <h1> element').toEqual([])
  })

  it('forgot-password page has <h1> not CardTitle', () => {
    const content = read('app/(auth)/forgot-password/page.tsx')
    expect(content).toMatch(/<h1[\s>]/)
  })

  it('not-found page has <h1> not CardTitle', () => {
    const content = read('app/not-found.tsx')
    expect(content).toMatch(/<h1[\s>]/)
  })

  it('error page has <h1>', () => {
    const content = read('app/error.tsx')
    expect(content).toMatch(/<h1[\s>]/)
  })

  it('pay page has <h1> before <h2>', () => {
    const content = read('app/pay/[ref]/page.tsx')
    const h1Index = content.indexOf('<h1')
    const h2Index = content.indexOf('<h2')
    // h1 should exist and come before h2
    expect(h1Index).toBeGreaterThanOrEqual(0)
    if (h2Index >= 0) {
      expect(h1Index).toBeLessThan(h2Index)
    }
  })

  it('dashboard OverviewTab does not use <h1> after shell h2 (should use h3)', () => {
    const content = comp('frontend/components/dashboard/OverviewTab.tsx')
    // OverviewTab is rendered inside DashboardShell which already has h2 in the header
    // It should NOT have h1 since the sidebar already has h1
    expect(content).not.toContain('<h1')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.10: Color contrast — verify status colors use AA-compliant classes
// ════════════════════════════════════════════════════════════════════════

describe('11A.10: Color contrast verification', () => {
  // Tailwind CSS 4 color values (approximate hex)
  const COLORS: Record<string, string> = {
    'emerald-700': '#047857',
    'emerald-400': '#34d399',
    'red-700': '#b91c1c',
    'red-400': '#f87171',
    'blue-700': '#1d4ed8',
    'blue-400': '#60a5fa',
    'amber-700': '#b45309',
    'amber-400': '#fbbf24',
    'slate-600': '#475569',
    'slate-400': '#94a3b8',
    'emerald-300': '#6ee7b7',
    'red-300': '#fca5a5',
    'blue-300': '#93c5fd',
    'amber-300': '#fcd34d',
  }

  /**
   * Calculate relative luminance per WCAG 2.1
   * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
   */
  function relativeLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const linearize = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  }

  /** Calculate contrast ratio between two colors */
  function contrastRatio(hex1: string, hex2: string): number {
    const l1 = relativeLuminance(hex1)
    const l2 = relativeLuminance(hex2)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  it('dark mode trust score colors meet AA 4.5:1 against dark background', () => {
    // Dark background is approximately #09090b (zinc-950)
    const darkBg = '#09090b'
    const pairs: [string, string][] = [
      ['emerald-400', COLORS['emerald-400']],
      ['amber-400', COLORS['amber-400']],
      ['orange-400 is not in formatters but check red-400', COLORS['red-400']],
      ['red-400', COLORS['red-400']],
    ]
    for (const [name, color] of pairs) {
      const ratio = contrastRatio(color, darkBg)
      expect(ratio, `${name} (${color}) on dark bg has ratio ${ratio.toFixed(2)}:1, needs 4.5:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('light mode trust score colors meet AA 4.5:1 against light background', () => {
    // Light background is approximately #ffffff
    const lightBg = '#ffffff'
    const pairs: [string, string][] = [
      ['emerald-700', COLORS['emerald-700']],
      ['amber-700', COLORS['amber-700']],
      ['red-700', COLORS['red-700']],
    ]
    for (const [name, color] of pairs) {
      const ratio = contrastRatio(color, lightBg)
      expect(ratio, `${name} (${color}) on white bg has ratio ${ratio.toFixed(2)}:1, needs 4.5:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('status text colors (700-shade) meet AA 4.5:1 against white background', () => {
    // getStatusColor uses text-700 on bg-100 for badges.
    // The text-700 shades are designed for text on light backgrounds.
    const whiteBg = '#ffffff'
    const textColorPairs = [
      ['emerald-700', COLORS['emerald-700']],
      ['red-700', COLORS['red-700']],
      ['blue-700', COLORS['blue-700']],
      ['amber-700', COLORS['amber-700']],
      ['slate-600', COLORS['slate-600']],
    ]
    for (const [name, color] of textColorPairs) {
      const ratio = contrastRatio(color, whiteBg)
      expect(ratio, `${name} (${color}) on white: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('dark mode status text colors (400-shade) meet AA against dark background', () => {
    const darkBg = '#09090b'
    const textColorPairs = [
      ['emerald-400', COLORS['emerald-400']],
      ['red-400', COLORS['red-400']],
      ['blue-400', COLORS['blue-400']],
      ['amber-400', COLORS['amber-400']],
      ['slate-400', COLORS['slate-400']],
    ]
    for (const [name, color] of textColorPairs) {
      const ratio = contrastRatio(color, darkBg)
      expect(ratio, `${name} (${color}) on dark: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.11: Root layout has lang attribute and meta viewport
// ════════════════════════════════════════════════════════════════════════

describe('11A.11: Root layout accessibility fundamentals', () => {
  it('html element has lang="en"', () => {
    const content = read('app/layout.tsx')
    expect(content).toContain('lang="en"')
  })

  it('root layout has skip-to-content link', () => {
    const content = read('app/layout.tsx')
    expect(content).toContain('Skip to main content')
    expect(content).toContain('href="#main-content"')
  })

  it('has proper metadata with description', () => {
    const content = read('app/layout.tsx')
    expect(content).toContain('description:')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.12: Form error messages use ARIA attributes
// ════════════════════════════════════════════════════════════════════════

describe('11A.12: Form error messages use proper ARIA attributes', () => {
  it('login form errors use role="alert" and aria-describedby', () => {
    const content = read('app/(auth)/login/page.tsx')
    expect(content).toContain('role="alert"')
    expect(content).toContain('aria-invalid')
    expect(content).toContain('aria-describedby')
  })

  it('register form errors use role="alert" and aria-describedby', () => {
    const content = read('app/(auth)/register/page.tsx')
    expect(content).toContain('role="alert"')
    expect(content).toContain('aria-invalid')
    expect(content).toContain('aria-describedby')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.13: Navigation has aria-label
// ════════════════════════════════════════════════════════════════════════

describe('11A.13: Navigation regions have aria-label', () => {
  it('landing page navs have aria-label', () => {
    const content = read('app/LandingPageServer.tsx')
    expect(content).toContain('aria-label="Legal links"')
  })

  it('landing client navs have aria-label', () => {
    const content = read('app/LandingPage.tsx')
    expect(content).toContain('aria-label="Main navigation"')
    expect(content).toContain('aria-label="Mobile navigation"')
  })

  it('dashboard sidebar has aria-label', () => {
    const content = comp('frontend/components/dashboard/SidebarNav.tsx')
    expect(content).toContain('aria-label="Dashboard navigation"')
  })

  it('dashboard shell sidebar has aria-label', () => {
    const content = read('app/DashboardShell.tsx')
    expect(content).toContain('aria-label="Sidebar navigation"')
  })
})

// ════════════════════════════════════════════════════════════════════════
// 11A.14: main-content landmark exists
// ════════════════════════════════════════════════════════════════════════

describe('11A.14: Main content landmark', () => {
  it('landing page has id="main-content" on <main>', () => {
    const content = read('app/LandingPageServer.tsx')
    expect(content).toContain('id="main-content"')
  })

  it('dashboard shell has id="main-content" on <main>', () => {
    const content = read('app/DashboardShell.tsx')
    expect(content).toContain('id="main-content"')
  })

  it('privacy page has id="main-content" on <main>', () => {
    const content = read('app/privacy/page.tsx')
    expect(content).toContain('id="main-content"')
  })

  it('terms page has id="main-content" on <main>', () => {
    const content = read('app/terms/page.tsx')
    expect(content).toContain('id="main-content"')
  })

  it('pay page has id="main-content" on <main>', () => {
    const content = read('app/pay/[ref]/page.tsx')
    expect(content).toContain('id="main-content"')
  })
})
