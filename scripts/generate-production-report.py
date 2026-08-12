import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm, cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Register Fonts ──────────────────────────────────────────────────────────
FONTS_CHINESE = '/usr/share/fonts/truetype/chinese/'
FONTS_SERIF = '/usr/share/fonts/truetype/noto-serif-sc/'
FONTS_ENGLISH = '/usr/share/fonts/truetype/english/'
pdfmetrics.registerFont(TTFont('NotoSansSC', os.path.join(FONTS_CHINESE, 'LiberationSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSerifSC', os.path.join(FONTS_SERIF, 'NotoSerifSC-Regular.ttf')))

# ── Palette ─────────────────────────────────────────────────────────────────
PAGE_BG = colors.HexColor('#f2f2f1')
HEADER_FILL = colors.HexColor('#4e4837')
COVER_BLOCK = colors.HexColor('#7e7762')
BORDER = colors.HexColor('#cdc9bd')
ACCENT = colors.HexColor('#97781a')
ACCENT_2 = colors.HexColor('#468ea7')
TEXT_PRIMARY = colors.HexColor('#201f1d')
TEXT_MUTED = colors.HexColor('#86837c')
SEM_SUCCESS = colors.HexColor('#4f8561')
SEM_WARNING = colors.HexColor('#91753e')
SEM_ERROR = colors.HexColor('#965650')
SEM_INFO = colors.HexColor('#516f8d')
TABLE_STRIPE = colors.HexColor('#f4f4f2')

OUTPUT = '/home/z/my-project/download/Youngsend_Production_Gate_Report.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

W, H = A4
LM = 1.8*cm
RM = 1.8*cm

# ── Styles ──────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()

s_title = ParagraphStyle('T', fontName='NotoSansSC', fontSize=28, leading=34, textColor=colors.white, alignment=TA_LEFT, spaceAfter=12)
s_subtitle = ParagraphStyle('Sub', fontName='NotoSansSC', fontSize=13, leading=18, textColor=colors.HexColor('#ccc'), alignment=TA_LEFT, spaceAfter=6)
s_cover_info = ParagraphStyle('CI', fontName='NotoSansSC', fontSize=10, leading=14, textColor=colors.HexColor('#aaa'), alignment=TA_LEFT)
s_h1 = ParagraphStyle('H1', fontName='NotoSansSC', fontSize=18, leading=24, textColor=HEADER_FILL, spaceBefore=28, spaceAfter=10)
s_h2 = ParagraphStyle('H2', fontName='NotoSansSC', fontSize=13, leading=18, textColor=ACCENT, spaceBefore=18, spaceAfter=6)
s_body = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=10, leading=15, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8)
s_bullet = ParagraphStyle('Bul', fontName='NotoSansSC', fontSize=10, leading=14, textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6, spaceAfter=4, alignment=TA_LEFT)
s_caption = ParagraphStyle('Cap', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MUTED, spaceAfter=6)
s_verdict = ParagraphStyle('Verdict', fontName='NotoSansSC', fontSize=16, leading=22, textColor=SEM_ERROR, alignment=TA_CENTER, spaceBefore=20, spaceAfter=8)
s_footer = ParagraphStyle('Ft', fontName='NotoSansSC', fontSize=7, leading=9, textColor=TEXT_MUTED, alignment=TA_CENTER)

# ── Helpers ─────────────────────────────────────────────────────────────────
def h1(t): return Paragraph(t, s_h1)
def h2(t): return Paragraph(t, s_h2)
def p(t): return Paragraph(t, s_body)
def bullet(t): return Paragraph(t, s_bullet)
def spacer(h=8): return Spacer(1, h)
def hr(): return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=10, spaceBefore=6)

def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    w = col_widths or [W - LM - RM] * len(headers)
    w = w[:len(headers)]
    t = Table(data, colWidths=w, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'NotoSansSC'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style))
    return t

# ── Build Story ──────────────────────────────────────────────────────────────
story = []

# Cover page
story.append(Spacer(1, 2.5*inch))
story.append(Paragraph('YOUNGSEND', ParagraphStyle('CT', fontName='NotoSansSC', fontSize=42, leading=48, textColor=HEADER_FILL, alignment=TA_LEFT)))
story.append(Paragraph('Production Gate Report', ParagraphStyle('CS', fontName='NotoSansSC', fontSize=20, leading=26, textColor=ACCENT, alignment=TA_LEFT, spaceAfter=24)))
story.append(hr())
story.append(Paragraph('Re-architecture, Rebuild, and Production Validation', s_subtitle))
story.append(Paragraph('Global Trust Network for Commerce', s_subtitle))
story.append(spacer(24))
story.append(Paragraph('Date: 2026-08-12', s_cover_info))
story.append(Paragraph('Version: 0.2.1', s_cover_info))
story.append(Paragraph('Classification: Confidential', s_cover_info))
story.append(Paragraph('Status: NOT PRODUCTION READY', ParagraphStyle('St', fontName='NotoSansSC', fontSize=11, leading=14, textColor=SEM_ERROR, alignment=TA_LEFT, spaceBefore=16)))
story.append(PageBreak())

# 1. Architecture Before
story.append(h1('1. Architecture Before'))
story.append(p('Youngsend was built as a monolithic Next.js 16 App Router application with Prisma ORM backed by SQLite in development and designed for PostgreSQL in production. The frontend consisted of 77 source files totaling approximately 10,000 lines of code across a dashboard with 13 tabs, 3 standalone pages (deposits, withdrawals, conversion), a public payment checkout page, and auth pages (login, register). The backend comprised 72+ API route files (76 total with sub-routes) totaling approximately 10,600 lines, along with 38 library files, 14 payment provider modules, 7 cache infrastructure files, and 4 Temporal workflow files.'))
story.append(p('The directory structure used a non-standard split: frontend components lived under src/frontend/ while shared types and utilities resided in src/backend/lib/dashboard-helpers.tsx, a 468-line mega-file containing TypeScript interfaces, formatter functions, React sub-components, and navigation configuration all in a single file marked with an inappropriate "use client" directive despite being imported from server and client code alike. The project depended on 27 production packages and 11 dev dependencies, with 5 unused packages consuming approximately 43MB of node_modules space. The total development footprint was 1.1GB of node_modules, 155MB of build output, and approximately 31,000 lines of application code.'))
story.append(p('Infrastructure was extensively designed but not fully connected: Kubernetes manifests (18 files), Helm charts with dev/staging/production values, Terraform configurations for GCP, Docker Compose stacks, monitoring with Prometheus, Grafana, Loki, and OTel, plus a Cloudflare Edge Worker. However, no CI/CD pipeline existed, deployments were manual, and several infrastructure components (Kafka, Redis, OpenSearch, Temporal) were either stubs or optional dependencies with no active production deployment. The OTel instrumentation was entirely commented out despite 37MB of OTel packages in the dependency tree.'))

# 2. Architecture After
story.append(h1('2. Architecture After'))
story.append(p('The re-architecture preserved the monolithic Next.js structure (correctly, as the platform has not reached the scale that justifies microservice extraction) while systematically addressing the most critical structural, security, and correctness issues identified during the 12-phase discovery process. The mega-file was split into three properly organized modules: src/frontend/lib/formatters.ts (pure types, constants, and functions), src/frontend/components/dashboard/dashboard-components.tsx (React components with proper client directive), and the original dashboard-helpers.tsx converted to a backward-compatible re-export shim marked as deprecated.'))
story.append(p('The financial data model was strengthened with a new immutable LedgerEntry model implementing double-entry accounting principles with correlation IDs, causation IDs, reversal chains, and computed balance-after values. Five unused dependencies were removed (138 packages total), reducing node_modules from 940MB to 866MB. The CSP no longer permits unsafe-eval. A .env.example was created. A comprehensive CI/CD pipeline with three GitHub Actions workflows (ci.yml, deploy.yml, pr-checks.yml) was established. A forgotten password page was created, loading states were standardized across all dashboard pages, and critical test coverage was expanded from 264 to 319 tests.'))

# 3. Migration Summary
story.append(h1('3. Migration Summary'))
story.append(make_table(
    ['Category', 'Action', 'Details'],
    [
        ['Security: Hardcoded Secret', 'REMOVED', 'start-prod.sh no longer has fallback NEXTAUTH_SECRET'],
        ['Security: CSP unsafe-eval', 'REMOVED', 'CSP script-src tightened; recharts not used in runtime client'],
        ['Security: Grafana Password', 'FIXED', 'Replaced hardcoded password with env var override'],
        ['Security: K8s Secrets', 'SANITIZED', 'Replaced base64 plaintext with kubectl instructions'],
        ['Dependencies (5)', 'REMOVED', '@opensearch-project/opensearch, @opentelemetry/sdk-metrics, @opentelemetry/sdk-node, react-hook-form, react-day-picker (138 packages, ~43MB)'],
        ['Dependencies (10)', 'CLEANED', 'Removed unused entries from optimizePackageImports and serverExternalPackages'],
        ['@types/node', 'ADDED', 'Fixed ~90 pre-existing TS errors (process, crypto, etc.)'],
        ['dashboard-helpers.tsx', 'SPLIT', '468-line mega-file split into formatters.ts + dashboard-components.tsx + re-export shim'],
        ['forgot-password Page', 'RESTORED', 'Created server component + loading state (was linked but missing)'],
        ['Loading States', 'STANDARDIZED', 'withdrawals/loading.tsx and conversion/loading.tsx upgraded to detailed skeletons'],
        ['Schema: FK Constraints', 'ADDED', 'onDelete: Restrict on Wallet, Invoice (sender/receiver)'],
        ['Schema: Unique Constraint', 'ADDED', '@@unique([escrowId, sequence]) on EscrowMilestone'],
        ['Schema: updatedAt', 'ADDED', 'To ReputationEvent and CollectionReminder models'],
        ['Financial Ledger', 'BUILT', 'New LedgerEntry model + ledger service with double-entry, correlation IDs, reversals'],
        ['CI/CD Pipeline', 'CREATED', 'ci.yml, deploy.yml, pr-checks.yml (GitHub Actions)'],
        ['.env.example', 'CREATED', 'All 25+ env vars documented by category'],
        ['.gitignore', 'CREATED', 'node_modules, .next, .env, db/, download/, agent-ctx/'],
        ['Critical Tests', 'ADDED', '55 new tests: state machine idempotency, API envelope, CSRF, ledger types, auth helpers'],
    ],
    col_widths=[3.5*cm, 3*cm, W-LM-RM-6.5*cm]
))

# 4. Feature Matrix
story.append(h1('4. Feature Matrix'))
story.append(p('The comprehensive feature matrix documents 100+ features across 17 domains. Below is the summary of the key findings from the Phase 2 documentation reconciliation process. Features are classified as: Working (fully functional), Partial (implemented but mocked or incomplete), Stub (documented but not implemented), and Gap (documented claim does not match reality).'))
story.append(make_table(
    ['Domain', 'Working', 'Partial/Mocked', 'Stub/Missing', 'Key Gaps'],
    [
        ['Authentication', '4', '0', '2', 'No MFA, no password reset, no OAuth'],
        ['Authorization (RBAC)', '4', '0', '0', 'App-level tenant scoping only (no RLS)'],
        ['Payments', '12', '0', '2', 'README lists wrong providers (M-Pesa, Plaid)'],
        ['Escrow', '8', '1', '0', 'AI risk scoring uses Math.random()'],
        ['Wallets', '7', '1', '0', 'Crypto withdrawal is record-only'],
        ['Financial Ledger', '1', '0', '0', 'NEW: LedgerEntry model + service built'],
        ['Trust/Reputation', '5', '1', '0', 'AI scoring is mock random'],
        ['Invoicing', '4', '0', '2', 'No automated payment or reminders'],
        ['Fraud Detection', '4', '0', '3', 'No rule engine evaluation, no real-time detection'],
        ['Compliance', '5', '1', '2', 'All screenings are mocked'],
        ['Notifications', '1', '0', '4', 'Only in-app; no email/SMS/push'],
        ['Referral', '6', '0', '0', 'Fully functional'],
        ['Analytics', '4', '0', '2', 'No Grafana/OpenSearch integration'],
        ['Infrastructure', '8', '1', '5', 'No CI/CD was the biggest gap (NOW FIXED)'],
        ['AI Modules', '0', '5', '0', 'All 5 AI features use random/mock data'],
    ],
    col_widths=[3*cm, 2*cm, 3*cm, 2.5*cm, W-LM-RM-10.5*cm]
))

# 5. Performance
story.append(h1('5. Performance'))
story.append(h2('5.1 Before vs After'))
story.append(make_table(
    ['Metric', 'Before', 'After', 'Change'],
    [
        ['node_modules size', '940 MB', '866 MB', '-74 MB (-7.9%)'],
        ['Production deps', '27 packages', '22 packages', '-5 packages'],
        ['Build output (standalone)', 'N/A', '147 MB', 'Baseline established'],
        ['Build output (server code)', 'N/A', '14 MB', 'Baseline established'],
        ['TypeScript errors', '~90 (@types/node)', '0', 'Fully resolved'],
        ['Test count', '264', '319', '+55 tests (+20.8%)'],
        ['Test execution time', '3.25s', '2.07s', '-36% faster'],
        ['Build time (Turbopack)', 'N/A', '41s', 'Baseline established'],
        ['API route wrapper adoption', '70/72', '70/72', 'Unchanged'],
        ['API response envelope adoption', '22/72', '22/72', 'Unchanged (50 routes still use raw NextResponse)'],
    ],
    col_widths=[4.5*cm, 3*cm, 3*cm, W-LM-RM-10.5*cm]
))
story.append(h2('5.2 Build Size Analysis'))
story.append(p('The standalone production build weighs 147MB, of which 133MB (90%) is production node_modules and 14MB (10%) is server-side JavaScript and static assets. The dominant packages in the standalone node_modules are: @prisma/client with its query engine (~40MB), next server runtime (~20MB), stripe SDK (~15MB), ioredis (~5MB), and various Radix UI primitives. Reaching the requested 40MB target would require externalizing @prisma/client to a shared volume, using serverless function packaging, or adopting a different database access layer. The 147MB figure is typical for a Next.js application with Prisma, Stripe, and Redis integrations.'))

# 6. Reliability
story.append(h1('6. Reliability'))
story.append(p('The platform implements several reliability patterns. Payment processing uses a formal PaymentStateMachine with 9 states, 11 legal transitions, terminal state enforcement, and idempotent transition handling via a key-based deduplication mechanism. The IdempotencyGuard class provides request-level deduplication with TTL-based expiry. All Temporal workflows gracefully degrade to direct in-process execution when the Temporal server is unavailable, ensuring the system functions in development and demo environments without external dependencies.'))
story.append(p('The in-memory event bus (EventBus) provides SSE-based real-time updates with tenant-scoped filtering and connection limits. Three-layer caching exists: in-memory LRU ResponseCache with 2-5s TTLs for hot API paths, Redis CacheManager with circuit breaker and in-memory fallback, and HTTP-level Cache-Control with ETags from the standard ok() helper. The Redis client implements connection retry with circuit breaker patterns. However, several reliability gaps remain: the PaymentStateMachine state is stored in-memory and lost on restart, the EventBus is process-scoped with no Redis/DB backing, and there are no dead-letter queues for failed events.'))

# 7. Security
story.append(h1('7. Security'))
story.append(h2('7.1 Vulnerabilities Discovered and Resolved'))
story.append(make_table(
    ['Vulnerability', 'Severity', 'Status', 'Fix'],
    [
        ['Hardcoded NEXTAUTH_SECRET in start-prod.sh', 'CRITICAL', 'RESOLVED', 'Removed default; app fails if unset in prod'],
        ['CSP permits unsafe-eval', 'HIGH', 'RESOLVED', 'Removed from script-src; recharts not used in client runtime'],
        ['Hardcoded Grafana admin password', 'MEDIUM', 'RESOLVED', 'Replaced with env var override'],
        ['K8s secrets with base64 plaintext', 'MEDIUM', 'RESOLVED', 'Replaced with kubectl instructions'],
        ['No .env.example', 'LOW', 'RESOLVED', 'Created with all 25+ env vars documented'],
    ],
    col_widths=[5*cm, 2.5*cm, 2.5*cm, W-LM-RM-10*cm]
))
story.append(h2('7.2 Existing Security Measures (Retained)'))
story.append(p('The platform retains a robust security posture: edge-level rate limiting (100/min global, 10/min financial mutations), User-Agent bot detection, Content-Security-Policy with locked-down connect-src and frame-src, CORS whitelist, CSRF double-submit cookie verification on all mutations (using timing-safe comparison), webhook signature verification via HMAC for all 5 payment providers, input sanitization, Zod schema validation on all payment inputs, audit logging, and x-request-id correlation headers on every API request.'))
story.append(h2('7.3 Remaining Security Concerns'))
story.append(p('Several security concerns remain open. The ESLint configuration has 25+ rules set to "off", providing effectively zero linting. No Prettier configuration exists for code formatting consistency. The in-memory rate limiter loses state on process restart and does not share across instances. PostgreSQL Row Level Security policies exist in the migration schema but are dead code because current_setting("app.tenant_id") is never set by the application. The Float type is used for money fields in the SQLite schema, which introduces rounding errors (the PostgreSQL migration schema correctly uses Decimal(18,2)). No vulnerability scanning of npm dependencies is configured in CI/CD.'))

# 8. Testing
story.append(h1('8. Testing'))
story.append(h2('8.1 Test Coverage Summary'))
story.append(make_table(
    ['Suite', 'Tests', 'Coverage Area'],
    [
        ['critical-tests.test.ts', '55', 'State machine idempotency (15), API envelope (10), CSRF (8), ledger types (12), auth helpers (10)'],
        ['wave-fixes.test.ts', '113', 'API response format (16), security (34), form validation (16), dashboard helpers (47)'],
        ['sprint-fixes.test.ts', '48', 'Sprint 3 regression tests'],
        ['bug-fixes.test.ts', '37', 'Historical bug fix regression'],
        ['payment-state-machine.test.ts', '12', 'Payment state transitions and terminal states'],
        ['cache-strategies.test.ts', '22', 'Cache manager strategies and TTL behavior'],
        ['validation.test.ts', '21', 'Zod schema validation for payments and auth'],
        ['audit-trail.test.ts', '7', 'Tamper-proof hash chain audit trail'],
        ['event-publisher.test.ts', '4', 'Event publisher stub behavior'],
    ],
    col_widths=[4*cm, 1.5*cm, W-LM-RM-5.5*cm]
))
story.append(h2('8.2 Testing Gaps'))
story.append(p('No integration tests currently run in CI. The integration test configuration exists (vitest.config.integration.ts) but requires a running dev server. No end-to-end tests exist. No performance/load tests exist. No chaos engineering tests exist. No security penetration tests exist. The test suite validates business logic in isolation but does not verify: duplicate payment prevention at the database level, concurrent escrow actions, database restart recovery, Redis failure fallback, provider timeout handling, or webhook delivery guarantees. These are critical gaps for a financial platform.'))

# 9. Infrastructure
story.append(h1('9. Infrastructure'))
story.append(h2('9.1 Deployment'))
story.append(p('The deployment pipeline was established during this engagement. Three GitHub Actions workflows were created: ci.yml (4 parallel jobs: lint, typecheck, test, build triggered on push to main/develop and PRs), deploy.yml (single deploy job on main push with environment protection requiring 1 reviewer and concurrency control), and pr-checks.yml (sequential lint-typecheck-test with PR comment summary). A Dockerfile with 3-stage build (deps, builder, runner) using Node 22 Alpine with non-root user is configured. Docker Compose defines 8 services for the full stack. A .gitignore was created covering node_modules, .next, .env files, database files, and build artifacts.'))
story.append(h2('9.2 Observability and Scaling'))
story.append(p('The infrastructure is comprehensively designed but partially implemented. A structured JSON logger (YoungsendLogger) supports console (dev) and OTLP (prod) exporters. API telemetry wraps all routes with x-request-id, high-resolution timing, and gzip compression. Health check endpoints (/api/health, /api/ready) support Kubernetes liveness/readiness/startup probes. The Kubernetes manifests define 3-replica deployment with HPA (min 3, max 100), PodDisruptionBudget, NetworkPolicies, and topology spread. PostgreSQL is configured for 3-replica Patroni HA. Redis uses 3-replica Sentinel. However, OTel instrumentation is disabled, Grafana dashboards are defined but not deployed, and no backup automation exists.'))

# 10. Remaining Issues
story.append(h1('10. Remaining Issues'))
story.append(h2('10.1 Critical Issues That Prevent Production Readiness'))
story.append(make_table(
    ['#', 'Issue', 'Risk', 'Effort'],
    [
        ['C1', 'SQLite uses Float for money fields (rounding errors)', 'Financial data corruption', 'Medium — PG schema already defined'],
        ['C2', 'No wallet balance immutability (direct UPDATE possible)', 'Unauthorized balance manipulation', 'Medium — DB trigger or service-layer enforcement'],
        ['C3', 'PaymentStateMachine state is in-memory only', 'State loss on restart during payment', 'Medium — persist to DB/Redis'],
        ['C4', 'EventBus is process-scoped (no persistence)', 'Lost events on restart', 'Medium — Redis pub/sub backing'],
        ['C5', 'No email/SMS/push notification delivery', 'Users never receive transactional notifications', 'Large — requires provider integration'],
        ['C6', 'All AI features use Math.random() mock data', 'Misleading business intelligence', 'Large — requires real ML models'],
        ['C7', 'No PostgreSQL RLS activation in application', 'Tenant data leak if RLS is enabled', 'Small — SET LOCAL in transaction wrapper'],
        ['C8', 'Float for money in SQLite dev schema', 'Accumulating rounding errors', 'Medium — switch to Decimal or PG'],
    ],
    col_widths=[0.8*cm, 5.5*cm, 4.5*cm, W-LM-RM-10.8*cm]
))
story.append(h2('10.2 High-Priority Items'))
story.append(p('The documentation contains several false claims: the README lists 6 payment providers but only 5 exist (M-Pesa and Plaid are incorrectly listed); the README claims Socket.IO in the tech stack but the platform uses SSE; the architecture document claims OAuth, MFA, and password reset exist but none are implemented. The ESLint configuration disables all meaningful rules. No Prettier configuration exists. The User and Account models are partially duplicated, creating confusion. Approximately 50 API routes still use raw NextResponse.json instead of the standard api-response helpers. No .npmrc is configured for audit settings. The db:push script uses --accept-data-loss as a default.'))
story.append(h2('10.3 Medium-Priority Items'))
story.append(p('Duplicate K8s manifests exist (legacy deployment.yaml/service.yaml/hpa.yaml alongside nextjs-deployment.yaml etc.). The namespace is inconsistent across K8s files (some use youngsend, others youngsend-prod). The Terraform GCR image reference is a placeholder while Helm uses ghcr.io. No scheduled cron jobs exist for overdue invoice reminders, expired escrow cleanup, or rate limiter pruning. No real-time FX rate feed is configured. The compliance screening system generates random results. The fraud rule engine stores rules but never evaluates them against transactions.'))

# 11. Final Recommendation
story.append(h1('11. Final Recommendation'))
hr()
story.append(Paragraph('NOT PRODUCTION READY', s_verdict))
hr()
story.append(p('Youngsend is NOT PRODUCTION READY based on the evidence gathered during this comprehensive re-architecture engagement. While significant structural improvements were made, the platform retains critical issues that must be resolved before serving real financial transactions.'))
story.append(p('<b>The primary blocking issues are:</b> (1) Financial data integrity risk from Float-type money fields in the development schema, with no database-level constraints preventing balance manipulation or ensuring double-entry consistency at the database layer. (2) All five AI features (escrow risk scoring, trust score calculation, business matching, collections strategy, fraud detection) use mock random data, making them actively misleading rather than useful. (3) No notification delivery infrastructure exists beyond in-app display, meaning users will never receive email confirmation of payments, escrow events, or compliance actions. (4) The payment state machine and event bus lose all in-memory state on process restart, creating a window for financial data inconsistency during deployments. (5) Testing covers unit logic well (319 tests) but has zero integration tests, zero end-to-end tests, zero performance tests, and zero chaos engineering validation.'))
story.append(p('<b>What was achieved:</b> The re-architecture established a solid foundation. Security vulnerabilities were patched (hardcoded secrets removed, CSP tightened). Dead dependencies were pruned (138 packages). The codebase was organized (mega-file split, missing pages restored). A financial ledger with double-entry semantics was built. CI/CD was created from nothing. The feature matrix was documented with 100+ items reconciled against reality. The production build compiles and runs successfully.'))
story.append(p('<b>Recommended next steps:</b> (1) Migrate from SQLite to PostgreSQL to enable Decimal types, RLS, and proper constraints. (2) Implement wallet balance protection via database triggers or service-layer primitives. (3) Persist the payment state machine and event bus to Redis. (4) Build integration tests for the 8 critical payment scenarios (duplicate payments, concurrent escrow, provider timeouts). (5) Integrate a notification provider (email at minimum). (6) Replace AI mock data with rule-based systems or clearly document them as simulations. (7) Standardize the remaining 50 API routes to use the api-response envelope. (8) Enable ESLint rules progressively and add Prettier. (9) Correct documentation to match reality.'))

# Build
story.append(spacer(20))
story.append(hr())
story.append(Paragraph('Youngsend Production Gate Report | 2026-08-12 | Confidential', s_footer))

# Page numbering
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('NotoSansSC', 7)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(W/2, 1.2*cm, f'Page {canvas.getPageNumber()}')
    canvas.restoreState()

# Cover page background
def cover_bg(canvas, doc):
    if canvas.getPageNumber() == 1:
        canvas.saveState()
        canvas.setFillColor(colors.HexColor('#201f1d'))
        canvas.rect(0, 0, W, H, fill=1, stroke=0)
        canvas.restoreState()
    add_page_number(canvas, doc)

doc = SimpleDocTemplate(OUTPUT, pagesize=A4, leftMargin=LM, rightMargin=RM, topMargin=2*cm, bottomMargin=2*cm)
doc.build(story, onFirstPage=cover_bg, onLaterPages=add_page_number)
print(f'Report generated: {OUTPUT}')
print(f'Pages: {doc.page}')
