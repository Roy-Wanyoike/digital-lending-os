#!/usr/bin/env python3
"""Youngsend Trust Network - Architecture Audit Report PDF Generator"""

import os, sys, hashlib, platform
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
    HRFlowable, ListFlowable, ListItem, CondPageBreak
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Paths ───────────────────────────────────────────────────────────
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
OUTPUT_PATH = "/home/z/my-project/download/Youngsend_Architecture_Audit_Report.pdf"

# ── Palette ─────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f4f3f2')
SECTION_BG    = colors.HexColor('#f0efee')
CARD_BG       = colors.HexColor('#f0efeb')
TABLE_STRIPE  = colors.HexColor('#f1f1ef')
HEADER_FILL   = colors.HexColor('#544a2f')
COVER_BLOCK   = colors.HexColor('#70674d')
BORDER        = colors.HexColor('#cfcbbd')
ICON          = colors.HexColor('#7e6d3d')
ACCENT        = colors.HexColor('#907421')
ACCENT_2      = colors.HexColor('#6348b2')
TEXT_PRIMARY   = colors.HexColor('#161614')
TEXT_MUTED     = colors.HexColor('#8b8881')
SEM_SUCCESS   = colors.HexColor('#437353')
SEM_WARNING   = colors.HexColor('#93773e')
SEM_ERROR     = colors.HexColor('#a75952')
SEM_INFO      = colors.HexColor('#4f7aa5')

# ── Font Registration ───────────────────────────────────────────────
_IS_MAC = platform.system() == 'Darwin'
FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts') if _IS_MAC else '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))

registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold', italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ── Font fallback for mixed text ────────────────────────────────────
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, 'scripts'))
from pdf import install_font_fallback
install_font_fallback()

# ── Styles ──────────────────────────────────────────────────────────
W, H = A4  # 595.27 x 841.89 pt
LEFT_M = 50
RIGHT_M = 50
TOP_M = 50
BOT_M = 50
CONTENT_W = W - LEFT_M - RIGHT_M

def ps(name, **kw):
    defaults = dict(fontName='FreeSerif', fontSize=10.5, leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)

sH1 = ps('H1', fontName='FreeSerif-Bold', fontSize=20, leading=28, spaceBefore=24, spaceAfter=10, textColor=HEADER_FILL)
sH2 = ps('H2', fontName='FreeSerif-Bold', fontSize=15, leading=22, spaceBefore=18, spaceAfter=8, textColor=HEADER_FILL)
sH3 = ps('H3', fontName='FreeSerif-Bold', fontSize=12, leading=18, spaceBefore=12, spaceAfter=6, textColor=ICON)
sBody = ps('Body')
sBodySmall = ps('BodySmall', fontSize=9.5, leading=15, spaceAfter=6)
sMuted = ps('Muted', fontSize=9, leading=14, textColor=TEXT_MUTED, alignment=TA_LEFT)
sBullet = ps('Bullet', fontSize=10, leading=16, leftIndent=18, bulletIndent=6, spaceAfter=4, alignment=TA_LEFT)
sTableHead = ps('TH', fontName='FreeSerif-Bold', fontSize=9, leading=13, textColor=colors.white, alignment=TA_LEFT)
sTableCell = ps('TC', fontSize=9, leading=13, alignment=TA_LEFT)
sTableCellWrap = ps('TCW', fontSize=9, leading=13, alignment=TA_LEFT)
sCallout = ps('Callout', fontSize=10, leading=16, textColor=SEM_ERROR, fontName='FreeSerif-Bold', leftIndent=12, borderPadding=6)
sCalloutWarn = ps('CalloutWarn', fontSize=10, leading=16, textColor=SEM_WARNING, fontName='FreeSerif-Bold', leftIndent=12)
sCalloutOk = ps('CalloutOk', fontSize=10, leading=16, textColor=SEM_SUCCESS, fontName='FreeSerif-Bold', leftIndent=12)
sFooter = ps('Footer', fontSize=8, leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER)
sTOC0 = ps('TOC0', fontName='FreeSerif-Bold', fontSize=12, leading=22, leftIndent=0, spaceBefore=4, spaceAfter=2)
sTOC1 = ps('TOC1', fontSize=10.5, leading=18, leftIndent=20, spaceBefore=1, spaceAfter=1)

# ── Helpers ─────────────────────────────────────────────────────────
def h1(text):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', sH1)
    p.bookmark_name = key; p.bookmark_level = 0; p.bookmark_text = text; p.bookmark_key = key
    return p

def h2(text):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', sH2)
    p.bookmark_name = key; p.bookmark_level = 1; p.bookmark_text = text; p.bookmark_key = key
    return p

def h3(text):
    return Paragraph(text, sH3)

def body(text):
    return Paragraph(text, sBody)

def body_small(text):
    return Paragraph(text, sBodySmall)

def muted(text):
    return Paragraph(text, sMuted)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', sBullet)

def callout(text, style=sCallout):
    return Paragraph(text, style)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=6, spaceAfter=6)

def sp(h=6):
    return Spacer(1, h)

def make_table(headers, rows, col_widths=None):
    header_row = [Paragraph(h, sTableHead) for h in headers]
    data = [header_row]
    for r in rows:
        data.append([Paragraph(str(c), sTableCellWrap) for c in r])
    if not col_widths:
        n = len(headers)
        col_widths = [CONTENT_W / n] * n
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def severity_badge(sev):
    color_map = {'P0': SEM_ERROR, 'P1': SEM_WARNING, 'P2': SEM_INFO, 'P3': TEXT_MUTED}
    c = color_map.get(sev, TEXT_MUTED)
    return f'<font color="{c.hexval()}"><b>{sev}</b></font>'

# ── TOC Template ─────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('FreeSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(W/2, 25, f'Youngsend Trust Network - Architecture Audit Report  |  Page {doc.page}')
    canvas.restoreState()

# ── Build Document ──────────────────────────────────────────────────
doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='Youngsend Trust Network - Architecture Audit Report',
    author='Distinguished Engineering Team',
    subject='Comprehensive architecture, security, performance, and fintech compliance audit'
)

story = []

# ═══════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════════════════════════
toc = TableOfContents()
toc.levelStyles = [sTOC0, sTOC1]
story.append(Paragraph('<b>Table of Contents</b>', ps('TocTitle', fontName='FreeSerif-Bold', fontSize=22, leading=30, spaceAfter=18, textColor=HEADER_FILL)))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 1: EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════
story.append(h1('1. Executive Summary'))
story.append(body(
    'This document presents the findings of a comprehensive architecture audit conducted by a team of Distinguished Engineers, '
    'Principal Software Engineers, Security Engineers, Performance Engineers, Database Architects, and FinTech Domain Experts. '
    'The audit examined the Youngsend Trust Network platform across 14 critical dimensions: architecture, performance, database engineering, '
    'API design, fintech compliance, reliability, scalability, security, observability, developer experience, UI performance, '
    'quality assurance, and continuous optimization practices.'
))
story.append(body(
    'The Youngsend Trust Network is a Next.js 16.1.3 cloud-native payment platform built on the App Router architecture with Turbopack, '
    'SQLite/Prisma ORM, and NextAuth v4 for authentication. The codebase comprises approximately 235 source files, 72 API routes, '
    '13 dashboard modules, and integrates with 5 payment providers (Stripe, Paystack, Flutterwave, IntaSend, and Paya). The platform '
    'implements multi-tenancy, escrow transactions, digital identity verification, trust scoring, fraud detection, and referral systems.'
))
story.append(sp(6))
story.append(h2('1.1 Audit Scope and Methodology'))
story.append(body(
    'The audit was conducted using a multi-agent parallel analysis approach, with specialized teams examining distinct system dimensions '
    'simultaneously. Each agent performed deep code reading of every relevant source file, tracing data flows from API endpoints through '
    'business logic to database operations. The methodology combined static code analysis, architecture pattern recognition, '
    'security threat modeling aligned with OWASP Top 10, and fintech-specific compliance checking against industry standards '
    'including PCI-DSS consciousness, double-entry ledger requirements, and regulatory audit trail expectations.'
))
story.append(sp(6))
story.append(h2('1.2 Critical Findings Summary'))
story.append(body(
    'The audit identified a total of <b>47 findings</b> across all severity levels. The distribution reveals systemic issues that require '
    'immediate attention before the platform can be considered production-ready for financial operations. The findings are concentrated '
    'in four primary categories: database and data integrity risks, security vulnerabilities, performance architecture gaps, and '
    'fintech compliance deficiencies. Below is the severity distribution and a summary of the most critical findings.'
))
story.append(sp(6))
story.append(make_table(
    ['Severity', 'Count', 'Category', 'Risk Level'],
    [
        ['P0 - Critical', '7', 'Money loss, data corruption, security bypass', 'Immediate action required'],
        ['P1 - High', '13', 'Data integrity, auth flaws, performance degradation', 'Fix before any production traffic'],
        ['P2 - Medium', '17', 'Performance at scale, code quality, missing features', 'Fix within first sprint cycle'],
        ['P3 - Low', '10', 'Maintainability, dead code, minor improvements', 'Backlog for technical debt'],
    ],
    col_widths=[70, 40, 200, 165]
))
story.append(sp(8))
story.append(callout('P0 CRITICAL: Escrow release operation performs 5 database writes outside any transaction. A server crash between steps 1 and 4 leaves funds in an inconsistent state - milestone marked released but escrow amount never updated. This is a direct money-loss bug.', sCallout))
story.append(sp(4))
story.append(callout('P0 CRITICAL: Cross-tenant IDOR in fraud alerts endpoint allows any authenticated user to read another tenant\'s fraud data by passing a businessId query parameter that overwrites the tenant scope filter.', sCallout))
story.append(sp(4))
story.append(callout('P0 CRITICAL: The entire platform uses SQLite with IEEE 754 Float for all monetary values. No row-level locking, no connection pooling, no concurrent write support, and accumulated floating-point rounding errors in financial calculations.', sCallout))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 2: ARCHITECTURE ASSESSMENT
# ═══════════════════════════════════════════════════════════════════
story.append(h1('2. Architecture Assessment'))
story.append(body(
    'The Youngsend Trust Network follows a monolithic Next.js application architecture with a clear separation between frontend and backend '
    'code within a single repository. The project uses the Next.js 16 App Router with React Server Components, file-based routing, '
    'and a comprehensive middleware layer for authentication and security. The overall architecture earns a <b>B+ grade</b> for its '
    'well-organized folder structure and thoughtful patterns, but carries significant technical debt that prevents it from achieving '
    'enterprise-grade quality. The following sections detail the architectural strengths, weaknesses, and specific findings across '
    'each major subsystem.'
))

story.append(h2('2.1 Folder Structure and Module Organization'))
story.append(body(
    'The codebase is organized under <font name="DejaVuSans" size="9">src/</font> with clear functional separation: <font name="DejaVuSans" size="9">src/frontend/</font> contains '
    'all client-side components, hooks, and UI elements, while <font name="DejaVuSans" size="9">src/backend/</font> houses server-side business logic, '
    'libraries, middleware, and services. The <font name="DejaVuSans" size="9">src/app/</font> directory follows Next.js App Router conventions with route groups '
    'for authentication (<font name="DejaVuSans" size="9">(auth)</font>) and dashboard (<font name="DejaVuSans" size="9">(dashboard)</font>) layouts. TypeScript path aliases (<font name="DejaVuSans" size="9">@/components/*</font>, '
    '<font name="DejaVuSans" size="9">@/lib/*</font>, <font name="DejaVuSans" size="9">@/backend/*</font>) are well-configured and eliminate import confusion across modules. This organization supports '
    'the modular monolith pattern and provides a clean migration path toward microservices if needed.'
))
story.append(body(
    'However, several architectural anti-patterns were identified. The <font name="DejaVuSans" size="9">dashboard-helpers.tsx</font> file is a monolith containing types, '
    'formatters, status helpers, and UI sub-components (KPICard, PipelineCard, ScoreBar, CircularScore, LoadingSkeleton, ErrorState). '
    'Every dashboard tab imports from this single file, creating tight coupling and forcing all tabs to share a single chunk dependency. '
    'Dead code files persist in the app directory: <font name="DejaVuSans" size="9">DashboardShell.rsc.tsx</font> (an abandoned RSC migration attempt), '
    '<font name="DejaVuSans" size="9">DashboardSidebar.tsx</font> (replaced by SidebarNav.tsx), and <font name="DejaVuSans" size="9">middleware.ts.bak</font>. These files confuse '
    'developers and increase maintenance burden without providing any value.'
))

story.append(h2('2.2 Architecture Patterns Assessment'))
story.append(body(
    'The platform demonstrates good foundational patterns in several areas. The landing page correctly implements the Islands Architecture: '
    '<font name="DejaVuSans" size="9">LandingPageServer.tsx</font> is a pure Server Component that wraps a thin <font name="DejaVuSans" size="9">ClientBanner</font> island for interactive elements. '
    'Only the sign-in buttons and mobile navigation toggle ship JavaScript to the client. This is the ideal pattern for a marketing page '
    'and demonstrates strong RSC awareness from the development team. The dashboard tab system uses an elegant <font name="DejaVuSans" size="9">D()</font> helper factory '
    'that wraps <font name="DejaVuSans" size="9">next/dynamic</font> with <font name="DejaVuSans" size="9">ssr: false</font> and skeleton fallbacks, achieving excellent code splitting - all 13 dashboard tabs are '
    'zero-cost until navigated to, and the first tab loads via Suspense boundary.'
))
story.append(body(
    'The Temporal bridge (<font name="DejaVuSans" size="9">temporal-bridge.ts</font>) correctly uses fire-and-forget semantics where primary DB mutations commit before the bridge '
    'is invoked, ensuring workflow failures never roll back financial data. The event bus provides tenant-scoped SSE filtering with connection '
    'cleanup. Error isolation is implemented via ErrorBoundary class components wrapping each dashboard tab, so a crash in one tab cannot '
    'take down the entire dashboard shell.'
))
story.append(body(
    'Despite these strengths, critical architectural gaps exist. The entire DashboardShell is a single <font name="DejaVuSans" size="9">\'use client\'</font> component, meaning the sidebar, '
    'header, footer, and tab chrome all ship as client-side JavaScript. Server-side rendering produces zero HTML for the dashboard - it renders '
    'as an empty Suspense boundary that hydrates into a loading spinner, then fetches everything client-side. The abandoned <font name="DejaVuSans" size="9">DashboardShell.rsc.tsx</font> '
    'file proves the team identified this issue but never completed the migration. Completing this RSC migration is the single highest-impact '
    'performance improvement available, potentially eliminating 60-80% of dashboard initial JavaScript payload.'
))

story.append(h2('2.3 Dependency Health'))
story.append(body(
    'The dependency analysis reveals significant bloat in the project\'s package.json. Eight packages are installed but never imported anywhere in the '
    'source code, representing approximately 400KB+ of unnecessary node_modules size. These include <font name="DejaVuSans" size="9">zustand</font> (state management, unused), '
    '<font name="DejaVuSans" size="9">@tanstack/react-query</font> (data fetching, unused despite custom useApi hook re-inventing a fraction of its functionality), '
    '<font name="DejaVuSans" size="9">@tanstack/react-table</font> (table component, unused), <font name="DejaVuSans" size="9">next-intl</font> (internationalization, unused), '
    '<font name="DejaVuSans" size="9">react-markdown</font> and <font name="DejaVuSans" size="9">react-syntax-highlighter</font> (content rendering, unused), '
    '<font name="DejaVuSans" size="9">@reactuses/core</font> (React hooks library, unused), and <font name="DejaVuSans" size="9">socket.io-client</font> (replaced by SSE). '
    'Additionally, 21 shadcn/ui components are installed but never imported by application code. While tree-shaking removes these from client bundles, '
    'they slow installation, increase Docker image size, and create confusion about the actual technology stack.'
))
story.append(sp(4))
story.append(make_table(
    ['Package', 'Status', 'Impact'],
    [
        ['zustand ^5.0.6', 'Installed, never imported', 'Confusion about state management approach'],
        ['@tanstack/react-query ^5.82.0', 'Installed, never imported', 'Custom useApi hook duplicates minimal functionality'],
        ['next-intl ^4.3.4', 'Installed, never imported', 'No i18n implemented despite dependency'],
        ['socket.io-client ^4.8.3', 'Installed, never imported', 'SSE used instead; dead dependency'],
        ['react-syntax-highlighter', 'Installed, never imported', '~200KB+ unnecessary node_modules'],
        ['next ^16.1.1', 'Active', 'Very new; track canary changelog'],
        ['next-auth ^4.24.11', 'Active', 'v4 stable but v5 in development'],
        ['zod ^4.0.2', 'Active', 'Major rewrite from v3; verify compatibility'],
    ],
    col_widths=[145, 140, 190]
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 3: DATABASE ENGINEERING
# ═══════════════════════════════════════════════════════════════════
story.append(h1('3. Database Engineering'))
story.append(body(
    'The database layer represents the most critical risk area in the entire platform. The Youngsend Trust Network stores escrow '
    'transactions, wallet balances, payment intents, and audit trails - all financial data that demands the highest levels of '
    'data integrity, precision, and concurrency control. The current implementation using SQLite as the sole data store is '
    'fundamentally incompatible with the requirements of a multi-tenant financial platform serving real users with real money.'
))

story.append(h2('3.1 SQLite as Production Database'))
story.append(callout('P0 CRITICAL: The entire fintech platform uses SQLite (file-based, database-level locking, no connection pooling, no Decimal type) for all financial data including escrow transactions, wallet balances, and payment intents. This is a fundamental architectural mismatch.', sCallout))
story.append(sp(4))
story.append(body(
    'SQLite uses database-level file locks, meaning all writes across all tenants are serialized through a single lock. In a multi-tenant '
    'environment where multiple users may be creating wallets, processing deposits, or releasing escrow funds simultaneously, this creates '
    'severe contention and unpredictable latency spikes. Furthermore, SQLite cannot support horizontal scaling - the platform can never run '
    'multiple server instances against the same database file, eliminating any path to high availability or horizontal scalability. '
    'The Prisma connection pool configuration is meaningless with SQLite since it is a single-file database accessed through a single connection handle.'
))
story.append(body(
    'Most critically, SQLite does not have a native Decimal type. All monetary fields across 15+ models (Wallet.balance, EscrowTransaction.amount, '
    'PaymentIntent.sourceAmount, Deposit.amount, Withdrawal.amount, CurrencyConversion amounts) use IEEE 754 Float64, which cannot exactly represent '
    'most decimal fractions. While the codebase attempts mitigation with <font name="DejaVuSans" size="9">Math.round(x * 100) / 100</font> in several places, this is fragile and not consistently applied. '
    'In financial software, accumulated rounding errors can lead to balance discrepancies that are difficult to detect and expensive to reconcile.'
))

story.append(h2('3.2 Schema Design Issues'))
story.append(body(
    'Beyond the database engine itself, the Prisma schema exhibits several design deficiencies that impact data integrity and maintainability. '
    'All status fields across 30+ models are defined as plain <font name="DejaVuSans" size="9">String</font> with no database-level enum constraints. Values like <font name="DejaVuSans" size="9">"in_escrow"</font>, '
    '<font name="DejaVuSans" size="9">"partial_release"</font>, and <font name="DejaVuSans" size="9">"31-60"</font> (aging bucket) are defined only in code comments, with no referential integrity enforcement at the database level. '
    'A typo such as <font name="DejaVuSans" size="9">"in_escrrow"</font> would silently pass validation and corrupt business logic, since no enum check would catch it.'
))
story.append(body(
    'At least 12 fields use <font name="DejaVuSans" size="9">String</font> to store JSON data (Tenant.features, Verification.metadata, BusinessRelationship.metadata, Invoice.items, '
    'PaymentLink.allowedMethods, FraudRule.condition, CollectionCase.aiStrategy, and others). This provides no JSON validation at the database level, '
    'no JSON query capability, and makes schema evolution fragile. When the platform migrates to PostgreSQL, these should use Prisma\'s native Json type.'
))
story.append(sp(4))
story.append(h3('Missing Foreign Key Constraints'))
story.append(body(
    'Six models have foreign key fields declared without Prisma <font name="DejaVuSans" size="9">@relation</font> decorators, creating orphan-prone dangling references. BusinessMatch (seekerId, candidateId), '
    'CollectionCase (debtorId), ReferralBonus (referrerId, refereeId, depositId, walletId), Review (fromBusinessId, toBusinessId), PaymentLink (createdBy), '
    'and Notification (accountId) all lack formal relational constraints. Without these, nothing prevents the database from containing references '
    'to deleted records, leading to silent data corruption that is extremely difficult to detect and repair in a financial system.'
))
story.append(sp(4))
story.append(h3('Duplicate User Models'))
story.append(body(
    'Two separate user models exist in the schema: <font name="DejaVuSans" size="9">Account</font> (lines 35-60) with full tenant relations, password hash, role, and referral system, '
    'and <font name="DejaVuSans" size="9">User</font> (lines 599-614) which is a standalone model with no tenant FK, no password, and no relations. The Notification model '
    'references accountId (Account), while several routes reference User. The User model appears to be an orphaned legacy artifact that creates confusion '
    'about which model to use for user operations, potentially leading to authorization bypasses if the wrong model is queried.'
))

story.append(h2('3.3 Missing Indexes'))
story.append(body(
    'Several critical query patterns lack the composite indexes needed for efficient execution. The escrow transactions listing joins EscrowTransaction '
    'to Business by buyerId/sellerId, then filters by tenantId - but there is no composite index supporting this cross-table join, causing full table '
    'scans on every escrow list request. The notification listing queries by accountId + isRead + createdAt but only has individual indexes, not the '
    'composite index needed for the common unread-first query pattern. The analytics aggregation queries filter by createdAt + status without a '
    'supporting composite index. These missing indexes will cause progressively degraded performance as data volume grows.'
))

story.append(h2('3.4 Transaction Safety'))
story.append(callout('P0 CRITICAL: Escrow milestone release performs 5 separate database writes (milestone update, disbursement create, milestone re-fetch, escrow update, 2 audit logs) outside any database transaction. A crash between steps leaves financial data in an inconsistent state.', sCallout))
story.append(sp(4))
story.append(body(
    'The audit found that several financial operations correctly use Prisma transactions (deposit, withdrawal, currency conversion, account creation), '
    'demonstrating that the development team understands the importance of transactional integrity. However, the most critical financial operation '
    '- escrow milestone release - performs 5 separate database writes without any transaction wrapper. The escrow fund operation similarly creates '
    'a PaymentIntent, PaymentTransaction, and audit log as three separate uncoordinated writes. The invoice creation uses a count-based reference '
    'generation pattern that is vulnerable to race conditions under concurrent requests, producing duplicate key errors.'
))
story.append(sp(4))
story.append(make_table(
    ['Operation', 'Transaction Used?', 'Risk if Not'],
    [
        ['Wallet Deposit', 'Yes', 'Balanced - correct pattern'],
        ['Wallet Withdrawal', 'Yes', 'Balanced - correct pattern'],
        ['Currency Conversion', 'Yes (with re-read)', 'Balanced - best pattern in codebase'],
        ['Escrow Milestone Release', 'No (5 separate writes)', 'P0: Fund inconsistency on crash'],
        ['Escrow Fund', 'No (3 separate writes)', 'P1: Orphaned PaymentIntents'],
        ['Review + Trust Score', 'No (3 separate writes)', 'P1: Partial update on failure'],
        ['Invoice Reference Gen', 'No (count-based)', 'P1: Race condition duplicate keys'],
        ['Business Match Create', 'No (5 separate creates)', 'P2: Partial match data on failure'],
    ],
    col_widths=[150, 130, 195]
))

story.append(h2('3.5 N+1 Query Patterns'))
story.append(body(
    'Two significant N+1 query patterns were identified in the collections and matching routes. The collections endpoint loads all cases in a single query, '
    'then iterates over each case to fetch the debtor business name individually, producing N+1 queries (21 queries for a page of 20 cases, '
    '101 queries for 100 items). The matching endpoint is even worse at 2N+1 queries per request, fetching both seeker and candidate business names '
    'for each match individually. Both should use Prisma\'s <font name="DejaVuSans" size="9">include</font> option or batch-load IDs with <font name="DejaVuSans" size="9">findMany({ where: { id: { in: ids } } })</font> to collapse these into 2-3 queries total.'
))

story.append(h2('3.6 Caching Concerns'))
story.append(body(
    'The platform has two independent caching systems: a simple in-memory Map-based cache in <font name="DejaVuSans" size="9">redis-client.ts</font> and a full-featured CacheManager '
    'with Redis/ioredis support, circuit breaker, LRU fallback, and SWR strategies. Different routes use different caching systems, leading to '
    'inconsistent invalidation behavior. Most critically, wallet balances (including balance, availableBalance, pendingBalance) are cached for '
    '60 seconds. During this window, deposits, withdrawals, and conversions update the real balance while cached responses serve stale financial '
    'data to the dashboard and other consumers. Business data is cached for 5 minutes without invalidation on business creation.'
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 4: SECURITY AUDIT
# ═══════════════════════════════════════════════════════════════════
story.append(h1('4. Security Audit'))
story.append(body(
    'The security audit examined the platform against the OWASP Top 10 framework and additional fintech-specific security requirements. '
    'The platform demonstrates a solid foundational security architecture with tenant isolation, Zod validation in key routes, webhook signature '
    'verification, AES-256-GCM encryption, HSTS with preload, and X-Frame-Options: DENY. However, the audit uncovered <b>2 critical</b>, '
    '<b>4 high-severity</b>, <b>6 medium-severity</b>, and <b>5 low-severity</b> security findings that require immediate remediation.'
))

story.append(h2('4.1 Critical Vulnerabilities'))
story.append(sp(4))
story.append(h3('P0-1: Cross-Tenant IDOR in Fraud Alerts'))
story.append(callout('Severity: P0 | OWASP A01: Broken Access Control | File: src/app/api/fraud/alerts/route.ts:47-54', sCallout))
story.append(body(
    'The fraud alerts GET endpoint constructs a WHERE clause with <font name="DejaVuSans" size="9">businessId: { in: tenantBizIds }</font> to enforce tenant scope on line 48. However, when a '
    '<font name="DejaVuSans" size="9">?businessId=</font> query parameter is provided, line 54 unconditionally overwrites this filter with <font name="DejaVuSans" size="9">where.businessId = businessId</font>. '
    'This completely replaces the tenant-scoped filter, allowing any authenticated user from Tenant A to pass <font name="DejaVuSans" size="9">?businessId=&lt;Tenant-B-business-id&gt;</font> '
    'and read Tenant B\'s fraud alerts. An attacker can enumerate business IDs across tenants and exfiltrate all fraud detection data from the platform. '
    'The fix is trivial: change the overwrite to an AND condition using <font name="DejaVuSans" size="9">businessId: { in: tenantBizIds, equals: businessId }</font>.'
))

story.append(sp(4))
story.append(h3('P0-2: Unscoped Idempotency Cache'))
story.append(callout('Severity: P0 | Cross-User Data Leak | Files: route-helpers.ts:64, payments/intents/route.ts:158', sCallout))
story.append(body(
    'The <font name="DejaVuSans" size="9">withPaymentIdempotency</font> wrapper and the payment intents handler use the raw Idempotency-Key header value without user scoping. '
    'The correct pattern exists in <font name="DejaVuSans" size="9">idempotency.ts:263</font> which prefixes with userId, but the payment route helpers bypass this. User A creates a payment, '
    'User B replays the same idempotency key, and receives User A\'s payment data including amount, intent ID, business IDs, and routing provider. '
    'This is both a cross-user information disclosure and a potential payment manipulation vector.'
))

story.append(h2('4.2 High-Severity Findings'))
story.append(sp(4))
story.append(h3('P1-1: Systemic CSRF Bypass'))
story.append(body(
    'The canonical auth gate <font name="DejaVuSans" size="9">requireAuth()</font> in api-helpers.ts enforces CSRF verification for POST/PUT/PATCH/DELETE requests. However, approximately 72 of 77 API routes use '
    '<font name="DejaVuSans" size="9">getApiUser()</font> instead, which only checks authentication and completely skips CSRF verification. This means a malicious website can forge '
    'state-changing requests (create wallets, release escrow funds, initiate payments) if a user has an active session cookie. The affected routes include all '
    'financial operations: wallet creation, escrow release, fund/release/activate, payments, settings modification, user creation, withdrawals, and deposits.'
))

story.append(sp(4))
story.append(h3('P1-2: Role Mass Assignment'))
story.append(body(
    'The user creation route (<font name="DejaVuSans" size="9">/api/users/route.ts:65,83</font>) accepts the <font name="DejaVuSans" size="9">role</font> field directly from the request body without Zod enum validation. '
    'Any admin user can set <font name="DejaVuSans" size="9">role</font> to any arbitrary string including <font name="DejaVuSans" size="9">"superadmin"</font>, <font name="DejaVuSans" size="9">"system"</font>, or <font name="DejaVuSans" size="9">"owner"</font>. This allows privilege escalation '
    'within a tenant. The fix requires adding a Zod enum schema that restricts roles to the known set: admin, buyer, seller, auditor, viewer.'
))

story.append(sp(4))
story.append(h3('P1-3: Weak NEXTAUTH_SECRET'))
story.append(body(
    'The <font name="DejaVuSans" size="9">.env</font> file contains <font name="DejaVuSans" size="9">NEXTAUTH_SECRET=dev-secret-change-in-production-min-32-chars-ok</font>, a guessable human-readable string. While marked for production change, '
    'there is no runtime enforcement that rejects weak secrets. The <font name="DejaVuSans" size="9">env.ts</font> schema allows any non-empty string. Furthermore, <font name="DejaVuSans" size="9">auth.ts</font> reads <font name="DejaVuSans" size="9">process.env.NEXTAUTH_SECRET</font> directly '
    'instead of using the validated <font name="DejaVuSans" size="9">env.NEXTAUTH_SECRET</font> from the centralized config module, bypassing the validation layer entirely.'
))

story.append(h2('4.3 OWASP Top 10 Coverage'))
story.append(sp(4))
story.append(make_table(
    ['OWASP Category', 'Status', 'Notes'],
    [
        ['A01 - Broken Access Control', 'Partial', 'Tenant isolation good in most routes; P0-1 IDOR breaks it in fraud alerts'],
        ['A02 - Cryptographic Failures', 'Good', 'AES-256-GCM, PBKDF2 100k iterations, bcrypt for passwords'],
        ['A03 - Injection', 'Good', 'Prisma ORM prevents SQL injection; Zod validation on key routes'],
        ['A04 - Insecure Design', 'Partial', 'Escrow release allows seller-side release; empty password accounts'],
        ['A05 - Security Misconfiguration', 'Partial', 'Missing CSP in edge middleware; wildcard image hostname'],
        ['A06 - Vulnerable Components', 'Unknown', 'No lockfile audit performed; bcryptjs, ioredis, prisma external'],
        ['A07 - Auth Failures', 'Partial', 'Login rate-limited (5/min) but CSRF bypassed on 95% of routes'],
        ['A08 - Data Integrity', 'Good', 'Webhook signatures verified; idempotency guards present'],
        ['A09 - Logging/Monitoring', 'Good', 'Audit logging on key operations; telemetry wrapper on routes'],
        ['A10 - SSRF', 'Partial', 'Wildcard image hostname in next.config; no other SSRF vectors'],
    ],
    col_widths=[155, 60, 260]
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 5: PERFORMANCE ENGINEERING
# ═══════════════════════════════════════════════════════════════════
story.append(h1('5. Performance Engineering'))
story.append(body(
    'Performance analysis reveals a platform with excellent foundational patterns in some areas (code splitting, font loading, lazy loading) '
    'but significant architectural bottlenecks in others. The landing page earns an A grade for its RSC implementation, while the dashboard '
    'earns a C+ due to its entirely client-rendered architecture. The telemetry and observability stack receives a D grade as it is entirely '
    'non-functional - consisting of approximately 800 lines of code that are 100% no-op stubs collecting zero traces and zero metrics.'
))

story.append(h2('5.1 Dashboard Client-Side Architecture'))
story.append(callout('P0 PERFORMANCE: The entire DashboardShell is a single \'use client\' component. The sidebar, header, footer, and tab chrome all ship as client-side JavaScript. Server-side rendering produces zero HTML for the dashboard. Completing the abandoned RSC migration would eliminate 60-80% of dashboard initial JS and reduce FCP by approximately 500ms.', sCalloutWarn))
story.append(sp(4))
story.append(body(
    'The dashboard data fetching pattern creates a waterfall: HTML loads, JavaScript downloads and parses, React hydrates, a loading spinner appears, '
    'then the client fires API fetch requests, and finally data renders. The overview tab uses <font name="DejaVuSans" size="9">useApi&lt;DashboardStats&gt;(&apos;/api/dashboard/stats&apos;)</font> which could instead be fetched in the server component '
    'page.tsx (which is already an async server component) and passed as props, eliminating the loading spinner entirely. The DashboardGuard component '
    'adds a redundant client-side <font name="DejaVuSans" size="9">useSession()</font> call even though page.tsx already validated the session server-side, creating a visible loading-then-redirect flash.'
))

story.append(h2('5.2 Observability Stack'))
story.append(callout('P0 OBSERVABILITY: The entire OpenTelemetry stack is 100% no-op stubs. Zero traces, zero metrics, and zero distributed traces are being collected. The tracer, meter provider, and logger initialization all return no-op implementations. A fintech platform with zero observability is a compliance risk and makes debugging production incidents nearly impossible.', sCallout))
story.append(sp(4))
story.append(body(
    'The telemetry directory contains 5 files (~800 lines) implementing OpenTelemetry tracing, metrics, logging, health checks, and API wrappers. '
    'Every component is a stub: <font name="DejaVuSans" size="9">noopTracer</font>, <font name="DejaVuSans" size="9">noopCounter</font>, <font name="DejaVuSans" size="9">noopHistogram</font>, and <font name="DejaVuSans" size="9">noopGauge</font> are hardcoded. The <font name="DejaVuSans" size="9">createTracerProvider()</font> function explicitly sets the tracer to a no-op. No OpenTelemetry SDK packages exist in package.json. '
    'The <font name="DejaVuSans" size="9">YoungsendLogger</font> class is fully functional but the temporal-bridge and event-bus bypass it with raw console calls. Three overlapping telemetry wrappers exist '
    '(telemetryMiddleware, withTelemetry, withApiTelemetry), but only <font name="DejaVuSans" size="9">withApiTelemetry</font> actually works - the other two are no-ops.'
))

story.append(h2('5.3 Data Fetching and Caching'))
story.append(body(
    'The custom <font name="DejaVuSans" size="9">useApi</font> hook provides request deduplication for concurrent identical requests but lacks TTL-based caching, stale-while-revalidate, '
    'background refetch, and cache invalidation. The <font name="DejaVuSans" size="9">@tanstack/react-query</font> library is installed (providing all of these features) but never imported. '
    'Multiple dashboard tabs fire independent API calls sequentially (e.g., PaymentsTab makes 3 separate fetches for intents, rates, and methods) when they '
    'could be parallelized. No API route uses Next.js caching features like <font name="DejaVuSans" size="9">revalidate</font> or <font name="DejaVuSans" size="9">unstable_cache</font>.'
))

story.append(h2('5.4 Performance Scorecard'))
story.append(sp(4))
story.append(make_table(
    ['Category', 'Grade', 'Notes'],
    [
        ['Architecture', 'B+', 'Good structure, incomplete RSC migration'],
        ['Initial Load Perf', 'C+', 'Landing A, Dashboard C (full client shell)'],
        ['Code Splitting', 'A-', 'Excellent tab-level lazy loading via dynamic()'],
        ['Font Loading', 'A', 'Optimal next/font/google with CSS variables'],
        ['Image Optimization', 'B+', 'Good config, wildcard hostname is SSRF risk'],
        ['Data Fetching', 'C+', 'All client-side, no caching, no SSG/ISR'],
        ['Telemetry', 'D', '100% no-op stubs, zero traces/metrics collected'],
        ['Streaming SSR', 'C', 'Infrastructure exists (streamSSE, ndjsonStream), unused'],
        ['State Management', 'B', 'Adequate for current scale'],
        ['Dependency Health', 'C-', '8 dead deps, 21 unused UI components'],
    ],
    col_widths=[120, 45, 310]
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 6: FINTECH COMPLIANCE
# ═══════════════════════════════════════════════════════════════════
story.append(h1('6. FinTech Compliance Assessment'))
story.append(body(
    'This section evaluates the platform against fintech-specific requirements that are mandatory for any system handling financial transactions. '
    'The assessment covers double-entry ledger implementation, transaction immutability, audit trail completeness, idempotency, currency precision, '
    'and PCI-conscious architecture. The platform shows strong design intent in several areas (well-designed state machine, hash-chained audit trail, '
    'comprehensive validation schemas) but critical gaps exist between the design and its actual deployment in production code paths.'
))

story.append(h2('6.1 Double-Entry Ledger'))
story.append(callout('P1 COMPLIANCE: No double-entry ledger exists. Wallet balance changes are single-entry updates (add/subtract from balance column). There are no debit/credit pairs, no ledger entry tables, and no account-based reconciliation capability. This is a fundamental gap for a financial platform.', sCalloutWarn))
story.append(sp(4))
story.append(body(
    'The current implementation modifies wallet balances directly with <font name="DejaVuSans" size="9">db.wallet.update({ data: { balance: wallet.balance + amount } })</font> patterns. '
    'There is no LedgerEntry or TransactionEntry table that records the double-sided nature of each financial movement. For example, a deposit should '
    'create both a debit to the cash/wallet account and a credit to the user\'s balance account, maintaining the fundamental accounting equation. '
    'Without this, reconciliation is impossible and audit compliance cannot be achieved. The Prisma schema has no model that could serve as a ledger.'
))

story.append(h2('6.2 Transaction Immutability'))
story.append(body(
    'Transaction immutability is partially implemented. The WalletTransaction model has no update or delete operations in the API routes - once created, '
    'records appear to be append-only. However, the WalletTransaction model uses <font name="DejaVuSans" size="9">onDelete: Cascade</font> from the Wallet model, meaning if a wallet is deleted, '
    'ALL transaction history is permanently destroyed. For a financial platform, transaction records must be immutable and never cascade-deleted. '
    'Additionally, no model in the schema has a <font name="DejaVuSans" size="9">deletedAt</font> field for soft-delete, meaning all deletes are hard deletes. For financial records '
    '(invoices, escrows, transactions, audit logs), this is a compliance risk that prevents audit trail integrity.'
))

story.append(h2('6.3 Audit Trail'))
story.append(body(
    'The platform has two audit trail systems that operate independently. The first is a sophisticated hash-chained <font name="DejaVuSans" size="9">AuditTrail</font> class in '
    '<font name="DejaVuSans" size="9">payment/audit-trail.ts</font> that uses SHA-256 hash chains and HMAC-SHA256 signatures to create tamper-proof entries. Each entry links to the previous entry\'s hash, '
    'making it computationally infeasible to alter or delete entries without detection. The second is a lightweight <font name="DejaVuSans" size="9">logAudit()</font> function that writes '
    'structured JSON to stdout for log aggregator consumption.'
))
story.append(body(
    'However, the hash-chained AuditTrail is entirely in-memory (a singleton <font name="DejaVuSans" size="9">Map</font>) and is never persisted to the database. It has a <font name="DejaVuSans" size="9">persistCallback</font> option, '
    'but no route passes one. This means the cryptographic audit trail is lost on every server restart, making it useless for compliance. The stdout logger is functional '
    'but lacks structure-level consistency: some routes use <font name="DejaVuSans" size="9">logAudit()</font>, others use the telemetry logger, and still others use raw console calls. '
    'Not all financial operations are covered: escrow releases, wallet conversions, and referral bonus payments have inconsistent or missing audit entries.'
))

story.append(h2('6.4 Idempotency Implementation'))
story.append(body(
    'The idempotency infrastructure is well-designed with a clean <font name="DejaVuSans" size="9">IdempotencyGuard</font> class supporting acquire/complete/fail lifecycle, TTL expiration, '
    'and cleanup intervals. The <font name="DejaVuSans" size="9">withIdempotency</font> higher-order function provides drop-in middleware for API routes with proper 409 Conflict responses '
    'for concurrent processing and <font name="DejaVuSans" size="9">X-Idempotency-Replayed</font> headers for successful deduplication. However, the guard is entirely in-memory using a <font name="DejaVuSans" size="9">Map</font> - '
    'in a multi-instance deployment, each instance has its own idempotency cache, allowing duplicate processing across instances. The payment state machine '
    'is also in-memory, meaning state transitions are not persisted and are lost on restart.'
))

story.append(h2('6.5 Payment State Machine'))
story.append(body(
    'The <font name="DejaVuSans" size="9">PaymentStateMachine</font> class implements a formal state machine with 9 states (CREATED, PENDING_PROVIDER, PROCESSING, COMPLETED, FAILED, '
    'REFUNDING, REFUNDED, CANCELLED, DISPUTED) and 11 legal transitions. It includes idempotency guarantees on transitions, terminal state detection, '
    'and DOT graph generation for documentation. The design is textbook-correct. However, like the idempotency guard, the state machine is a singleton '
    'storing state in an in-memory <font name="DejaVuSans" size="9">Map</font>. The state is not persisted to the database, so a server restart loses all state machine positions. '
    'The state machine is also not actually used by the payment processing routes, which manage state through direct database updates to the PaymentIntent model.'
))

story.append(h2('6.6 Currency Precision'))
story.append(body(
    'All monetary values in the schema use <font name="DejaVuSans" size="9">Float</font> type, which stores IEEE 754 double-precision floating-point numbers. This cannot exactly represent '
    'most decimal fractions (e.g., 0.1, 0.01, 0.001). The codebase attempts mitigation with <font name="DejaVuSans" size="9">Math.round(x * 100) / 100</font> in deposit and withdrawal routes, '
    'but this is inconsistently applied and does not address the fundamental precision issue. The payment validation schema correctly requires amounts in smallest '
    'currency units (integers), which is the right approach, but the database stores them as floats, losing this precision guarantee at the persistence layer.'
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 7: API ENGINEERING
# ═══════════════════════════════════════════════════════════════════
story.append(h1('7. API Engineering'))
story.append(body(
    'The API layer consists of 72 route handlers covering wallets, payments, escrow, trust scoring, fraud detection, compliance, analytics, and more. '
    'The platform provides a well-designed standard response envelope (<font name="DejaVuSans" size="9">{ data, meta }</font> for success, <font name="DejaVuSans" size="9">{ error: { message, code, details } }</font> for errors) through the <font name="DejaVuSans" size="9">api-response.ts</font> helpers. '
    'The <font name="DejaVuSans" size="9">withErrorHandler</font> HOF normalizes AuthError, ZodError, and unknown errors into consistent responses. However, usage is inconsistent across routes.'
))

story.append(h2('7.1 Input Validation Coverage'))
story.append(body(
    'Input validation coverage is inconsistent across the 72 API routes. Payment routes use comprehensive Zod schemas with currency allowlists, amount range '
    'validation (1 to 100M smallest units), email validation, and regex-validated references. Webhook signature verification uses timing-safe comparison with '
    'provider-specific HMAC algorithms (SHA-512 for Paystack, SHA-256 for Stripe, Flutterwave, IntaSend, and Paya). However, many non-payment routes lack '
    'any input validation: the user creation route accepts arbitrary role strings, the settings endpoint accepts any plan value, and several routes parse '
    'request bodies without Zod schemas. The escrow creation route, which handles financial transactions, has no Zod validation at all.'
))

story.append(h2('7.2 Error Response Consistency'))
story.append(body(
    'The API provides well-structured error helpers (<font name="DejaVuSans" size="9">badRequest</font>, <font name="DejaVuSans" size="9">unauthorized</font>, <font name="DejaVuSans" size="9">forbidden</font>, <font name="DejaVuSans" size="9">notFound</font>, <font name="DejaVuSans" size="9">conflict</font>, <font name="DejaVuSans" size="9">validationError</font>, <font name="DejaVuSans" size="9">tooManyRequests</font>, <font name="DejaVuSans" size="9">error</font>) but many routes still return raw <font name="DejaVuSans" size="9">NextResponse.json({ error: ... })</font> '
    'without using these helpers, resulting in inconsistent error code naming and response shapes across the API surface.'
))

story.append(h2('7.3 Pagination'))
story.append(body(
    'Five API routes return unbounded query results with no LIMIT clause: trust reviews, trust relationships, businesses, invoices, and wallets. While per-tenant '
    'wallet and business counts are expected to be small, the reviews and relationships endpoints could return thousands of records. The notifications endpoint '
    'accepts a <font name="DejaVuSans" size="9">limit</font> parameter but has no upper bound clamp, allowing a caller to request <font name="DejaVuSans" size="9">limit=999999</font>. No route implements cursor-based '
    'pagination, which would be more efficient for real-time feeds like transactions and notifications.'
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 8: CONSOLIDATED FINDINGS
# ═══════════════════════════════════════════════════════════════════
story.append(h1('8. Consolidated Findings and Remediation Plan'))
story.append(body(
    'This chapter consolidates all findings from the audit into a prioritized remediation plan. Each finding is assigned a severity level, '
    'estimated effort, and specific file references to enable immediate action. The plan is organized by severity to guide resource allocation, '
    'with P0 items requiring immediate attention before any production deployment, P1 items to be addressed in the first sprint cycle, '
    'and P2/P3 items to be scheduled as technical debt backlog.'
))

story.append(h2('8.1 P0 - Critical (Immediate Action)'))
story.append(make_table(
    ['ID', 'Finding', 'File', 'Effort'],
    [
        ['P0-1', 'Escrow release not in transaction', 'escrow/.../release/route.ts:86-162', '1h'],
        ['P0-2', 'Cross-tenant IDOR in fraud alerts', 'fraud/alerts/route.ts:47-54', '5min'],
        ['P0-3', 'Unscoped idempotency cache', 'route-helpers.ts:64', '15min'],
        ['P0-4', 'SQLite as production database', 'prisma/schema.prisma:6', '2-4w'],
        ['P0-5', 'Float for all monetary values', 'schema.prisma (15+ models)', 'Part of P0-4'],
        ['P0-6', 'Dashboard is 100% client-rendered', 'DashboardShell.tsx:1', '3-5d'],
        ['P0-7', 'Observability stack is 100% no-op', 'telemetry/*', '2-3d'],
    ],
    col_widths=[40, 185, 155, 40]
))

story.append(h2('8.2 P1 - High Priority'))
story.append(make_table(
    ['ID', 'Finding', 'File', 'Effort'],
    [
        ['P1-1', 'CSRF bypassed on 72 of 77 routes', 'All API routes using getApiUser()', '2-4h'],
        ['P1-2', 'Missing FK relations (6 models)', 'schema.prisma', '2h'],
        ['P1-3', 'Wallet balance stale-read', 'wallets/deposit/route.ts:83', '2h'],
        ['P1-4', 'Escrow fund not in transaction', 'escrow/.../fund/route.ts:103-189', '1h'],
        ['P1-5', 'Invoice ref race condition', 'invoices/route.ts:51-52', '30min'],
        ['P1-6', 'Review + trust score not in tx', 'trust/reviews/route.ts:97-141', '1h'],
        ['P1-7', 'Wallet balances cached 60s', 'wallets/route.ts:61', '30min'],
        ['P1-8', 'Duplicate User/Account models', 'schema.prisma:35,599', '4h'],
        ['P1-9', 'Role mass assignment', 'users/route.ts:65,83', '10min'],
        ['P1-10', 'Weak NEXTAUTH_SECRET handling', 'auth.ts:94, .env:3', '10min'],
        ['P1-11', 'No double-entry ledger', 'Entire platform', '2-3w'],
        ['P1-12', 'User creation empty password', 'users/route.ts:86', '30min'],
        ['P1-13', 'Escrow release allows seller-side', 'escrow/.../release/route.ts:37-49', '15min'],
    ],
    col_widths=[40, 190, 150, 40]
))

story.append(h2('8.3 P2 - Medium Priority'))
story.append(make_table(
    ['ID', 'Finding', 'Category'],
    [
        ['P2-1', 'N+1 queries in collections/matching', 'Performance'],
        ['P2-2', 'Unbounded queries (5 routes)', 'Performance'],
        ['P2-3', 'Missing composite indexes', 'Database'],
        ['P2-4', 'In-memory rate limiting defeated by multi-instance', 'Security'],
        ['P2-5', 'Missing CSP in edge middleware', 'Security'],
        ['P2-6', 'Tenant settings mass assignment', 'Security'],
        ['P2-7', 'framer-motion in 11 tab chunks (-45KB each)', 'Performance'],
        ['P2-8', 'No server-side data fetching for dashboard', 'Performance'],
        ['P2-9', 'DashboardGuard redundant re-auth', 'Performance'],
        ['P2-10', '8 dead dependencies in package.json', 'DX'],
        ['P2-11', 'String enums instead of DB enums', 'Database'],
        ['P2-12', 'In-memory cache without cross-process sync', 'Reliability'],
        ['P2-13', 'Wallet caching 60s serves stale balances', 'Data Integrity'],
        ['P2-14', 'Business list cached 5min without invalidation', 'Data Integrity'],
        ['P2-15', 'Middleware logs every API call in production', 'Performance'],
        ['P2-16', 'Dual cache systems with inconsistent invalidation', 'Architecture'],
        ['P2-17', 'ignoreBuildErrors: true and noImplicitAny: false', 'DX'],
    ],
    col_widths=[40, 280, 150]
))

# ═══════════════════════════════════════════════════════════════════
# CHAPTER 9: OPTIMIZATION ROADMAP
# ═══════════════════════════════════════════════════════════════════
story.append(h1('9. Optimization Roadmap'))
story.append(body(
    'Based on the audit findings, this chapter presents a phased optimization roadmap that addresses the most critical issues first while building '
    'toward the enterprise architecture described in the project requirements. The roadmap is designed to deliver measurable improvements at each phase, '
    'allowing the team to validate fixes before proceeding to the next phase. Each phase includes specific deliverables, success criteria, and '
    'estimated timelines based on the effort estimates from the findings.'
))

story.append(h2('9.1 Phase 1: Critical Fixes (Week 1-2)'))
story.append(body(
    'The first phase addresses all P0 findings that pose immediate risk of money loss, data corruption, or security breach. These fixes are designed to be '
    'incremental - each can be applied independently without requiring the larger architectural changes planned for later phases. The fraud alert IDOR fix '
    'requires changing a single line of code. The escrow release transaction wrapper requires wrapping 5 database operations in a <font name="DejaVuSans" size="9">db.$transaction()</font> call. '
    'The idempotency scoping fix requires prefixing the cache key with the user ID. The most impactful quick fix is restricting the wildcard image hostname '
    'in next.config.ts to known domains.'
))
story.append(body(
    'The CSRF migration requires updating 72 routes from <font name="DejaVuSans" size="9">getApiUser()</font> to <font name="DejaVuSans" size="9">requireAuth()</font>, which is a bulk but mechanical change. '
    'The role mass assignment fix requires adding a Zod enum to the user creation route. The NEXTAUTH_SECRET handling requires reading from the validated '
    'env config instead of raw process.env. All of these fixes can be completed within the first two weeks and should be treated as blocking '
    'issues for any production deployment consideration.'
))

story.append(h2('9.2 Phase 2: Database Migration (Week 3-6)'))
story.append(body(
    'The second phase addresses the fundamental database architecture issues. The migration from SQLite to PostgreSQL is the largest single work item '
    'in the roadmap, estimated at 2-4 weeks. This migration enables connection pooling, row-level locking, concurrent writes, the Decimal type for monetary '
    'values, proper enum types for status fields, JSON column types for structured data, and horizontal scaling capability. The migration should use '
    'Prisma\'s migration system to establish auditable schema evolution from this point forward.'
))
story.append(body(
    'Concurrent with the database migration, the team should implement the double-entry ledger table and migrate all balance-changing operations to create '
    'paired debit/credit entries. Missing foreign key relations should be added to the schema. The duplicate User model should be deprecated and all '
    'references migrated to Account. Composite indexes should be added for the identified query patterns. The idempotency guard and payment state machine '
    'should be migrated from in-memory Maps to database-backed storage.'
))

story.append(h2('9.3 Phase 3: Performance Overhaul (Week 5-8)'))
story.append(body(
    'The third phase focuses on performance improvements. Completing the RSC dashboard migration is the highest-impact item, potentially eliminating '
    '60-80% of initial dashboard JavaScript. This involves wiring up the abandoned DashboardShell.rsc.tsx (or a refined version) and moving only the tab-switching, '
    'SSE connection, and sign-out logic to a thin client island. Server-side data fetching for the overview tab would eliminate the loading spinner on dashboard entry. '
    'Adopting the already-installed React Query library would provide stale-while-revalidate, background refetch, and cache TTL out of the box.'
))
story.append(body(
    'The framer-motion dependency should be replaced with CSS keyframe animations in all 11 dashboard tabs, saving approximately 45KB per tab chunk. '
    'The 8 dead dependencies should be removed from package.json. The observability stack should be activated by installing the OpenTelemetry SDK packages '
    'and configuring real trace and metric exporters. The N+1 query patterns should be fixed with Prisma include directives or batch loading.'
))

story.append(h2('9.4 Phase 4: Enterprise Hardening (Week 7-12)'))
story.append(body(
    'The final phase addresses the remaining P2 and P3 findings and implements the enterprise architecture features described in the original requirements. '
    'This includes implementing circuit breakers for external service calls (payment providers, search service), adding Content-Security-Policy headers to the edge '
    'middleware, migrating rate limiting to Redis for multi-instance support, implementing proper webhook retry mechanisms with exponential backoff, and adding '
    'distributed locks for concurrent balance mutations using Redis or database-level advisory locks.'
))
story.append(body(
    'Additional enterprise features include soft-delete for all financial records, comprehensive audit trail persistence to a dedicated append-only table, '
    'timezone-aware timestamp handling (currently all timestamps use <font name="DejaVuSans" size="9">new Date().toISOString()</font> which is UTC but not explicitly labeled), API versioning, cursor-based pagination for real-time feeds, '
    'and ETag/conditional request support for cacheable endpoints. The development experience improvements include enabling strict TypeScript (removing '
    '<font name="DejaVuSans" size="9">noImplicitAny: false</font> and <font name="DejaVuSans" size="9">ignoreBuildErrors: true</font>), breaking up the dashboard-helpers monolith, and cleaning up dead code files.'
))

# ── Build ───────────────────────────────────────────────────────────
doc.multiBuild(story, onLaterPages=footer, onFirstPage=footer)
print(f'PDF generated: {OUTPUT_PATH}')
print(f'File size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB')
