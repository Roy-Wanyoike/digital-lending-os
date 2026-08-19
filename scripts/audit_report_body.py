#!/usr/bin/env python3
"""Youngsend Fintech Platform - Architecture Audit Report (Body)"""
import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FONTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FONT_DIR = '/usr/share/fonts/truetype'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/dejavu/DejaVuSans.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold')

# Font fallback for mixed text
from reportlab.pdfbase.pdfmetrics import getFont
from reportlab.lib.fonts import addMapping
addMapping('FreeSerif', 0, 0, 'FreeSerif')
addMapping('FreeSerif', 1, 0, 'FreeSerif-Bold')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CASCADE PALETTE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_BG      = colors.HexColor('#f6f6f7')
SECTION_BG   = colors.HexColor('#e8eaeb')
CARD_BG      = colors.HexColor('#e3e6e8')
TABLE_STRIPE = colors.HexColor('#eaedee')
HEADER_FILL  = colors.HexColor('#3e4f57')
COVER_BLOCK  = colors.HexColor('#4f5d65')
BORDER       = colors.HexColor('#a7bac3')
ICON         = colors.HexColor('#3b7795')
ACCENT       = colors.HexColor('#2982ae')
ACCENT_2     = colors.HexColor('#bd2f47')
TEXT_PRIMARY  = colors.HexColor('#17191a')
TEXT_MUTED    = colors.HexColor('#848a8e')
SEM_SUCCESS  = colors.HexColor('#508a64')
SEM_WARNING  = colors.HexColor('#ac8c4e')
SEM_ERROR    = colors.HexColor('#a1554e')
SEM_INFO     = colors.HexColor('#56799c')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
W, H = A4
LEFT_M = 55*mm
RIGHT_M = 45*mm
TOP_M = 40*mm
BOT_M = 45*mm
CONTENT_W = W - LEFT_M - RIGHT_M

def ps(name, **kw):
    defaults = dict(fontName='FreeSerif', fontSize=10.5, leading=17, textColor=TEXT_PRIMARY, alignment=TA_LEFT)
    defaults.update(kw)
    return ParagraphStyle(name, **defaults)

sH1 = ps('H1', fontName='FreeSerif-Bold', fontSize=20, leading=28, spaceAfter=8, spaceBefore=18, textColor=HEADER_FILL)
sH2 = ps('H2', fontName='FreeSerif-Bold', fontSize=14, leading=20, spaceAfter=6, spaceBefore=14, textColor=HEADER_FILL)
sH3 = ps('H3', fontName='FreeSerif-Bold', fontSize=11.5, leading=17, spaceAfter=4, spaceBefore=10, textColor=ACCENT)
sBody = ps('Body', alignment=TA_JUSTIFY, spaceAfter=6, firstLineIndent=0)
sBodyIndent = ps('BodyIndent', alignment=TA_JUSTIFY, spaceAfter=6, leftIndent=12)
sBullet = ps('Bullet', leftIndent=18, bulletIndent=6, spaceAfter=3, bulletFontSize=10)
sCell = ps('Cell', fontSize=9.5, leading=14, alignment=TA_LEFT)
sCellC = ps('CellC', fontSize=9.5, leading=14, alignment=TA_CENTER)
sHeader = ps('TH', fontName='FreeSerif-Bold', fontSize=9.5, leading=14, textColor=colors.white, alignment=TA_CENTER)
sCaption = ps('Caption', fontSize=9, leading=13, textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=10)
sCallout = ps('Callout', fontSize=10, leading=15, textColor=ACCENT, leftIndent=14, borderPadding=6, spaceBefore=6, spaceAfter=6)
sFooter = ps('Footer', fontSize=8, leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOC TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

toc_level0 = ParagraphStyle('TOC0', fontName='FreeSerif-Bold', fontSize=12, leading=20, leftIndent=0, textColor=TEXT_PRIMARY)
toc_level1 = ParagraphStyle('TOC1', fontName='FreeSerif', fontSize=10.5, leading=18, leftIndent=20, textColor=TEXT_MUTED)

def heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def body(text):
    return Paragraph(text, sBody)

def bullet(text):
    return Paragraph(text, sBullet)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=8, spaceBefore=8)

def make_table(headers, rows, col_widths=None):
    if col_widths is None:
        n = len(headers)
        col_widths = [CONTENT_W / n] * n
    data = [[Paragraph(f'<b>{h}</b>', sHeader) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), sCell) if not isinstance(c, Paragraph) else c for c in row])
    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def sev_table(rows, col_widths=None):
    """Severity table with color-coded first column."""
    if col_widths is None:
        col_widths = [65, CONTENT_W - 65]
    data = []
    for sev, desc in rows:
        sev_color = SEM_ERROR if 'CRITICAL' in sev else (SEM_WARNING if 'HIGH' in sev else (SEM_INFO if 'MEDIUM' in sev else TEXT_MUTED))
        data.append([
            Paragraph(f'<b>{sev}</b>', ps('sev', fontName='FreeSerif-Bold', fontSize=9, textColor=sev_color, alignment=TA_CENTER, leading=13)),
            Paragraph(desc, sCell)
        ])
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    for i in range(len(data)):
        bg = colors.white if i % 2 == 0 else TABLE_STRIPE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('FreeSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(W / 2, 25*mm, f'Youngsend Fintech Platform Architecture Audit Report  |  Page {doc.page}')
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(LEFT_M, 30*mm, W - RIGHT_M, 30*mm)
    canvas.restoreState()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD STORY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story = []

# --- TABLE OF CONTENTS ---
toc = TableOfContents()
toc.levelStyles = [toc_level0, toc_level1]
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════
# CHAPTER 1: EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════
story.append(heading('1. Executive Summary', sH1, 0))
story.append(body(
    'This report presents the findings of a comprehensive architecture audit conducted on the Youngsend Fintech Platform, '
    'a Next.js 16.1.3 application built with the App Router paradigm, Prisma ORM, and SQLite for data persistence. The platform '
    'serves as a multi-tenant financial technology solution encompassing payment processing, escrow management, digital wallets, '
    'compliance screening, fraud detection, and business trust graphing across 76 API routes, 30 database models, and 13 '
    'dashboard tabs. The audit was performed by a team of Principal QA Engineers and a Distinguished Engineer, examining every '
    'layer of the system from infrastructure configuration through frontend rendering.'
))
story.append(body(
    'The platform demonstrates several commendable architectural decisions: consistent tenant isolation across 82 API route '
    'handlers, Zod input validation on all mutation endpoints, a formal payment state machine with idempotent replay, '
    'graceful degradation patterns for non-critical services (cache, search, Temporal), and an elegant lazy-loaded tab '
    'architecture with per-tab error boundaries. The codebase is well-organized with clear separation between backend and '
    'frontend source trees, and the deployment story includes a properly structured multi-stage Dockerfile.'
))
story.append(body(
    'However, the audit has uncovered <b>50+ findings</b> spanning six severity levels, with <b>10 critical issues</b> that represent '
    'immediate blockers for production deployment. The most severe findings include: the complete absence of double-entry '
    'bookkeeping in a financial platform, race conditions in wallet deposit and withdrawal flows that can cause lost updates '
    'under concurrency, non-atomic database operations in escrow release and webhook processing that can leave the system in '
    'inconsistent states, an IDOR vulnerability in the audit-log endpoint that exposes cross-tenant financial data, CSRF '
    'protection bypass on 18 of 76 API routes, and a fully non-functional observability stack where all OpenTelemetry '
    'tracing and metrics are no-op stubs.'
))

story.append(heading('1.1 Severity Distribution', sH2, 1))
story.append(make_table(
    ['Severity', 'Count', 'Description'],
    [
        ['CRITICAL', '10', 'Blockers that must be fixed before production deployment'],
        ['HIGH', '15', 'Significant risks requiring immediate remediation'],
        ['MEDIUM', '18', 'Issues that should be addressed in the near term'],
        ['LOW', '12+', 'Nice-to-have improvements and code quality concerns'],
    ],
    [80, 50, CONTENT_W - 130]
))
story.append(Spacer(1, 4*mm))

# ═══════════════════════════════════════════════════
# CHAPTER 2: ARCHITECTURE OVERVIEW
# ═══════════════════════════════════════════════════
story.append(heading('2. Architecture Overview', sH1, 0))
story.append(body(
    'The Youngsend platform follows a <b>custom hybrid architecture</b> that does not conform to any single established pattern '
    'such as Clean Architecture, MVC, or Hexagonal Architecture. Instead, it employs a pragmatic Next.js App Router monolith '
    'with a physical separation between server-side code (src/backend/) and client-side code (src/frontend/). API routes in '
    'src/app/api/ serve as controllers, while src/backend/lib/ houses business logic including payment processing, authentication, '
    'caching, telemetry, and validation modules. Notably, there is <b>no repository layer</b> and <b>no dependency injection</b>: all '
    '82 API route files directly import the Prisma database client (db) and make data access calls without any abstraction layer.'
))

story.append(heading('2.1 Technology Stack', sH2, 1))
story.append(make_table(
    ['Layer', 'Technology', 'Version', 'Assessment'],
    [
        ['Framework', 'Next.js (App Router)', '16.1.3', 'Current; RSC support immature'],
        ['Language', 'TypeScript', '5.x', 'Strict mode partially undermined'],
        ['ORM', 'Prisma', '6.11.1', 'Good; no migration files exist'],
        ['Database', 'SQLite', 'Built-in', 'Not suitable for production fintech'],
        ['Auth', 'NextAuth v4', '4.24.11', 'Not officially React 19 compatible'],
        ['UI Library', 'shadcn/ui + Radix', 'Latest', 'Excellent component quality'],
        ['Animation', 'Framer Motion', '12.23.2', 'Overkill for fade animations'],
        ['Charts', 'Recharts', '2.15.4', 'Heavy; only used in one tab'],
        ['Validation', 'Zod', '4.0.2', 'Breaking v4; may conflict with form libs'],
        ['CSS', 'Tailwind CSS', '4.x', 'Config file is dead code'],
        ['State', 'Custom useApi hook', 'N/A', 'Lightweight; replaces React Query'],
        ['Cache', 'Custom (Redis + LRU)', 'N/A', 'Good architecture; Redis not configured'],
        ['Workflow', 'Temporal (optional)', '1.21.0', 'Graceful fallback; mock compliance'],
        ['Search', 'OpenSearch (optional)', 'N/A', 'In-memory fallback; tenant-scoped'],
    ],
    [65, 100, 55, CONTENT_W - 220]
))
story.append(Spacer(1, 3*mm))

story.append(heading('2.2 Architectural Inconsistencies', sH2, 1))
story.append(body(
    'The audit identified several organizational inconsistencies that indicate the codebase evolved rapidly without a unified '
    'architectural governance process. The dashboard-helpers.tsx file, which contains React component logic (KPICard, '
    'PipelineCard, ScoreBar, CircularScore) alongside pure utility functions (formatCurrency, formatDate, getStatusBadgeVariant), '
    'resides in the backend directory (src/backend/lib/) despite being exclusively consumed by client components. Two landing page '
    'implementations coexist (LandingPage.tsx and LandingPageServer.tsx) with unclear ownership. A DashboardShell.rsc.tsx file '
    'exists as an unused server-component proof-of-concept that duplicates the active DashboardShell.tsx. The API stats route has '
    'both route.ts and route-optimized.ts in the same directory. Environment variable access is inconsistent: env.ts provides '
    'a centralized Zod-validated env object, but config.ts and several route handlers read process.env directly.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 3: PROJECT STRUCTURE & DEPENDENCIES
# ═══════════════════════════════════════════════════
story.append(heading('3. Project Structure and Dependencies', sH1, 0))

story.append(heading('3.1 Directory Organization', sH2, 1))
story.append(body(
    'The project uses a src/ root with three main subtrees: app/ (Next.js App Router pages and API routes), backend/ (server-side '
    'logic, middleware, services), and frontend/ (client-side components and hooks). The app/api/ subtree contains 76 route files '
    'organized by domain (payments, wallets, escrow, compliance, fraud, etc.), each following a consistent handler pattern with '
    'Zod validation and telemetry wrapping. The frontend/components/ directory houses 40+ shadcn/ui primitives and 13 dashboard tab '
    'components, all dynamically imported. The backend/lib/ directory contains 20+ modules covering payment processing (5 provider '
    'integrations), caching (Redis + in-memory LRU), telemetry (logger, metrics, tracer), temporal workflows, and search.'
))
story.append(body(
    'However, several directories contain files that should not be in version control: tool-results/ (200+ tool output files), '
    'download/ (QA screenshots and PDFs), agent-ctx/ (agent task descriptions), and db/ (SQLite database file). None of '
    'these are listed in .gitignore. Additionally, ghost path aliases exist in tsconfig.json for two non-existent directories '
    '(@/frontend/types/* and @/frontend/utils/*), and the ESLint configuration has all 30+ rules set to "off", providing '
    'zero automated code quality enforcement.'
))

story.append(heading('3.2 Unused Dependencies', sH2, 1))
story.append(body(
    'A significant portion of the declared dependencies are never imported in the source code, adding an estimated 500KB+ to the '
    'production bundle. These unused packages include major libraries such as @tanstack/react-query (~40KB gzipped), '
    '@tanstack/react-table (~45KB gzipped), react-syntax-highlighter (~100KB+ gzipped), @mdxeditor/editor (~200KB+ gzipped), '
    'socket.io-client (~20KB gzipped), zustand (~3KB), @dnd-kit/core + sortable + utilities (~22KB combined), @reactuses/core '
    '(~8KB), iron-session (~5KB), next-intl (~25KB), react-markdown (~35KB), and uuid (~3KB). The zustand and react-query '
    'packages suggest an abandoned state management migration, as the codebase relies entirely on a custom useApi hook for '
    'data fetching and local useState for component state.'
))

story.append(heading('3.3 Version Conflicts and Incompatibilities', sH2, 1))
story.append(sev_table([
    ('CRITICAL', 'typescript.ignoreBuildErrors: true in next.config.ts silently suppresses all TypeScript errors in production builds, undermining type safety entirely.'),
    ('CRITICAL', 'noImplicitAny: false in tsconfig.json completely undermines the strict: true setting, allowing implicit any types throughout the codebase.'),
    ('HIGH', 'Zod v4.0.2 is a major breaking change with a different API surface. React-hook-form and @hookform/resolvers expect Zod v3, creating potential runtime failures.'),
    ('HIGH', 'tailwind.config.ts is dead code under Tailwind v4, which uses CSS-based configuration. The tailwindcss-animate dependency is unused.'),
    ('HIGH', 'next-auth@4.24.11 was built for React 18 and is not officially compatible with React 19. Type-unsafe (token as any) casts suggest compatibility hacks.'),
    ('HIGH', 'prisma CLI is in dependencies instead of devDependencies. @types/bcryptjs is also misplaced in runtime dependencies.'),
    ('MEDIUM', 'images.remotePatterns allows hostname: "**" in next.config.ts, creating an SSRF risk via the Next.js image proxy.'),
]))
story.append(Spacer(1, 3*mm))

# ═══════════════════════════════════════════════════
# CHAPTER 4: DATABASE ENGINEERING
# ═══════════════════════════════════════════════════
story.append(heading('4. Database Engineering', sH1, 0))

story.append(heading('4.1 Schema Analysis', sH2, 1))
story.append(body(
    'The Prisma schema defines 30 models spanning 16 functional modules: multi-tenancy (Tenant, Account), commerce passport '
    '(Business, CommercePassport, Verification, ComplianceDocument), trust graph (TrustScore, BusinessRelationship, '
    'ReputationEvent, Review), AI smart escrow (EscrowTransaction, EscrowMilestone, Disbursement, Dispute, EscrowAuditLog), '
    'payment router (PaymentIntent, PaymentTransaction, CurrencyRate, PaymentMethod), digital twin (FinancialDigitalTwin, '
    'FinancialMetric, FinancialPrediction, FinancialSnapshot), users and roles (User), payment links (PaymentLink, '
    'PaymentLinkPayment), wallets (Wallet, WalletTransaction, Deposit, Withdrawal, CryptoWithdrawal, CurrencyConversion), '
    'fraud (FraudAlert, FraudRule), matching (BusinessMatch), collections (CollectionCase, CollectionReminder), compliance '
    '(ComplianceRule, ComplianceScreening), referral (ReferralBonus), notifications (Notification), and subscriptions (Subscription).'
))

story.append(heading('4.2 Critical Schema Deficiencies', sH2, 1))
story.append(sev_table([
    ('CRITICAL', 'No Prisma enum types defined. All 40+ status, role, and type fields use untyped String with only application-level Zod validation. Database-level constraint enforcement is absent.'),
    ('CRITICAL', '11 models have dangling foreign key strings without Prisma @relation decorators: Review, User, PaymentLink, PaymentMethod, FraudAlert, CollectionCase, Subscription, BusinessMatch, ComplianceScreening, ReferralBonus, and Notification. Referential integrity is not enforced at the database level.'),
    ('CRITICAL', 'All monetary values use Float type, introducing floating-point precision errors. For a financial platform, this is unacceptable; values should use Integer (cents) or the platform should migrate to PostgreSQL with Decimal/Numeric types.'),
    ('CRITICAL', 'No migration files exist. Schema is pushed directly via "prisma db push --accept-data-loss", providing zero rollback capability, no migration history, and no schema version tracking.'),
    ('HIGH', 'No soft delete implementation. All deletions are hard deletes via cascade rules. For a fintech platform subject to regulatory data retention requirements, this is a compliance risk.'),
    ('HIGH', '23 JSON-as-String fields (SQLite has no native JSON) should be normalized. Invoice.items, PaymentLink.allowedMethods, GlobalPaymentMethod.countries/currencies, and FraudRule.condition are candidates for junction tables.'),
    ('MEDIUM', 'Missing composite indexes: Notification [accountId, isRead, createdAt], EscrowTransaction [buyerId, status], PaymentTransaction [provider, providerTxId].'),
]))
story.append(Spacer(1, 3*mm))

story.append(heading('4.3 Race Conditions in Financial Operations', sH2, 1))
story.append(body(
    'The most dangerous finding in the database layer concerns <b>race conditions in wallet deposit and withdrawal flows</b>. In both '
    'wallets/deposit/route.ts and wallets/withdrawal/route.ts, the current wallet balance is read <b>outside</b> the Prisma '
    '$transaction block (e.g., line 43 in deposit route) and then used <b>inside</b> the transaction to calculate the new balance '
    '(e.g., line 103). Under concurrent requests, this creates a classic lost-update scenario: two simultaneous deposits of 100 '
    'each on a wallet with balance 500 would both read 500, compute 600, and write 600, losing one deposit. The convert route '
    'correctly re-reads wallets inside the transaction, but the deposit and withdrawal routes do not. This is a data integrity '
    'vulnerability that could result in real financial loss in production.'
))

story.append(heading('4.4 Non-Atomic Multi-Step Operations', sH2, 1))
story.append(body(
    'Several critical financial operations consist of multiple database writes that are not wrapped in a single transaction. The escrow '
    'release handler (escrow/transactions/[id]/release/route.ts, lines 86-136) performs 4 separate database operations: milestone '
    'status update, disbursement creation, escrow status update, and two audit log entries. If any operation fails mid-sequence, the '
    'escrow state becomes inconsistent. Similarly, the Stripe webhook handler (payments/webhooks/stripe/route.ts, lines 47-143) '
    'performs up to 10 sequential database operations without a transaction: finding and updating the transaction, updating the '
    'payment intent, finding and updating the escrow, creating audit logs, and updating payment link records. A crash or error at '
    'any point leaves the system in an undefined state with no automatic recovery mechanism.'
))

story.append(heading('4.5 Double-Entry Ledger Assessment', sH2, 1))
story.append(body(
    'The platform uses a <b>single-entry wallet model</b> with Wallet.balance (a Float field) and WalletTransaction records that log '
    'balance changes with before/after snapshots. There is no Ledger model, no LedgerEntry with debit/credit columns, no chart of '
    'accounts, and no account-level reconciliation. Deposits credit a wallet with no corresponding debit entry identifying the cash-in '
    'source. Withdrawals debit a wallet with no corresponding credit entry for the cash-out destination. The conversion '
    'operation is the only partially balanced transaction, but only within the platform boundary. There are no reconciliation '
    'mechanisms, no daily balance snapshots, no automated verification (SUM(credits) - SUM(debits) = current_balance), and no '
    'external provider settlement matching. For a fintech platform handling real money, the absence of double-entry bookkeeping '
    'is a fundamental architectural gap that makes financial auditing, dispute resolution, and regulatory compliance impossible.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 5: API ENGINEERING & SECURITY
# ═══════════════════════════════════════════════════
story.append(heading('5. API Engineering and Security', sH1, 0))

story.append(heading('5.1 API Route Inventory', sH2, 1))
story.append(body(
    'The platform exposes 76 API route files under src/app/api/, organized into 24 domain groups. Of these, 4 routes are fully '
    'public (health, ready, auth, webhooks), while the remaining 72 require authentication. However, a critical split exists in how '
    'authentication is enforced: 18 route files use getApiUser() (which returns null on failure but performs no CSRF verification), '
    'while only 5 routes use requireAuth() (which enforces both authentication and CSRF for mutation operations). This means that <b>all '
    'POST/PUT/PATCH/DELETE operations in 18 route files skip CSRF verification</b>, making them vulnerable to cross-origin request '
    'forgery attacks. The affected routes include high-value operations such as escrow creation, payment link management, wallet '
    'creation, user management, business creation, and invoice generation.'
))

story.append(heading('5.2 Security Vulnerabilities (OWASP Top 10)', sH2, 1))
story.append(sev_table([
    ('CRITICAL', 'IDOR vulnerability in /api/audit-log (route.ts:18-28): Any authenticated user can read audit logs for ANY escrow by providing the escrowId query parameter. The tenant-scoping OR clause is bypassed when escrowId is present, and user.id (Account ID) is incorrectly compared to buyerId/sellerId (Business IDs).'),
    ('CRITICAL', 'CSRF bypass on 18 route files using getApiUser() instead of requireAuth(). State-changing operations (POST/PUT/PATCH/DELETE) for escrows, payment links, wallets, users, businesses, invoices, and notifications can be forged via cross-origin requests.'),
    ('HIGH', 'Edge middleware authentication is cookie-presence-only (middleware.ts:162-173). It does not validate the JWT signature. A crafted cookie with any value passes the middleware check; real validation only happens at the Node.js handler level.'),
    ('HIGH', 'No Content-Security-Policy header configured for a fintech application handling financial data. Both next.config.ts and middleware.ts set security headers but omit CSP entirely.'),
    ('HIGH', 'JWT does not reflect role changes for up to 24 hours. Session claims (role, tenantId) are set at JWT creation time (auth.ts:96-112) and never refreshed. A demoted admin retains admin access until re-authentication.'),
    ('HIGH', 'Registration endpoint (tenants/route.ts:61-201) has no password complexity requirements. Password is passed directly to bcrypt.hash() without length or complexity validation.'),
    ('HIGH', 'Role name case inconsistency: some routes check user.role !== "admin" (lowercase) while others check user.role !== "SUPER_ADMIN" (uppercase). No normalization creates potential authorization bypass if roles are stored inconsistently.'),
    ('MEDIUM', 'No Zod validation on 10+ routes including tenants POST, tenants PATCH, businesses PUT, settings PATCH, and notifications POST. Raw body values are passed directly to Prisma.'),
    ('MEDIUM', 'In-memory rate limiting (both middleware Map and auth rate-limiter) is not distributed. In multi-instance deployment, an attacker gets N times the rate limit where N is the instance count.'),
    ('MEDIUM', 'x-forwarded-for header is trusted without validation (middleware.ts:117), allowing IP spoofing to bypass rate limits.'),
    ('MEDIUM', 'No MFA/2FA support implemented. Account recovery relies solely on password-based authentication with no additional factor.'),
    ('LOW', 'x-request-id uses Math.random() instead of crypto.randomUUID(), providing weak request correlation identifiers.'),
]))
story.append(Spacer(1, 3*mm))

story.append(heading('5.3 PCI-DSS Awareness', sH2, 1))
story.append(body(
    'The platform demonstrates <b>excellent PCI scope reduction</b>. No card data (PAN, CVV, expiry, track data) is ever stored, '
    'logged, or processed by the application. All five payment providers (Stripe, Paystack, IntaSend, Flutterwave, Paya) use '
    'their own hosted checkout pages for card entry. The application only handles provider-issued tokens (providerPaymentId), '
    'amounts, and metadata. The cardLast4 field in the deposit schema stores only the last four digits, which is within PCI scope but '
    'allowable. The webhook endpoints correctly verify provider signatures (Stripe webhook signature verification, Paya timing-safe '
    'comparison). One concern: the Paya demo mode auto-completes deposits with provider "demo", which must be disabled in production '
    'environments to prevent fictitious transactions from being recorded as real.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 6: AUTHENTICATION & AUTHORIZATION
# ═══════════════════════════════════════════════════
story.append(heading('6. Authentication and Authorization', sH1, 0))

story.append(heading('6.1 Authentication Architecture', sH2, 1))
story.append(body(
    'Authentication is implemented via NextAuth v4 with a credentials-only provider (email + password), JWT session strategy, '
    'and bcryptjs password hashing. The JWT is enriched with a custom "youngsend" namespace containing accountId, tenantId, '
    'role, and businessId claims. The session maximum age is 24 hours with no sliding refresh (updateAge equals maxAge), meaning '
    'the token is never re-issued during a session. The edge middleware performs a cookie-presence check only without JWT '
    'validation, while the Node.js API helpers perform full session decryption via getServerSession(). This split creates a '
    'security gap where expired or malformed JWTs pass the edge layer and only fail at the handler level, wasting compute resources '
    'and potentially logging misleading 401 errors. Multi-tenancy is enforced by injecting tenantId into the JWT at creation time '
    'and relying on each route to manually apply the tenantScope() helper to Prisma queries.'
))

story.append(heading('6.2 Authorization Gaps', sH2, 1))
story.append(body(
    'Role-based access control is implemented inconsistently. Roles defined include admin, buyer, seller, auditor, viewer, and '
    'SUPER_ADMIN, but the case inconsistency between "admin" and "SUPER_ADMIN" across different route files creates a potential '
    'authorization bypass. The DashboardGuard client component checks authentication status but performs no role-based access control; '
    'any authenticated user can access the dashboard regardless of their assigned role. Tenant isolation is correctly implemented '
    'in most routes via tenantId-based WHERE clauses, but several critical gaps exist: the audit-log endpoint has a broken '
    'IDOR vulnerability, payment-links compare businessId (a Business ID) with tenantId (a Tenant ID), and compliance rules are '
    'not tenant-scoped (a known limitation documented in code comments but not mitigated). The deprecated session.ts helper still '
    'exists and is importable, creating confusion about which authentication helper to use.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 7: FRONTEND PERFORMANCE
# ═══════════════════════════════════════════════════
story.append(heading('7. Frontend Performance and UI Architecture', sH1, 0))

story.append(heading('7.1 Component Architecture', sH2, 1))
story.append(body(
    'The frontend uses a well-structured component hierarchy with the RootLayout (Server) wrapping Providers (Client), which '
    'wraps DashboardGuard (Client) and DashboardShell (Client). All 13 dashboard tabs are dynamically imported via next/dynamic '
    'with ssr: false and no prefetch, achieving zero JavaScript cost until a tab is clicked. Each tab is individually wrapped in '
    'an ErrorBoundary component, isolating crashes to the failed tab. The pattern is consistent across all tabs: useApi fetch, '
    'loading skeleton, error state with retry, and rendered data. Prop drilling depth is minimal, with DashboardShell passing only '
    '3 props to SidebarNav and 0 props to the active tab component.'
))

story.append(heading('7.2 Performance Concerns', sH2, 1))
story.append(sev_table([
    ('HIGH', 'framer-motion imported by 10 of 13 dashboard tabs for trivial fade-in animations. Each tab chunk includes ~35KB of animation library code for a simple opacity transition that could be achieved with CSS keyframes or tailwindcss-animate.'),
    ('HIGH', 'recharts (~200KB gzipped) is statically imported in DigitalTwinTab even though charts are only rendered inside a Dialog. Should use dynamic import: const { AreaChart } = await import("recharts").'),
    ('HIGH', '~500KB+ of unused npm dependencies ship in the production bundle: react-query, react-table, zustand, socket.io-client, dnd-kit, react-syntax-highlighter, @mdxeditor/editor.'),
    ('MEDIUM', 'SSE events from useRealtime hook do not trigger cache invalidation. When a deposit is confirmed via real-time event, the WalletTab data is NOT automatically refreshed; the user must manually navigate away and back.'),
    ('MEDIUM', 'dashboard-helpers.tsx is marked "use client" but contains pure utility functions and type interfaces that should not be in the client bundle. Should be split into a non-directive utilities module and a client components module.'),
    ('LOW', 'No React.memo on shared sub-components (KPICard, PipelineCard, ScoreBar, CircularScore) that are re-created on every parent render.'),
]))
story.append(Spacer(1, 3*mm))

story.append(heading('7.3 Accessibility Assessment', sH2, 1))
story.append(body(
    'Accessibility gaps exist across multiple dimensions. TrustGraphTab and DigitalTwinTab have clickable table rows and cards '
    'without keyboard interaction support (no role="button", tabIndex, or onKeyDown handlers). Data tables throughout all tabs lack '
    'aria-label attributes to identify their purpose for screen reader users. The CircularScore SVG component has no aria-label or '
    'role="img", making it invisible to assistive technology. SidebarNav uses button elements for navigation without aria-current="page" '
    'to indicate the active tab. The emerald-500 and emerald-600 text colors used for KPI icons may not meet WCAG AA contrast ratio '
    'requirements (4.5:1 for small text) against white backgrounds. No aria-live regions exist for dynamic content such as loading '
    'states or toast notifications, preventing screen readers from announcing changes.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 8: CACHING & OBSERVABILITY
# ═══════════════════════════════════════════════════
story.append(heading('8. Caching, Observability, and Telemetry', sH1, 0))

story.append(heading('8.1 Caching Architecture', sH2, 1))
story.append(body(
    'The caching system is well-architected with a dual-mode design: RedisCacheClient (ioredis-backed with cluster support, '
    'circuit breaker, and LRU fallback) for production and InMemoryCacheClient (pure LRU) for development. The CacheManager '
    'provides typed get/set operations, stale-while-revalidate (SWR) patterns, singleflight request deduplication, and tag-based '
    'cache invalidation. CachePubSub enables cross-instance invalidation via Redis channels. Seven cache strategies are defined '
    'with appropriate TTLs: DashboardStats (30s), UserProfile (5min), ExchangeRate (60s + 5min SWR), PaymentMethods (10min), '
    'FraudRules (5min), SessionCache (30min), and RateLimit (1min). Three rate limiting algorithms are implemented (sliding-window, '
    'token-bucket, fixed-window) with Redis Lua scripts for atomicity.'
))
story.append(body(
    'However, several critical issues exist. The invalidatePattern method uses the Redis KEYS command (O(N) operation) instead of '
    'SCAN, which will block the Redis server at scale. Tag storage uses a read-modify-write pattern on JSON arrays stored in Redis '
    'keys, creating race conditions under concurrent set calls. The in-memory LRU fallback has a capacity of only 500 entries, '
    'which will thrash immediately for a fintech platform with many concurrent users when Redis is unavailable. The auth login rate '
    'limiter uses the in-memory implementation rather than the distributed Redis-based rate limiter, making it per-process and '
    'bypassable in multi-instance deployments.'
))

story.append(heading('8.2 Observability Stack', sH2, 1))
story.append(body(
    'The observability stack is the most critically deficient area of the platform. While a sophisticated telemetry architecture is '
    'designed with a YoungsendLogger class supporting console and OTLP exporters, child loggers with bound context (tenant_id, '
    'user_id), and trace correlation, <b>the actual implementation is entirely non-functional</b>. All OpenTelemetry tracing and metrics '
    'are no-op stubs: createTracerProvider() always returns a no-op tracer (tracer.ts:72-73), and createMeterProvider() always returns '
    'no-op instruments (metrics.ts:125-127). The @opentelemetry SDK packages are not even installed in package.json. Seven metric '
    'instruments are defined (payment_total, payment_amount, request_duration, active_sessions, cache_hit_ratio, kafka_consumer_lag, '
    'fraud_alerts) but none of them produce any output. The only functional logging is the api-wrapper.ts HOF which generates one '
    'JSON log line per request, and the console logger used in development.'
))
story.append(body(
    'Additional observability gaps include: no Prometheus /metrics endpoint for monitoring system scraping, no structured error '
    'reporting integration (Sentry, Datadog), no log aggregation pipeline (all logs go to console stdout), no correlation ID '
    'propagation into database queries or outbound HTTP calls, dual telemetry systems (api-wrapper.ts and telemetry/middleware.ts) '
    'operating independently with no integration, and child loggers created via the deprecated child() method having no exporters '
    'configured. The health check system is well-designed with K8s-style liveness, readiness, and startup probes, but the Kafka '
    'health check uses HTTP fetch against a binary protocol endpoint, which always fails and returns "degraded" status.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 9: MIDDLEWARE & BUILD
# ═══════════════════════════════════════════════════
story.append(heading('9. Middleware and Build Pipeline', sH1, 0))

story.append(heading('9.1 Edge Middleware Issues', sH2, 1))
story.append(body(
    'The edge middleware (src/middleware.ts, 193 lines) handles security headers, CORS, rate limiting, bot detection, and auth '
    'guarding. It runs on every non-static request and executes O(1) operations per request. Critical issues include: <b>duplicate '
    'security headers</b> between next.config.ts and middleware.ts (X-Frame-Options, X-Content-Type-Options, Referrer-Policy are set in '
    'both locations, causing unpredictable browser behavior), <b>HSTS header only in next.config.ts</b> (not applied to middleware short-circuit responses like 429 or 403), and a <b>console.log on every API request</b> (line 181) that performs synchronous I/O in the hot path. '
    'The rate limiter uses an in-memory Map with lazy eviction every 200 checks and a cap of 10,000 entries, but the resetSec header '
    'value uses an absolute timestamp instead of seconds-until-reset. Bot detection uses a regex blocklist for known bad user agents '
    '(curl, wget, sqlmap, nikto, nmap) which is trivially bypassable but provides basic protection.'
))

story.append(heading('9.2 Build Configuration', sH2, 1))
story.append(body(
    'The build configuration has several concerning settings. typescript.ignoreBuildErrors: true in next.config.ts means TypeScript errors '
    'are silently suppressed during production builds, relying entirely on CI running tsc --noEmit separately. The jsx setting in '
    'tsconfig.json is "react-jsx" instead of "preserve" for Next.js 16 RSC support. reactStrictMode is disabled in development, '
    'meaning React rendering bugs are only caught in CI builds. No bundle analyzer is configured for tracking size regressions. '
    'The Dockerfile uses a well-structured 3-stage build (deps, builder, runner) with Node 20 Alpine, non-root user, and health check, '
    'but copies the entire @prisma package broadly. The dev script allocates 3GB heap (NODE_OPTIONS=--max-old-space-size=3072), '
    'suggesting memory pressure issues during development. The db:push script uses --accept-data-loss flag without a confirmation '
    'prompt, which is dangerous for production use.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 10: EVENT BUS & TEMPORAL
# ═══════════════════════════════════════════════════
story.append(heading('10. Event-Driven Architecture and Temporal', sH1, 0))
story.append(body(
    'The event bus (src/backend/services/event-bus.ts) is an in-memory pub/sub system for real-time SSE events, supporting '
    'tenant-scoped and user-scoped subscriptions with a maximum of 1,000 connections. It is process-local only: events are lost on '
    'server restart with no persistence, replay, or delivery guarantees. The Temporal integration defines 8 workflows '
    '(escrow-funding, escrow-activation, milestone-release, payment-processing, wallet-credit, wallet-debit, compliance-screening, '
    'collection-reminder) with graceful fallback to direct execution when Temporal is unavailable. However, the isTemporalAvailable() '
    'function opens and closes a new TCP connection on every invocation instead of using the cached client, adding unnecessary '
    'latency. The compliance screening workflow is a mock that always returns "clear" with "low" risk, meaning <b>zero actual '
    'compliance checking occurs</b> despite the sophisticated workflow infrastructure. Wallet credit/debit activities perform create + '
    'update as separate non-transactional calls, risking inconsistent state on failure. A typo in the task queue name '
    '(YOUNDSEND_TASK_QUEUE, missing "E") would cause workflow deployment failures.'
))

# ═══════════════════════════════════════════════════
# CHAPTER 11: REMEDIATION ROADMAP
# ═══════════════════════════════════════════════════
story.append(heading('11. Remediation Roadmap', sH1, 0))

story.append(heading('11.1 Phase 1 - Critical Fixes (Week 1-2)', sH2, 1))
story.append(body(
    'The following items must be addressed immediately before any production deployment consideration. These represent data '
    'integrity risks, security vulnerabilities, and fundamental architectural gaps that cannot be deferred.'
))
story.append(make_table(
    ['#', 'Action', 'Impact', 'Effort'],
    [
        ['1', 'Fix race conditions in deposit/withdrawal: re-read wallet balance inside $transaction', 'Data integrity', 'Small'],
        ['2', 'Wrap escrow release in $transaction (4 operations)', 'Data integrity', 'Small'],
        ['3', 'Wrap webhook handlers in $transaction (up to 10 operations)', 'Data integrity', 'Medium'],
        ['4', 'Fix audit-log IDOR: scope by tenant business IDs, not user.id', 'Security', 'Small'],
        ['5', 'Replace getApiUser() with requireAuth() in all 18 mutation routes', 'CSRF protection', 'Medium'],
        ['6', 'Add Content-Security-Policy header to middleware', 'Security', 'Small'],
        ['7', 'Add missing @relation decorators for 11 models', 'Data integrity', 'Medium'],
        ['8', 'Migrate Float to Integer (cents) for all monetary fields', 'Precision', 'Large'],
        ['9', 'Generate initial Prisma migration files', 'Deployment safety', 'Small'],
        ['10', 'Remove typescript.ignoreBuildErrors and enable noImplicitAny', 'Type safety', 'Small'],
    ],
    [25, CONTENT_W - 145, 65, 55]
))
story.append(Spacer(1, 4*mm))

story.append(heading('11.2 Phase 2 - High Priority (Week 3-6)', sH2, 1))
story.append(make_table(
    ['#', 'Action', 'Impact', 'Effort'],
    [
        ['1', 'Design and implement double-entry ledger model with reconciliation', 'Financial compliance', 'Large'],
        ['2', 'Install OpenTelemetry SDK and activate tracing/metrics', 'Observability', 'Medium'],
        ['3', 'Implement JWT token refresh/rotation mechanism', 'Auth security', 'Medium'],
        ['4', 'Add Zod validation to all 10+ unvalidated routes', 'Input safety', 'Medium'],
        ['5', 'Move rate limiting to Redis for distributed deployment', 'Scalability', 'Medium'],
        ['6', 'Remove 12 unused dependencies (~500KB bundle reduction)', 'Performance', 'Small'],
        ['7', 'Replace framer-motion with CSS transitions (10 tabs)', 'Bundle size', 'Medium'],
        ['8', 'Dynamically import recharts in DigitalTwinTab', 'Bundle size', 'Small'],
        ['9', 'Define Prisma enum types for all 40+ status/role fields', 'Data integrity', 'Medium'],
        ['10', 'Standardize role names to lowercase throughout codebase', 'Auth consistency', 'Small'],
        ['11', 'Fix duplicate security headers between config and middleware', 'Correctness', 'Small'],
        ['12', 'Add production CORS origin configuration', 'Deployment', 'Small'],
    ],
    [25, CONTENT_W - 145, 65, 55]
))
story.append(Spacer(1, 4*mm))

story.append(heading('11.3 Phase 3 - Medium Priority (Week 7-12)', sH2, 1))
story.append(make_table(
    ['#', 'Action', 'Impact', 'Effort'],
    [
        ['1', 'Implement soft delete (deletedAt) on key models', 'Compliance', 'Medium'],
        ['2', 'Move audit trail from in-memory to PostgreSQL', 'Audit persistence', 'Large'],
        ['3', 'Move idempotency guard from in-memory to Redis', 'Payment safety', 'Medium'],
        ['4', 'Add password complexity requirements on registration', 'Auth security', 'Small'],
        ['5', 'Implement MFA/2FA support', 'Account security', 'Large'],
        ['6', 'Replace Redis KEYS command with SCAN in cache invalidation', 'Performance', 'Small'],
        ['7', 'Wire SSE events to invalidateCache() for auto-refresh', 'UX', 'Small'],
        ['8', 'Add composite indexes for missing query patterns', 'Query performance', 'Small'],
        ['9', 'Implement repository/service layer to decouple business logic from routes', 'Architecture', 'Large'],
        ['10', 'Add accessibility: aria-labels, keyboard navigation, screen reader support', 'Accessibility', 'Medium'],
        ['11', 'Migrate from SQLite to PostgreSQL for production', 'Scalability', 'Large'],
        ['12', 'Configure connection pooling and query logging in Prisma', 'Observability', 'Small'],
    ],
    [25, CONTENT_W - 145, 65, 55]
))
story.append(Spacer(1, 4*mm))

# ═══════════════════════════════════════════════════
# CHAPTER 12: PRODUCTION READINESS
# ═══════════════════════════════════════════════════
story.append(heading('12. Production Readiness Assessment', sH1, 0))
story.append(body(
    'The following table summarizes the platform readiness across key production dimensions. Each dimension is rated as Ready, '
    'Partial, or Not Ready based on the audit findings. A platform is considered production-ready only when all dimensions '
    'achieve at least Partial status with a documented plan for full readiness.'
))
story.append(make_table(
    ['Dimension', 'Status', 'Key Blocker'],
    [
        ['Data Integrity', 'NOT READY', 'Race conditions, no double-entry ledger, Float for money'],
        ['Security', 'NOT READY', 'IDOR, CSRF bypass, no CSP, no MFA'],
        ['Authentication', 'PARTIAL', 'JWT works but no refresh, no token rotation'],
        ['Observability', 'NOT READY', 'All tracing/metrics are no-op stubs'],
        ['Scalability', 'PARTIAL', 'Good architecture but in-memory rate limiting, SQLite'],
        ['Reliability', 'PARTIAL', 'Graceful degradation exists but non-atomic operations'],
        ['Compliance', 'NOT READY', 'Mock compliance screening, no audit trail persistence'],
        ['Performance', 'PARTIAL', 'Dynamic imports good but 500KB+ unused deps, framer-motion bloat'],
        ['Build Pipeline', 'PARTIAL', 'Dockerfile good but ignoreBuildErrors, no bundle analysis'],
        ['Testing', 'NOT READY', '11 tests total, no coverage, no integration test suite'],
        ['Documentation', 'PARTIAL', 'ADR-001 through ADR-012 exist but no API docs, no runbooks'],
        ['Error Handling', 'PARTIAL', 'Per-tab error boundaries good but no structured error reporting'],
    ],
    [90, 70, CONTENT_W - 160]
))
story.append(Spacer(1, 6*mm))
story.append(body(
    '<b>Overall Assessment: NOT READY FOR PRODUCTION.</b> The platform has a solid architectural foundation with good separation of '
    'concerns, consistent tenant isolation, and thoughtful graceful degradation patterns. However, 10 critical findings spanning '
    'data integrity, security, and observability must be resolved before production deployment. The estimated effort to reach '
    'production readiness is 12-16 weeks with a dedicated team of 3-5 engineers, following the phased remediation roadmap '
    'outlined in Chapter 11.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD PDF
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT = '/home/z/my-project/download/Youngsend_Architecture_Audit_Report.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = TocDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='Youngsend Fintech Platform Architecture Audit Report',
    author='Principal QA Engineering Team',
    subject='Comprehensive Architecture Audit - Phase 1 of 14-Phase Engineering Mission',
)

doc.multiBuild(story, onLaterPages=page_footer, onFirstPage=page_footer)
print(f'Done: {OUTPUT}')
