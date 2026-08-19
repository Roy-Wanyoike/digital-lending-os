#!/usr/bin/env python3
"""
Youngsend White Paper — Body PDF Generator
Generates the TOC + Chapters 1–9 body (no cover).
Output: /home/z/my-project/download/youngsend_body.pdf
"""

import os
import platform

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, SimpleDocTemplate, PageTemplate, Frame,
    Paragraph, Spacer, Table, TableStyle, NextPageTemplate,
    KeepTogether, CondPageBreak, Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Output path ───────────────────────────────────────────────────────────────
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'youngsend_body.pdf')

# ─── Color Palette ─────────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f3f2f1')
SECTION_BG    = colors.HexColor('#f0efed')
CARD_BG       = colors.HexColor('#eae8e4')
TABLE_STRIPE  = colors.HexColor('#f5f4f3')
HEADER_FILL   = colors.HexColor('#514a33')
COVER_BLOCK   = colors.HexColor('#6d6346')
BORDER        = colors.HexColor('#d3ccb8')
ICON          = colors.HexColor('#7e7044')
ACCENT        = colors.HexColor('#8b7227')
ACCENT_2      = colors.HexColor('#3c9cbc')
TEXT_PRIMARY   = colors.HexColor('#191816')
TEXT_MUTED     = colors.HexColor('#807d76')
SEM_SUCCESS   = colors.HexColor('#3d8154')
SEM_WARNING   = colors.HexColor('#92753b')
SEM_ERROR     = colors.HexColor('#a95048')
SEM_INFO      = colors.HexColor('#567ca2')

# ─── Font Registration ─────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ─── Page geometry ─────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4  # 595.28 x 841.89
LEFT_M  = 72
RIGHT_M = 72
TOP_M   = 60
BOT_M   = 60
available_width = PAGE_W - LEFT_M - RIGHT_M  # 451.28

# ─── Styles ────────────────────────────────────────────────────────────────────
style_body = ParagraphStyle(
    'Body', fontName='FreeSerif', fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=8,
)
style_h1 = ParagraphStyle(
    'H1', fontName='FreeSerif-Bold', fontSize=20, leading=26,
    textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=10,
)
style_h2 = ParagraphStyle(
    'H2', fontName='FreeSerif-Bold', fontSize=14, leading=20,
    textColor=HEADER_FILL, spaceBefore=14, spaceAfter=8,
)
style_h3 = ParagraphStyle(
    'H3', fontName='FreeSerif-Bold', fontSize=11.5, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6,
)
style_bullet = ParagraphStyle(
    'Bullet', fontName='FreeSerif', fontSize=10.5, leading=17,
    leftIndent=24, bulletIndent=12, textColor=TEXT_PRIMARY, spaceAfter=4,
)
style_caption = ParagraphStyle(
    'Caption', fontName='FreeSerif-Italic', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=6, spaceBefore=4,
)
style_toc_h1 = ParagraphStyle(
    'TOCH1', fontName='FreeSerif-Bold', fontSize=12, leading=20,
    leftIndent=20, textColor=TEXT_PRIMARY,
)
style_toc_h2 = ParagraphStyle(
    'TOCH2', fontName='FreeSerif', fontSize=10.5, leading=18,
    leftIndent=40, textColor=TEXT_MUTED,
)

# ─── TocDocTemplate ────────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def __init__(self, *args, **kwargs):
        SimpleDocTemplate.__init__(self, *args, **kwargs)
        self.page_count = 0

    def afterPage(self):
        self.page_count += 1

    def handle_pageEnd(self):
        super().handle_pageEnd()
        self.canv.saveState()
        self.canv.setFont('FreeSerif', 9)
        self.canv.setFillColor(TEXT_PRIMARY)
        self.canv.drawRightString(PAGE_W - RIGHT_M, 30, str(self.page))
        self.canv.restoreState()

    def afterFlowable(self, flowable):
        """Notify TOC of headings."""
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


# ─── Helper: CalloutBox ────────────────────────────────────────────────────────
def make_callout(text, label=None):
    elements = []
    if label:
        elements.append(
            Paragraph(f'<b>{label}</b>', ParagraphStyle(
                'CalloutLabel', fontName='FreeSerif-Bold', fontSize=9,
                textColor=ACCENT, spaceBefore=0, spaceAfter=2))
        )
    elements.append(
        Paragraph(text, ParagraphStyle(
            'CalloutText', fontName='FreeSerif', fontSize=10,
            leading=15, textColor=TEXT_PRIMARY))
    )
    inner = [[e] for e in elements]
    t = Table(inner, colWidths=[available_width - 20])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0, colors.white),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (0, 0), 0, colors.white),
    ]))
    # accent left border via a wrapper table
    wrapper = Table([[t]], colWidths=[available_width])
    wrapper.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (0, 0), (0, 0), 0),
        ('TOPPADDING', (0, 0), (0, 0), 0),
        ('BOTTOMPADDING', (0, 0), (0, 0), 0),
        ('LINEBEFORE', (0, 0), (0, 0), 3, ACCENT),
        ('BACKGROUND', (0, 0), (0, 0), CARD_BG),
        ('LEFTPADDING', (0, 0), (0, 0), 6),
    ]))
    wrapper.hAlign = 'CENTER'
    return wrapper


# ─── Helper: BlockQuote ────────────────────────────────────────────────────────
def make_blockquote(text):
    t = Table(
        [[Paragraph(f'<i>{text}</i>', ParagraphStyle(
            'Quote', fontName='FreeSerif-Italic', fontSize=10.5,
            leading=17, textColor=TEXT_MUTED))]],
        colWidths=[available_width - 60]
    )
    t.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBEFORE', (0, 0), (0, -1), 2, ACCENT),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ]))
    t.hAlign = 'CENTER'
    return t


# ─── Helper: safe_keep_together ────────────────────────────────────────────────
def safe_keep_together(elements):
    """Wrap heading + first para in KeepTogether, keeping rest separate."""
    if len(elements) <= 1:
        return elements
    grouped = KeepTogether(elements[:2])
    result = [grouped] + elements[2:]
    return result


# ─── Heading helpers with bookmark attributes ──────────────────────────────────
def heading1(chapter_num, title):
    """H1 with bookmark for TOC."""
    p = Paragraph(
        f'<b>Chapter {chapter_num}</b>',
        ParagraphStyle('ChNum', fontName='FreeSerif-Bold', fontSize=11,
                       leading=14, textColor=ACCENT, spaceBefore=0, spaceAfter=2)
    )
    h = Paragraph(f'<a name="chapter_{chapter_num}"/>{title}', style_h1)
    h.bookmark_name  = title
    h.bookmark_key   = f'chapter_{chapter_num}'
    h.bookmark_text  = f'Chapter {chapter_num}: {title}'
    h.bookmark_level = 0
    return [p, h]


def heading2(key, title):
    """H2 with bookmark for TOC."""
    h = Paragraph(f'<a name="{key}"/>{title}', style_h2)
    h.bookmark_name  = title
    h.bookmark_key   = key
    h.bookmark_text  = title
    h.bookmark_level = 1
    return h


def heading3(title):
    """H3 (no TOC entry)."""
    return Paragraph(title, style_h3)


# ─── Header / Footer drawing ──────────────────────────────────────────────────
_page_counter = [0]

def draw_page_bg(canvas, doc):
    """Draw page background, header line, and footer."""
    _page_counter[0] += 1
    canvas.saveState()
    # Background
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Header text
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_M, PAGE_H - 40, 'Youngsend White Paper')
    # Accent line under header
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.6)
    canvas.line(LEFT_M, PAGE_H - 46, PAGE_W - RIGHT_M, PAGE_H - 46)
    # Footer page number
    canvas.setFont('FreeSerif', 9)
    canvas.setFillColor(TEXT_PRIMARY)
    canvas.drawRightString(PAGE_W - RIGHT_M, 30, str(_page_counter[0]))
    canvas.restoreState()


# ─── Build the story ───────────────────────────────────────────────────────────
def build_story():
    story = []

    # ═══════════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════════════════════════════════════
    toc_title = Paragraph('Table of Contents', ParagraphStyle(
        'TOCTitle', fontName='FreeSerif-Bold', fontSize=22, leading=28,
        textColor=TEXT_PRIMARY, spaceBefore=40, spaceAfter=18,
        alignment=TA_LEFT))
    story.append(toc_title)
    story.append(Spacer(1, 6))

    toc = TableOfContents()
    toc.levelStyles = [style_toc_h1, style_toc_h2]
    story.append(toc)
    story.append(Spacer(1, 12))

    # Page break after TOC
    story.append(NextPageTemplate('BodyPage'))
    story.append(CondPageBreak(280))

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 1: Positioning and Mission
    # ═══════════════════════════════════════════════════════════════════════════
    ch1_elements = heading1(1, 'Positioning and Mission')
    ch1_elements += [
        Paragraph(
            'Youngsend is not another Stripe, PayPal, Wise, Flutterwave, or M-Pesa. '
            'It is the Financial Operating System and Trust Network for Global Commerce. '
            'Where existing platforms solve isolated fragments of the financial puzzle, '
            'Youngsend weaves those fragments into a single, intelligent fabric that connects '
            'identity, trust, contracts, payments, escrow, and reputation into one seamless experience.',
            style_body
        ),
        Paragraph(
            'Imagine Stripe, Escrow.com, Wise, Deel, LinkedIn, DocuSign, and Experian had '
            'one intelligent child powered by artificial intelligence. That child would understand '
            'who you are, who you are dealing with, what you have agreed to, how money should move, '
            'and what happens after every transaction completes. Youngsend is that child, and it is '
            'growing up fast in a world that desperately needs exactly what it offers.',
            style_body
        ),
        make_callout(
            'Allow anyone, anywhere, to safely do business with anyone else, '
            'regardless of country, currency, or payment method.',
            label='Mission'
        ),
        Paragraph(
            'Our vision is bold and specific: two strangers\u2014one in Kenya, one in Brazil, '
            'who have never met and share no common financial infrastructure\u2014should be able '
            'to verify each other\'s identity, create a legally binding agreement, exchange currencies '
            'at a fair rate, lock money safely in escrow, track delivery of goods or services, release '
            'funds upon confirmed satisfaction, build mutual reputation from the transaction, improve '
            'their credit profiles, and grow future business together. All of this should happen in one '
            'platform, in one workflow, with AI guiding every step.',
            style_body
        ),
        Paragraph(
            'This is not incremental improvement. This is a fundamental rethinking of how global '
            'commerce works. The world does not need another payment processor; it needs a system '
            'that makes trust portable, transactions intelligent, and business borders irrelevant. '
            'Youngsend is built to be that system, and every architectural decision, every product '
            'feature, and every line of code serves that singular purpose.',
            style_body
        ),
    ]
    story += safe_keep_together(ch1_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 2: The Problem
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch2_elements = heading1(2, 'The Problem')
    ch2_elements += [
        Paragraph(
            'The global financial system is profoundly fragmented. A typical international business '
            'relies on banks for wire transfers, PayPal for online invoices, Wise for currency conversion, '
            'Stripe for card processing, M-Pesa for mobile payments in Africa, crypto for borderless value '
            'transfer, separate escrow services for high-value deals, email threads for contract negotiations, '
            'DocuSign for signatures, and yet another platform for accounting. None of these systems connect. '
            'Each one operates in isolation, creating friction, expense, and risk at every handoff.',
            style_body
        ),
        heading2('ch2-payments', 'The Payments Problem'),
        Paragraph(
            'Cross-border payments remain expensive, slow, and unreliable. Businesses routinely pay two to '
            'five percent in transfer fees on top of hidden foreign-exchange markups that can add another '
            'one to three percent. Multiple currency conversions along a single payment chain compound costs '
            'further. Settlements that should be instant can take three to five business days, and payment '
            'failures\u2014due to compliance flags, intermediary bank rejections, or simple technical errors\u2014are '
            'common. Entire countries and regions remain underserved or entirely unsupported by major payment '
            'networks, leaving millions of businesses without reliable access to global commerce.',
            style_body
        ),
        heading2('ch2-trust', 'The Trust Problem'),
        Paragraph(
            'There is no universal mechanism to determine whether a counterparty is trustworthy. Businesses '
            'and freelancers operate in a landscape where invoice fraud, fake business identities, and '
            'misrepresented credentials are commonplace. A company in Singapore has no reliable way to '
            'verify that a supplier in Nigeria is legitimate, and a freelancer in Argentina has no way to '
            'prove a track record of reliable delivery. Traditional credit bureaus are national in scope '
            'and exclude billions of people. Online reviews are easily gamed. The result is that trust is '
            'expensive to establish and fragile to maintain, which suppresses the volume of global trade '
            'that could otherwise occur.',
            style_body
        ),
        heading2('ch2-escrow', 'The Escrow Problem'),
        Paragraph(
            'Escrow services exist but they are expensive, manual, and slow. Traditional escrow providers '
            'charge high fees, require extensive paperwork, and operate on timelines measured in weeks '
            'rather than hours. They are limited to certain industries\u2014typically real estate and large '
            'mergers\u2014and are inaccessible to freelancers, small businesses, and digital product sellers. '
            'Even where escrow is available, it lacks intelligence: no automated milestone verification, '
            'no AI-assisted dispute resolution, and no integration with the broader payment and identity '
            'infrastructure.',
            style_body
        ),
        heading2('ch2-freelancers', 'The Freelancer Problem'),
        Paragraph(
            'Freelancers face a unique constellation of challenges that existing platforms fail to address '
            'comprehensively. Payment platforms freeze accounts without warning, holding funds for months '
            'during vague "security reviews." There is no global reputation system that follows a freelancer '
            'across platforms\u2014a top-rated Upwork freelancer starts from zero on Fiverr or Toptal. Access '
            'to credit and financing is nearly impossible for workers without traditional employment history. '
            'Tax obligations across multiple jurisdictions add further complexity, and the administrative '
            'burden of managing contracts, invoices, and compliance drains time that should be spent on '
            'productive work.',
            style_body
        ),
        heading2('ch2-businesses', 'The Business Problem'),
        Paragraph(
            'Businesses of all sizes suffer from late-paying customers, unpredictable cash flow, and the '
            'challenge of financing operations against outstanding invoices. Invoice financing remains '
            'inaccessible to many small and medium enterprises, particularly in emerging markets. Multiple '
            'disconnected systems\u2014one for invoicing, another for payments, a third for contracts, a fourth '
            'for compliance\u2014create operational overhead and data silos. The absence of a unified view of '
            'financial health means businesses make decisions with incomplete information, leading to '
            'inefficient capital allocation and unnecessary risk exposure.',
            style_body
        ),
        heading2('ch2-developers', 'The Developer Problem'),
        Paragraph(
            'Developers who build financial products must integrate a patchwork of APIs from dozens of '
            'providers to create even a basic commercial workflow. Connecting identity verification, payment '
            'processing, escrow management, contract generation, and compliance monitoring requires integrating '
            'five to ten separate services, each with its own authentication model, data format, rate limits, '
            'and reliability characteristics. This integration burden slows innovation, increases technical '
            'debt, and fragments the developer experience.',
            style_body
        ),
        heading2('ch2-ai', 'The AI Era Problem'),
        Paragraph(
            'The rise of AI agents introduces an entirely new dimension of challenge. AI systems are '
            'increasingly capable of executing complex workflows\u2014negotiating deals, issuing invoices, '
            'approving payments\u2014but businesses have no safe, governed way to let AI participate in '
            'financial operations. There is no framework for AI wallets with configurable permissions, '
            'no audit infrastructure designed for machine-initiated transactions, and no trust layer '
            'that can evaluate whether an AI agent is acting on behalf of a verified, authorized principal. '
            'As AI becomes a participant in commerce rather than merely a tool, the absence of financial '
            'infrastructure designed for this reality becomes a critical gap.',
            style_body
        ),
    ]
    story += safe_keep_together(ch2_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 3: The Youngsend Platform
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch3_elements = heading1(3, 'The Youngsend Platform')
    ch3_elements += [
        Paragraph(
            'The Youngsend Platform is a comprehensive suite of fifteen core products, each designed to '
            'address a specific dimension of the global commerce problem while working together as an '
            'integrated whole. These products are not independent tools thrown together; they are deeply '
            'interconnected components of a single financial operating system where data, trust, and value '
            'flow seamlessly between them.',
            style_body
        ),
        heading2('ch3-identity', '3.1 Global Identity'),
        Paragraph(
            'Global Identity provides one identity and one verification process that is reusable everywhere '
            'across the platform and beyond. Think of it as a Google Login for finance: verify once, transact '
            'everywhere. The system supports document verification, biometric checks, and business registry '
            'cross-referencing across jurisdictions. Once verified, a user\'s identity credential can be '
            'presented to any counterparty on the platform, eliminating repetitive KYC processes and reducing '
            'friction in every new business relationship. This portable identity forms the foundation upon '
            'which all other products build.',
            style_body
        ),
        heading2('ch3-bizverify', '3.2 Business Verification'),
        Paragraph(
            'Business Verification goes beyond individual identity to validate companies, their directors, '
            'registered bank accounts, and tax compliance status. The system cross-references government '
            'registries, financial databases, and public records to build a comprehensive trust profile for '
            'every business on the platform. Verified businesses receive a visible trust badge that signals '
            'credibility to counterparties, reducing due diligence time and enabling faster deal execution. '
            'Continuous monitoring ensures that verification status remains current, flagging any changes '
            'in corporate structure, ownership, or compliance standing.',
            style_body
        ),
        heading2('ch3-reputation', '3.3 AI Reputation Engine'),
        Paragraph(
            'The AI Reputation Engine measures actual behavior rather than self-reported credentials. It '
            'tracks whether parties pay on time, deliver on time, how often disputes arise, any history of '
            'fraud, overall business stability, and financial health indicators. Unlike review systems that '
            'can be gamed, the Reputation Engine draws exclusively on verified transaction data from across '
            'the platform. Scores are transparent and explainable: users can see exactly which behaviors '
            'contributed to their reputation, creating positive incentives for reliable commercial conduct. '
            'This engine feeds into escrow risk assessment, financing decisions, and counterparty recommendations.',
            style_body
        ),
        heading2('ch3-contracts', '3.4 AI Contract Builder'),
        Paragraph(
            'The AI Contract Builder transforms natural language into legally sound agreements. A user can '
            'type something as simple as "Build website for $5,000" and the AI will generate a complete '
            'contract including scope of work, milestones, payment schedule, late fees, intellectual property '
            'clauses, jurisdiction selection, and dispute resolution procedures. The system generates a '
            'corresponding invoice, links it to the escrow product, and establishes a payment schedule tied '
            'to delivery milestones. Contracts are stored immutably on the platform, creating a verifiable '
            'record that supports both compliance requirements and dispute resolution.',
            style_body
        ),
        heading2('ch3-escrow', '3.5 Smart Escrow'),
        Paragraph(
            'Smart Escrow is the backbone of trusted transactions on Youngsend, supporting an exceptionally '
            'broad range of use cases: freelancing services, vehicle purchases, real estate transactions, '
            'machinery and equipment sales, international trade, digital products, construction projects, '
            'and general professional services. The system supports milestone-based fund release, where '
            'payments are automatically unlocked as predefined conditions are met. AI verification handles '
            'document review and delivery confirmation for routine transactions, while larger deals receive '
            'dedicated human verification agents for additional assurance. Insurance options protect against '
            'non-delivery or misrepresentation, structured dispute workflows provide fair resolution '
            'pathways, and a complete audit trail ensures transparency at every stage of the transaction.',
            style_body
        ),
        heading2('ch3-invoice', '3.6 Smart Invoice'),
        Paragraph(
            'Smart Invoices are dynamically generated, QR-verified, and digitally signed documents that '
            'carry far more intelligence than a traditional invoice. Each invoice includes an AI-generated '
            'fraud score, real-time payment tracking, a direct link to the underlying contract, and live '
            'escrow status when applicable. Recipients can verify invoice authenticity instantly by scanning '
            'the QR code, which links to the platform\'s verification database. The system tracks payment '
            'status automatically, sends reminders at configurable intervals, and can trigger invoice '
            'financing requests when cash flow optimization is needed.',
            style_body
        ),
        heading2('ch3-routing', '3.7 Payment Routing AI'),
        Paragraph(
            'Payment Routing AI automatically selects the optimal payment pathway for each transaction by '
            'evaluating multiple factors simultaneously: cost, speed, foreign-exchange rate, historical '
            'success rate for the specific corridor, compliance requirements, and overall reliability. The '
            'system routes transactions across SWIFT, Visa, Mastercard, local bank networks, mobile money '
            'systems, and cryptocurrency rails as appropriate. If the primary route fails, the AI '
            'automatically falls back to the next-best option without user intervention. Over time, the '
            'routing engine learns from platform-wide transaction data to continuously improve route '
            'selection and cost optimization.',
            style_body
        ),
        heading2('ch3-fx', '3.8 FX Marketplace'),
        Paragraph(
            'The FX Marketplace aggregates and compares exchange rates from licensed banks, specialized '
            'FX providers, payment networks, and stablecoin rails where regulations permit. Users see '
            'transparent, real-time rate comparisons with full visibility into fees and settlement times, '
            'empowering them to choose the best option for their specific transaction. For businesses with '
            'recurring FX needs, the platform can automate currency conversion based on configurable '
            'strategies such as rate thresholds, time-based execution, or cost-optimized routing. This '
            'transparency eliminates the hidden markups that plague traditional cross-border transactions.',
            style_body
        ),
        heading2('ch3-paylinks', '3.9 Payment Links 2.0'),
        Paragraph(
            'Payment Links 2.0 reimagines the simple payment link as a trust-enriched transaction '
            'endpoint. Every payment link displays the verified company information, the sender\'s trust '
            'score, an optional escrow toggle, and an AI-generated fraud analysis for the transaction. '
            'Payers see a complete transaction timeline before committing funds, including estimated '
            'settlement time, applicable fees, and the protection mechanisms in place. This transforms '
            'payment links from bare URLs into comprehensive transaction proposals that build buyer '
            'confidence and reduce payment abandonment.',
            style_body
        ),
        heading2('ch3-health', '3.10 Financial Health Score'),
        Paragraph(
            'The Financial Health Score provides a holistic, data-driven assessment of a business\'s '
            'financial stability and reliability. It synthesizes revenue consistency, payment history, '
            'business behavior patterns, cash flow trends, the number and value of verified contracts '
            'in execution, and the concentration of repeat customers. This score serves multiple purposes: '
            'it helps businesses understand their own financial trajectory, enables counterparties to make '
            'informed decisions, supports financing applications, and provides early warning signals for '
            'deteriorating financial conditions.',
            style_body
        ),
        heading2('ch3-financing', '3.11 Invoice Financing'),
        Paragraph(
            'Invoice Financing allows businesses to request early payment against verified, outstanding '
            'invoices. Because the platform already holds verified contract data, delivery confirmation, '
            'and counterparty reputation information, the underwriting process is faster and more accurate '
            'than traditional invoice factoring. Financing terms are dynamically priced based on the '
            'creditworthiness of both parties, the invoice amount, and historical payment behavior. This '
            'product turns the platform\'s trust infrastructure into tangible financial value, giving '
            'businesses access to working capital that would otherwise be locked in unpaid invoices.',
            style_body
        ),
        heading2('ch3-treasury', '3.12 AI Treasury'),
        Paragraph(
            'AI Treasury is an intelligent cash management tool that forecasts cash flow based on '
            'historical patterns, outstanding invoices, upcoming obligations, and market conditions. It '
            'tracks expenses across categories and counterparties, suggests optimal payment timing to '
            'maximize working capital efficiency, and recommends currency conversion strategies based on '
            'rate forecasts. The system flags unusual spending patterns that may indicate errors or fraud, '
            'providing businesses with an automated financial oversight capability that would otherwise '
            'require a dedicated treasury team.',
            style_body
        ),
        heading2('ch3-copilot', '3.13 AI Financial Copilot'),
        Paragraph(
            'The AI Financial Copilot is a conversational interface that answers natural-language questions '
            'about a user\'s financial data. Users can ask questions like "Who owes me money?", "Can I '
            'afford to hire another developer?", or "Which customer consistently pays late?" and receive '
            'immediate, data-backed answers. The Copilot draws on the full breadth of platform data\u2014'
            'transactions, contracts, invoices, reputation scores, and market conditions\u2014to provide '
            'actionable financial intelligence without requiring users to navigate complex dashboards or '
            'generate reports manually.',
            style_body
        ),
        heading2('ch3-wallet', '3.14 AI Wallet'),
        Paragraph(
            'The AI Wallet serves humans, businesses, and\u2014crucially\u2014future AI agents. For '
            'individuals and businesses, it provides a unified interface for holding, sending, and receiving '
            'funds across multiple currencies and payment methods. For AI agents, it offers a programmable '
            'wallet with configurable permissions, spending limits, approval workflows, and comprehensive '
            'audit logs. Every wallet action is recorded and analyzable, creating a foundation for both '
            'operational transparency and regulatory compliance. The wallet is designed from the ground up '
            'to support the emerging paradigm of machine-initiated financial transactions.',
            style_body
        ),
        heading2('ch3-network', '3.15 Global Commerce Reputation Network'),
        Paragraph(
            'The Global Commerce Reputation Network ensures that every company, freelancer, supplier, and '
            'customer on the platform has a verified reputation built on real transaction history. Unlike '
            'platform-specific ratings that are siloed and non-portable, the Youngsend reputation travels '
            'with the user across every interaction on the network. This creates powerful network effects: '
            'as more transactions occur, reputation data becomes richer and more reliable, which attracts '
            'more users, which generates more transaction data. The result is a self-reinforcing trust '
            'ecosystem that becomes increasingly valuable and increasingly difficult to replicate over time.',
            style_body
        ),
    ]
    story += safe_keep_together(ch3_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 4: Unique Features and Competitive Moat
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch4_elements = heading1(4, 'Unique Features and Competitive Moat')
    ch4_elements += [
        Paragraph(
            'Youngsend\'s competitive advantage does not rest on any single feature but on the deeply '
            'integrated system that emerges when identity, trust, contracts, payments, and reputation '
            'operate as one. The following capabilities represent structural advantages that compound '
            'over time and are extremely difficult for competitors to replicate.',
            style_body
        ),
        heading2('ch4-graph', '4.1 Commerce Graph'),
        Paragraph(
            'Google built the Search Graph, LinkedIn built the Professional Graph, and Youngsend is '
            'building the Commerce Graph. Every business relationship on the platform\u2014every payment, '
            'every contract, every escrow transaction, every dispute resolution\u2014becomes a node in a '
            'vast, interconnected graph of commercial activity. This graph reveals patterns that no '
            'isolated payment processor or review platform can see: supply chain dependencies, payment '
            'behavior clusters, geographic trade corridors, and trust propagation pathways. As the graph '
            'grows, it becomes an increasingly powerful asset that enables better fraud detection, more '
            'accurate risk assessment, and smarter business recommendations.',
            style_body
        ),
        make_callout(
            'Google has Search Graph. LinkedIn has Professional Graph. '
            'Youngsend builds the Commerce Graph\u2014connecting every business relationship '
            'into an intelligent, searchable network of trust and transaction history.',
            label='Key Insight'
        ),
        heading2('ch4-passport', '4.2 Transaction Passport'),
        Paragraph(
            'Every transaction on Youngsend creates a verified, immutable record called a Transaction '
            'Passport. This digital artifact captures the complete lifecycle of a commercial interaction: '
            'the original contract, the invoice, the payment, the escrow state changes, delivery '
            'confirmation, any disputes, and the final settlement. Transaction Passports serve as '
            'evidence for financing applications, tax compliance, audit requirements, and dispute '
            'resolution. They transform opaque, fragmented transaction histories into clear, portable, '
            'and verifiable records that follow both parties long after the deal is done.',
            style_body
        ),
        heading2('ch4-trustscore', '4.3 AI Trust Score'),
        Paragraph(
            'The AI Trust Score goes beyond simple credit ratings to provide a multi-dimensional '
            'assessment of commercial reliability. It predicts the likelihood of fraud, successful '
            'payment completion, late payment, and dispute initiation based on behavioral patterns '
            'observed across the platform. Critically, the score is designed to support decision-making '
            'rather than to make opaque judgments. Users can see the factors that contribute to any '
            'score and can take concrete actions to improve it. This transparency creates a virtuous '
            'cycle where the desire for a better score incentivizes reliable commercial behavior, '
            'which improves the overall trustworthiness of the platform.',
            style_body
        ),
        heading2('ch4-aiescrow', '4.4 AI Escrow'),
        Paragraph(
            'AI Escrow leverages machine learning to automate the verification steps that traditionally '
            'require manual intervention. The AI can verify delivery documents against contract '
            'specifications, confirm milestone completion based on submitted evidence, and detect '
            'anomalies that might indicate fraud or non-performance. For the vast majority of '
            'transactions, this AI-driven verification enables faster fund release and lower costs. '
            'However, the system is designed with an intelligent escalation pathway: when transaction '
            'value exceeds configurable thresholds, when AI confidence is low, or when either party '
            'requests human review, a dedicated human verification agent steps in to provide the '
            'judgment and nuance that only a person can offer.',
            style_body
        ),
        heading2('ch4-humanescrow', '4.5 Human Escrow Agents'),
        Paragraph(
            'For transactions that require a human touch, Youngsend provides dedicated Escrow Agents '
            'who offer personalized verification, optional physical inspection, compliance review, and '
            'real-time support throughout the transaction lifecycle. These agents are not generalist '
            'customer service representatives; they are trained specialists who understand the '
            'specifics of different industries and transaction types. The combination of AI efficiency '
            'for routine transactions and human expertise for complex ones creates a scalable escrow '
            'service that can grow without sacrificing quality.',
            style_body
        ),
        heading2('ch4-currency', '4.6 AI Currency Intelligence'),
        Paragraph(
            'AI Currency Intelligence continuously monitors global FX markets, payment rail performance, '
            'and regulatory changes to find the best currency conversion routes for every transaction. '
            'The system alerts users to significant market movements that might affect upcoming payments, '
            'suggests optimal timing for currency conversions, and automatically routes transactions through '
            'the most cost-effective combination of banks, FX providers, and stablecoin rails. Over time, '
            'the intelligence layer builds a detailed understanding of each user\'s currency needs and '
            'patterns, enabling increasingly proactive and personalized recommendations.',
            style_body
        ),
        heading2('ch4-safebiz', '4.7 Safe Business'),
        Paragraph(
            'Safe Business is the philosophy that underpins the entire platform: trust should be built on '
            'verified financial behavior, not on subjective reviews or unverified claims. A business with '
            'a five-star review from three customers is far less reliable as a signal than a business with '
            'a verified history of two hundred on-time payments, zero disputes, and consistent revenue. '
            'Youngsend makes this behavioral trust visible, portable, and actionable, creating a '
            'commercial environment where reputation is earned through deeds rather than words.',
            style_body
        ),
    ]
    story += safe_keep_together(ch4_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 5: Forward-Looking Feature Concepts
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch5_elements = heading1(5, 'Forward-Looking Feature Concepts')
    ch5_elements += [
        Paragraph(
            'Beyond the fifteen core products, Youngsend\'s roadmap includes twenty-five forward-looking '
            'feature concepts that extend the platform\'s capabilities into new domains and deepen its '
            'competitive advantages. These are organized into five strategic categories, each representing '
            'a layer of the platform\'s long-term evolution.',
            style_body
        ),
        # Trust & Identity
        heading2('ch5-trust', '5.1 Trust and Identity'),
        heading3('Commerce DNA'),
        Paragraph(
            'Commerce DNA would create a unique, cryptographic fingerprint for every business based on '
            'its verified transaction patterns, payment behaviors, and relationship history. This '
            'fingerprint would serve as an immutable identity anchor that cannot be forged or manipulated, '
            'providing counterparties with a mathematically verifiable representation of a business\'s '
            'commercial character. Commerce DNA would make identity verification continuous rather than '
            'point-in-time, evolving as the business grows and demonstrating trustworthiness through '
            'accumulated evidence.',
            style_body
        ),
        heading3('AI Scam Detector'),
        Paragraph(
            'The AI Scam Detector would analyze transaction patterns, communication behaviors, and '
            'platform-wide signals to identify potential fraud before money changes hands. By examining '
            'factors such as deal structure anomalies, counterparty behavior deviations, and cross-referencing '
            'with known fraud patterns, the system would provide real-time risk assessments and alerts. This '
            'proactive defense mechanism would protect users from increasingly sophisticated social engineering '
            'and financial scams that evade traditional rule-based systems.',
            style_body
        ),
        heading3('Youngsend Passport'),
        Paragraph(
            'Youngsend Passport would be a portable, universal business credential that aggregates a user\'s '
            'verified identity, reputation score, transaction history, and compliance status into a single '
            'shareable document. This passport would be accepted by third-party platforms, financial '
            'institutions, and government agencies as a trusted proof of commercial credibility. It '
            'transforms the Youngsend reputation from a platform-internal asset into a universal commercial '
            'utility, creating powerful incentives for businesses to build and maintain strong platform '
            'reputations.',
            style_body
        ),
        heading3('Live Trust Score'),
        Paragraph(
            'Live Trust Score would extend the static AI Trust Score into a real-time, continuously updated '
            'metric that reflects the most current information about a counterparty. As payments are made, '
            'disputes resolved, or compliance events occur, the score would adjust immediately, giving '
            'users an always-current view of the trustworthiness of anyone they are considering doing '
            'business with. This real-time responsiveness would be particularly valuable in fast-moving '
            'markets where conditions change rapidly and stale trust data can lead to costly mistakes.',
            style_body
        ),
        # Intelligence
        heading2('ch5-intel', '5.2 Intelligence'),
        heading3('AI Deal Negotiator'),
        Paragraph(
            'The AI Deal Negotiator would assist parties in reaching mutually beneficial agreements by '
            'analyzing market rates, historical transaction data, and the specific needs of both parties '
            'to suggest fair terms. The AI would understand the dynamics of different industries and '
            'transaction types, proposing payment structures, milestone schedules, and pricing that '
            'balance risk and value for both sides. This capability would dramatically reduce the time '
            'spent on negotiation while producing outcomes that are grounded in data rather than '
            'asymmetric information.',
            style_body
        ),
        heading3('AI Risk Prediction'),
        Paragraph(
            'AI Risk Prediction would move beyond individual trust scores to provide holistic risk '
            'assessments for entire transactions, supply chains, and business relationships. By analyzing '
            'the interconnected Commerce Graph, the system could identify systemic risks\u2014such as '
            'a supplier whose own suppliers are experiencing financial difficulties\u2014that would be '
            'invisible when evaluating counterparties in isolation. This bird\'s-eye risk intelligence '
            'would enable businesses to make more informed decisions about who to work with and how '
            'to structure their commercial arrangements.',
            style_body
        ),
        heading3('AI Contract Memory'),
        Paragraph(
            'AI Contract Memory would maintain a deep, searchable knowledge base of every contract a '
            'business has ever executed on the platform. Users could query their contract history to find '
            'precedents for specific clauses, compare terms across deals, identify recurring obligations, '
            'and ensure consistency in their agreements. The AI would also proactively flag upcoming '
            'deadlines, renewal dates, and contractual obligations, preventing costly oversights and '
            'helping businesses manage their legal commitments more effectively.',
            style_body
        ),
        heading3('AI Collections'),
        Paragraph(
            'AI Collections would automate the accounts receivable process with escalating, '
            'intelligent communication strategies. The system would identify overdue invoices, prioritize '
            'collection efforts based on counterparty risk profiles and relationship value, and generate '
            'personalized follow-up communications that maintain professionalism while increasing '
            'recovery rates. For chronically late payers, the system could automatically propose structured '
            'payment plans or, when necessary, initiate dispute and escrow-related remedies, all while '
            'preserving the underlying business relationship.',
            style_body
        ),
        heading3('AI Business Clone'),
        Paragraph(
            'AI Business Clone would create a digital replica of a business\'s operational patterns, '
            'decision-making preferences, and financial behaviors. This clone could run simulations to '
            'answer "what if" questions: What would happen to cash flow if we took on three more clients? '
            'How would a currency devaluation affect our supply chain costs? The clone would enable '
            'businesses to explore strategic decisions in a risk-free environment before committing '
            'resources, making it an invaluable tool for planning and risk management.',
            style_body
        ),
        # Infrastructure
        heading2('ch5-infra', '5.3 Infrastructure'),
        heading3('Smart Currency Lock'),
        Paragraph(
            'Smart Currency Lock would allow users to lock in favorable exchange rates for future '
            'transactions, protecting against currency volatility between deal negotiation and payment '
            'settlement. The system would automatically execute the locked rate when the transaction '
            'reaches the payment stage, eliminating the FX risk that currently makes cross-border '
            'pricing unpredictable and potentially erodes margins. This feature would be particularly '
            'valuable for businesses that operate in multiple currency zones and need to provide '
            'stable pricing to their customers.',
            style_body
        ),
        heading3('Invoice NFT'),
        Paragraph(
            'Invoice NFTs would represent verified invoices as unique, tamper-proof digital assets on a '
            'blockchain or equivalent distributed ledger. These tokenized invoices could be traded, '
            'financed, or used as collateral in decentralized finance protocols, creating new liquidity '
            'pathways for businesses. The NFT structure would encode the invoice\'s verification status, '
            'payment history, and underlying contract data, giving financiers and secondary market '
            'participants confidence in the asset\'s authenticity and value.',
            style_body
        ),
        heading3('Universal Wallet'),
        Paragraph(
            'The Universal Wallet would extend the AI Wallet concept to support every form of value '
            'storage and transfer: fiat currencies, cryptocurrencies, stablecoins, tokenized assets, '
            'and eventually central bank digital currencies. Users would manage all their financial '
            'assets from a single interface, with the AI Wallet\'s permission and audit capabilities '
            'applying uniformly across all asset types. This unification would eliminate the need for '
            'users to maintain separate wallets and accounts for different asset classes.',
            style_body
        ),
        heading3('Dynamic Escrow'),
        Paragraph(
            'Dynamic Escrow would enable escrow terms to adapt in real-time based on transaction '
            'conditions. If a delivery is delayed due to force majeure, the escrow parameters could '
            'automatically adjust the release timeline. If a buyer and seller agree to modify the scope '
            'of work mid-project, the escrow would recalculate fund allocations accordingly. This '
            'flexibility would make escrow practical for a much wider range of commercial scenarios '
            'where rigid, pre-defined terms are insufficient to capture the reality of complex, '
            'evolving business relationships.',
            style_body
        ),
        heading3('Commerce Insurance'),
        Paragraph(
            'Commerce Insurance would leverage the platform\'s unparalleled visibility into transaction '
            'risk to offer precisely priced insurance products for commercial transactions. Because '
            'Youngsend understands the parties, the contract, the payment structure, and the delivery '
            'mechanisms, it can price risk far more accurately than traditional insurers who rely on '
            'limited, historical data. Insurance could be purchased per-transaction or as a subscription, '
            'covering risks such as non-delivery, non-payment, currency loss, and contractual breach.',
            style_body
        ),
        # Network Effects
        heading2('ch5-network', '5.4 Network Effects'),
        heading3('AI Reputation Graph'),
        Paragraph(
            'The AI Reputation Graph would visualize and analyze the interconnected trust relationships '
            'across the entire platform. It would reveal trust clusters, identify bridge actors who '
            'connect otherwise separate commercial networks, and surface reputation propagation '
            'pathways. Businesses could use the graph to discover new partners through trusted '
            'intermediaries, and the AI could identify emerging risk patterns that propagate through '
            'commercial networks. This graph-based approach to reputation would create network effects '
            'that strengthen the platform as it grows.',
            style_body
        ),
        heading3('Commerce Timeline'),
        Paragraph(
            'Commerce Timeline would provide a unified, chronological view of every commercial event '
            'in a business\'s history: agreements signed, payments sent and received, disputes initiated '
            'and resolved, reputation changes, and financing events. This comprehensive timeline would '
            'serve as both an operational tool for business management and an evidentiary record for '
            'audits, financing applications, and compliance reviews. The AI would identify patterns and '
            'anomalies in the timeline, surfacing insights that would be invisible in fragmented, '
            'system-specific records.',
            style_body
        ),
        heading3('Escrow Marketplace'),
        Paragraph(
            'The Escrow Marketplace would connect parties who need escrow services with a network of '
            'verified escrow agents, insurers, and verification specialists. Users could choose the level '
            'of verification and protection appropriate for their transaction, from fully automated AI '
            'escrow for small deals to white-glove human-managed escrow for complex, high-value '
            'transactions. This marketplace approach would create competition among service providers, '
            'driving down costs and improving quality while ensuring that every transaction finds the '
            'right level of trust assurance.',
            style_body
        ),
        heading3('Business Network'),
        Paragraph(
            'Business Network would transform the platform\'s Commerce Graph into a social layer for '
            'commercial relationships. Businesses could form verified partnerships, join industry '
            'clusters, and build referral networks based on actual transaction history rather than '
            'self-reported credentials. The network would facilitate warm introductions between trusted '
            'parties, enable collaborative deal structures involving multiple businesses, and create '
            'a LinkedIn-like experience grounded in verified commercial performance rather than '
            'subjective endorsements.',
            style_body
        ),
        heading3('Business Matching'),
        Paragraph(
            'Business Matching would use the AI Reputation Graph, Commerce Graph, and behavioral data '
            'to proactively suggest high-potential business connections. A supplier in Vietnam with a '
            'strong delivery record might be matched with a buyer in Germany who needs exactly that '
            'product category. A freelance developer with a history of successful fintech projects might '
            'be introduced to a startup that matches her skills and rate range. This intelligent '
            'matchmaking would convert the platform\'s data assets into direct commercial value for '
            'its users.',
            style_body
        ),
        heading3('Youngsend Intelligence'),
        Paragraph(
            'Youngsend Intelligence would aggregate platform-wide data into actionable market '
            'intelligence products. Businesses could access reports on payment trends in their industry, '
            'average deal sizes and terms by geography, emerging trade corridors, and risk hotspots. '
            'This macro-level intelligence would help businesses make strategic decisions about market '
            'entry, pricing, and partnership strategies based on real commercial data rather than '
            'surveys and estimates. The intelligence product would also serve as a powerful '
            'differentiator that attracts data-hungry enterprises to the platform.',
            style_body
        ),
        # Platform
        heading2('ch5-platform', '5.5 Platform'),
        heading3('AI Compliance Copilot'),
        Paragraph(
            'The AI Compliance Copilot would monitor every transaction for regulatory compliance across '
            'multiple jurisdictions simultaneously. It would automatically generate required reports, '
            'flag potential violations before they occur, and maintain comprehensive audit trails that '
            'satisfy regulators in different countries. For businesses operating across borders, this '
            'would dramatically reduce the cost and complexity of compliance, turning what is currently '
            'a major barrier to international trade into a manageable, largely automated process.',
            style_body
        ),
        heading3('AI Arbitration'),
        Paragraph(
            'AI Arbitration would provide a fast, fair, and consistent dispute resolution mechanism that '
            'draws on the full evidentiary record of the transaction\u2014contracts, communications, '
            'delivery evidence, payment history\u2014to render decisions. For straightforward disputes, '
            'the AI would resolve cases within hours rather than the weeks or months required by '
            'traditional arbitration. For complex cases, the AI would prepare comprehensive case files '
            'for human arbitrators, dramatically reducing the time and cost of dispute resolution while '
            'maintaining fairness and due process.',
            style_body
        ),
        heading3('Silent Accounting'),
        Paragraph(
            'Silent Accounting would automatically generate accurate financial records from every '
            'transaction on the platform, eliminating the need for manual bookkeeping. Income, expenses, '
            'tax obligations, and cash flow would be tracked in real-time and organized according to the '
            'user\'s jurisdiction and accounting standards. The system would produce tax-ready reports, '
            'financial statements, and audit documentation on demand, transforming accounting from a '
            'labor-intensive back-office function into an automatic byproduct of normal platform usage.',
            style_body
        ),
        heading3('Youngsend API Marketplace'),
        Paragraph(
            'The Youngsend API Marketplace would allow third-party developers to build on top of the '
            'platform\'s trust, payment, and identity infrastructure. Developers could offer specialized '
            'services\u2014industry-specific compliance modules, custom analytics dashboards, integrated '
            'ERP connectors\u2014that extend the platform\'s capabilities while generating revenue for '
            'both the developers and Youngsend. This marketplace approach would accelerate platform '
            'expansion into verticals and use cases that the core team cannot address alone, creating '
            'a vibrant ecosystem around the central commerce infrastructure.',
            style_body
        ),
    ]
    story += safe_keep_together(ch5_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 6: The Digital Twin
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch6_elements = heading1(6, 'The Digital Twin')
    ch6_elements += [
        Paragraph(
            'The Youngsend Digital Twin is not a wallet and not a profile\u2014it is a living, '
            'breathing digital representation of your entire financial life. While a wallet holds '
            'money and a profile displays credentials, the Digital Twin understands the story behind '
            'every financial event. It knows every invoice you have issued and received, every client '
            'relationship and supplier dependency, every contract you have signed, every payment that '
            'has flowed through your business, every tax event, every dispute, every subscription, every '
            'recurring expense, and every financial goal you have set. It does not merely store this '
            'information; it understands the relationships between these elements and can reason about '
            'them holistically.',
            style_body
        ),
        make_blockquote(
            '"Can I open a new office in Dubai?" "Can I afford to hire five engineers?" '
            '"What happens if the USD weakens by ten percent?" The Digital Twin answers these '
            'questions not with guesses, but with evidence-based simulations powered by your '
            'actual financial data.'
        ),
        Paragraph(
            'The Digital Twin runs sophisticated simulations using your real financial data to answer '
            'complex strategic questions. When you ask whether you can afford to hire five engineers, '
            'the AI examines your current cash reserves, projected revenue based on pipeline data, '
            'historical hiring costs in your geography, existing contractual obligations, and seasonal '
            'patterns to provide a nuanced answer with confidence ranges and scenario analysis. When '
            'you ask about currency exposure, it models the impact of exchange rate movements across '
            'all your active contracts and upcoming obligations, quantifying both the risk and the '
            'potential hedging strategies available on the platform.',
            style_body
        ),
        Paragraph(
            'Over time, the Digital Twin becomes an increasingly accurate model of your business. It '
            'learns your patterns, understands your preferences, and can anticipate your needs before '
            'you articulate them. It is the ultimate expression of Youngsend\'s vision: a system that '
            'does not just process transactions but actively helps you make better financial decisions. '
            'The Digital Twin transforms the platform from a tool you use into an advisor you trust, '
            'and it represents the most ambitious intersection of artificial intelligence and financial '
            'services that the industry has yet seen.',
            style_body
        ),
    ]
    story += safe_keep_together(ch6_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 7: Technology Stack and Architecture
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch7_elements = heading1(7, 'Technology Stack and Architecture')
    ch7_elements += [
        Paragraph(
            'Youngsend\'s technology stack is designed for the demands of global, real-time financial '
            'infrastructure: extreme reliability, sub-second response times, robust security, and the '
            'ability to process millions of interconnected transactions across multiple jurisdictions '
            'simultaneously. Every technology choice is driven by these requirements rather than trends '
            'or convenience.',
            style_body
        ),
        heading2('ch7-backend', '7.1 Backend'),
        Paragraph(
            'The primary backend is built in Rust using the Axum web framework. Rust provides memory '
            'safety without garbage collection pauses, extreme performance that approaches C and C++, '
            'and excellent concurrency support through its ownership model and async runtime. These '
            'properties make Rust ideal for financial infrastructure where correctness and performance '
            'are non-negotiable. AI and machine learning services are implemented in Python with '
            'FastAPI, leveraging PyTorch and ONNX for model inference. Communication between AI services '
            'and the core platform is facilitated through the Model Context Protocol (MCP), which '
            'provides a standardized interface for connecting AI capabilities with business tools '
            'and workflows.',
            style_body
        ),
        heading2('ch7-temporal', '7.2 Temporal Workflow Orchestration'),
        Paragraph(
            'Temporal is a core component of Youngsend\'s architecture, serving as the workflow '
            'orchestration engine for all long-running, multi-step business processes. Unlike simple '
            'message queues or task schedulers, Temporal provides durable execution: workflows survive '
            'server restarts, network partitions, and deployments without losing state or requiring '
            'complex recovery logic. This durability is essential for financial workflows where a '
            'mid-process failure cannot result in lost transactions, inconsistent state, or duplicate '
            'payments.',
            style_body
        ),
        Paragraph(
            'Youngsend implements six primary Temporal workflow types, each managing a critical '
            'business process. <b>Payment Orchestration</b> workflows coordinate multi-step payment '
            'routing with automatic compensation on failure, ensuring that if a payment fails at any '
            'stage, all preceding steps are safely reversed. <b>Escrow State Machine</b> workflows '
            'manage the complete lifecycle of escrow transactions including milestone tracking, '
            'verification gates, fund release, and human-in-the-loop escalation when AI confidence '
            'is insufficient. <b>KYC/Onboarding Pipeline</b> workflows orchestrate multi-step '
            'identity verification with intelligent retry logic and automatic escalation for '
            'complex cases.',
            style_body
        ),
        Paragraph(
            '<b>Cross-Border Settlement</b> workflows coordinate the complex process of international '
            'payments, managing currency conversion, compliance checks across multiple jurisdictions, '
            'and multi-rail fallback strategies when primary payment channels are unavailable. '
            '<b>Invoice Lifecycle</b> workflows track invoices from creation through payment, managing '
            'automated reminders, status updates, and financing trigger events when invoices remain '
            'unpaid past configurable thresholds. <b>Dispute Resolution</b> workflows orchestrate '
            'the evidence collection process, route cases through AI analysis and human arbitration '
            'assignment, and track resolution through to final settlement. Each workflow type is '
            'independently scalable, observable through Temporal\'s built-in monitoring tools, and '
            'testable in isolation, enabling rapid development without compromising production '
            'reliability.',
            style_body
        ),
        heading2('ch7-frontend', '7.3 Frontend and Mobile'),
        Paragraph(
            'The web application is built with Next.js, React, and TypeScript, styled with Tailwind '
            'CSS for a consistent, responsive design system. TypeScript provides type safety across '
            'the entire frontend codebase, reducing runtime errors and improving developer productivity. '
            'Mobile applications for Android, iOS, and desktop platforms are built with Flutter, '
            'enabling a single codebase to target all platforms while maintaining native performance '
            'and user experience quality. The Flutter apps share API contracts and data models with '
            'the web frontend, ensuring consistency across platforms.',
            style_body
        ),
        heading2('ch7-data', '7.4 Databases and Storage'),
        # Database table
        Paragraph(
            'Youngsend employs a polyglot persistence strategy, selecting the optimal data store for '
            'each workload type. The following table summarizes the database architecture:',
            style_body
        ),
    ]

    # Database table
    db_data = [
        [Paragraph('<b>Component</b>', ParagraphStyle('TH', fontName='FreeSerif-Bold', fontSize=9.5, leading=14, textColor=colors.white)),
         Paragraph('<b>Technology</b>', ParagraphStyle('TH', fontName='FreeSerif-Bold', fontSize=9.5, leading=14, textColor=colors.white)),
         Paragraph('<b>Purpose</b>', ParagraphStyle('TH', fontName='FreeSerif-Bold', fontSize=9.5, leading=14, textColor=colors.white))],
        [Paragraph('Financial Records', style_body), Paragraph('PostgreSQL', style_body),
         Paragraph('ACID-compliant transaction storage, relational integrity', style_body)],
        [Paragraph('Cache and Sessions', style_body), Paragraph('Redis', style_body),
         Paragraph('Caching, session management, rate limiting, message queues', style_body)],
        [Paragraph('Analytics', style_body), Paragraph('ClickHouse', style_body),
         Paragraph('Real-time analytics, AI model features, fraud detection, reporting', style_body)],
        [Paragraph('Object Storage', style_body), Paragraph('Cloudflare R2 / S3', style_body),
         Paragraph('Contracts, invoices, documents, media assets', style_body)],
    ]
    col_w = [120, 110, 221.28]
    db_table = Table(db_data, colWidths=col_w, hAlign='CENTER')
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), TABLE_STRIPE),
        ('BACKGROUND', (0, 3), (-1, 3), colors.white),
        ('BACKGROUND', (0, 4), (-1, 4), TABLE_STRIPE),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    ch7_elements.append(db_table)
    ch7_elements.append(Paragraph('Table 1: Database architecture overview', style_caption))

    ch7_elements += [
        heading2('ch7-infra', '7.5 Infrastructure'),
        Paragraph(
            'Event streaming through Apache Kafka ensures that every operation on the platform becomes '
            'an event, enabling real-time processing, audit logging, and decoupled service communication. '
            'OpenSearch provides full-text search and log analytics capabilities. The API layer exposes '
            'gRPC for internal service-to-service communication, REST for external integrations, and '
            'GraphQL where flexible query patterns are beneficial. Cloudflare handles CDN, WAF, DDoS '
            'protection, and DNS, providing a robust security perimeter at the network edge.',
            style_body
        ),
        Paragraph(
            'Container orchestration runs on Kubernetes with multi-region deployment and auto-scaling '
            'to handle demand spikes. Istio or Linkerd provides service mesh capabilities including '
            'traffic management, mutual TLS, and distributed tracing. Infrastructure as Code is managed '
            'through Terraform, ensuring reproducible, auditable environment provisioning. The CI/CD '
            'pipeline uses GitHub Actions for building and testing, with ArgoCD managing progressive '
            'deployments to production, enabling canary releases and rapid rollback capabilities.',
            style_body
        ),
        heading2('ch7-arch', '7.6 Architecture Diagram'),
        Paragraph(
            'The following diagram illustrates the layered architecture of the Youngsend platform, '
            'showing how services are organized from the user-facing AI layer down to the payment '
            'rails that connect to external financial infrastructure:',
            style_body
        ),
    ]

    # Architecture diagram as table
    arch_lines = [
        '                Youngsend Cloud',
        '              AI Financial Brain',
        '                      |',
        '  +--------------------+--------------------+',
        '  |                    |                    |',
        'Identity Service   Trust Engine       Compliance',
        '  |                    |                    |',
        '  +--------------------+--------------------+',
        '  |                    |                    |',
        'Smart Contracts   Escrow Engine     Payment Router',
        '  |                    |                    |',
        '  +--------------------+--------------------+',
        '  |                    |                    |',
        'FX Intelligence   Reputation Graph        Ledger',
        '  |                    |                    |',
        '  +--------------------+--------------------+',
        '  |                    |                    |',
        'Banks  Mobile Money  Cards  Stablecoin Rails',
    ]
    mono_style = ParagraphStyle('Mono', fontName='DejaVuSans', fontSize=7.5, leading=11, textColor=TEXT_PRIMARY)
    arch_cells = [[Paragraph(line, mono_style)] for line in arch_lines]
    arch_table = Table(arch_cells, colWidths=[available_width - 40], hAlign='CENTER')
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#faf9f7')),
        ('BOX', (0, 0), (-1, -1), 1, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (0, 0), 10),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -2), 1),
    ]))
    ch7_elements.append(arch_table)
    ch7_elements.append(Paragraph('Figure 1: Youngsend layered architecture', style_caption))

    ch7_elements += [
        heading2('ch7-security', '7.7 Security'),
        Paragraph(
            'Youngsend implements a Zero Trust security architecture where no user, service, or network '
            'segment is inherently trusted. Hardware security modules or cloud key management services '
            'protect cryptographic keys. User authentication relies on passkeys through WebAuthn combined '
            'with multi-factor authentication, eliminating password-based attack vectors entirely. All '
            'communications use end-to-end TLS with encryption at rest for all stored data.',
            style_body
        ),
        Paragraph(
            'Credentials are short-lived and automatically rotated, reducing the window of vulnerability '
            'if any credential is compromised. Comprehensive audit logs capture every access and '
            'modification event, supporting both security monitoring and regulatory compliance. '
            'Authorization combines role-based access control (RBAC) with attribute-based access '
            'control (ABAC) to enforce fine-grained permissions that adapt to context. Behavioral '
            'fraud detection systems monitor for anomalous patterns that may indicate account takeover '
            'or unauthorized activity. Continuous security monitoring, regular penetration testing, '
            'and a bug bounty program ensure that the security posture evolves alongside the threat '
            'landscape.',
            style_body
        ),
    ]
    story += safe_keep_together(ch7_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 8: Revenue Model
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch8_elements = heading1(8, 'Revenue Model')
    ch8_elements += [
        Paragraph(
            'Youngsend\'s revenue model is diversified across multiple streams, ensuring resilience '
            'and alignment with customer value creation. Each revenue stream is tied to a specific '
            'product or capability, meaning that as platform usage grows, revenue grows naturally '
            'across multiple dimensions. The following table summarizes the primary revenue streams:',
            style_body
        ),
    ]

    # Revenue table
    rev_th = ParagraphStyle('RevTH', fontName='FreeSerif-Bold', fontSize=9, leading=13, textColor=colors.white)
    rev_td = ParagraphStyle('RevTD', fontName='FreeSerif', fontSize=9, leading=13, textColor=TEXT_PRIMARY)
    rev_rows = [
        [Paragraph('<b>Revenue Stream</b>', rev_th), Paragraph('<b>Description</b>', rev_th)],
        [Paragraph('Transaction Fees', rev_td), Paragraph('Percentage-based fees on processed payments, optimized by AI routing to remain competitive', rev_td)],
        [Paragraph('Escrow Fees', rev_td), Paragraph('Fees for escrow services scaled by transaction value and verification level (AI vs. human)', rev_td)],
        [Paragraph('Premium Verification', rev_td), Paragraph('Enhanced identity and business verification services for high-value or regulated transactions', rev_td)],
        [Paragraph('Business Subscriptions', rev_td), Paragraph('Tiered monthly subscriptions for advanced features including Treasury, Copilot, and analytics', rev_td)],
        [Paragraph('API Platform', rev_td), Paragraph('Usage-based fees for third-party developers building on Youngsend infrastructure', rev_td)],
        [Paragraph('Invoice Financing', rev_td), Paragraph('Revenue share with lending partners on invoice financing facilitated through the platform', rev_td)],
        [Paragraph('FX Services', rev_td), Paragraph('Spread and fees on currency conversion through the FX Marketplace', rev_td)],
        [Paragraph('Insurance Partnerships', rev_td), Paragraph('Commission and revenue share on Commerce Insurance products', rev_td)],
        [Paragraph('Treasury Tools', rev_td), Paragraph('Premium tier of AI Treasury with advanced forecasting and optimization features', rev_td)],
        [Paragraph('AI Copilot', rev_td), Paragraph('Subscription tiers for the AI Financial Copilot with increasing query and analysis capacity', rev_td)],
        [Paragraph('Enterprise Plans', rev_td), Paragraph('Custom pricing for large organizations with dedicated support, SLAs, and integration services', rev_td)],
    ]
    rev_col_w = [140, 311.28]
    rev_table = Table(rev_rows, colWidths=rev_col_w, hAlign='CENTER')
    rev_style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]
    for i in range(1, len(rev_rows)):
        bg = colors.white if i % 2 == 1 else TABLE_STRIPE
        rev_style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    rev_table.setStyle(TableStyle(rev_style_cmds))
    ch8_elements.append(rev_table)
    ch8_elements.append(Paragraph('Table 2: Revenue model overview', style_caption))

    ch8_elements += [
        Paragraph(
            'This diversified approach means that Youngsend is not dependent on any single revenue '
            'stream. Transaction volume growth drives payment and escrow revenue. Platform adoption '
            'drives subscription and API revenue. Financial service integration drives financing, FX, '
            'and insurance revenue. Each stream reinforces the others: better trust data from '
            'verification revenue enables lower risk for financing revenue, while more transactions '
            'from payment revenue generate richer data for AI features that drive subscription '
            'revenue. The result is a flywheel of growth where value creation and revenue capture '
            'are mutually reinforcing.',
            style_body
        ),
    ]
    story += safe_keep_together(ch8_elements)

    # ═══════════════════════════════════════════════════════════════════════════
    # CHAPTER 9: Launch Priorities and Long-Term Vision
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    ch9_elements = heading1(9, 'Launch Priorities and Long-Term Vision')
    ch9_elements += [
        Paragraph(
            'Building a platform of Youngsend\'s ambition requires disciplined prioritization. Rather '
            'than attempting to launch all fifteen core products simultaneously, the initial focus is '
            'on five strategically selected features that form the foundation for everything that follows. '
            'These five products reinforce each other, creating a self-strengthening core that generates '
            'immediate value while establishing the network effects that will drive long-term competitive '
            'advantage.',
            style_body
        ),
        heading2('ch9-first5', '9.1 The Five Foundational Products'),
        heading3('1. Youngsend Trust Graph'),
        Paragraph(
            'The portable reputation system built on verified commerce data is the platform\'s most '
            'strategically important asset. By launching the Trust Graph first, Youngsend establishes '
            'the data foundation upon which all other products depend. Every transaction, every '
            'verification, and every interaction feeds the Trust Graph, making it progressively more '
            'valuable and more defensible with each passing day. The Trust Graph is also the product '
            'that creates the strongest network effects, as each new user\'s data enhances the value '
            'of the graph for all existing users.',
            style_body
        ),
        heading3('2. AI Smart Escrow'),
        Paragraph(
            'Milestone-based, intelligent escrow for services and trade is the product that '
            'demonstrates Youngsend\'s unique value proposition most clearly to early adopters. '
            'Escrow is a pain point that businesses feel acutely, and the combination of AI '
            'verification with human escalation addresses the trust gap that prevents many cross-border '
            'deals from happening. Every escrow transaction generates Trust Graph data, creating a '
            'direct flywheel between product usage and platform intelligence.',
            style_body
        ),
        heading3('3. Global Payment Router'),
        Paragraph(
            'Automatic selection of the best payment and FX route solves the immediate, tangible '
            'problem of expensive and unreliable cross-border payments. This product drives transaction '
            'volume, which generates the data that fuels the Trust Graph and trains the AI systems. '
            'The Payment Router also serves as the commercial entry point for many users: businesses '
            'come for better, cheaper payments and stay for the trust infrastructure that makes those '
            'payments safer.',
            style_body
        ),
        heading3('4. Commerce Passport'),
        Paragraph(
            'One reusable identity for cross-border business eliminates the friction of repetitive '
            'KYC processes and makes it easy for new users to start transacting immediately. The '
            'Commerce Passport is the growth lever: by reducing onboarding friction to near zero, it '
            'accelerates user acquisition and makes the platform accessible to businesses and '
            'freelancers in markets that traditional financial infrastructure has underserved. '
            'Verified identities also improve the quality and reliability of Trust Graph data.',
            style_body
        ),
        heading3('5. Financial Digital Twin'),
        Paragraph(
            'The AI assistant that understands and helps manage business finances is the product '
            'that transforms Youngsend from a transaction platform into an indispensable business '
            'partner. The Digital Twin demonstrates the power of having all financial data in one '
            'place and gives users a compelling reason to consolidate their financial operations '
            'onto Youngsend. It also serves as the primary interface for the AI capabilities that '
            'differentiate the platform from every competitor.',
            style_body
        ),
        make_callout(
            'These five products reinforce each other. As more transactions happen, the Trust Graph '
            'improves. A stronger Trust Graph enables better escrow decisions, more accurate risk '
            'assessments, and access to financing and insurance. This creates a network effect much '
            'harder to copy than a payment API.',
            label='Network Effect Flywheel'
        ),
        heading2('ch9-vision', '9.2 Long-Term Vision'),
        Paragraph(
            'Youngsend\'s ten-year vision is to become the infrastructure that makes global commerce '
            'trustworthy. Not a payment processor, not a verification service, not an escrow provider, '
            'but the foundational layer upon which the world\'s commercial interactions take place. '
            'The platform should answer five questions for every transaction: Who are the parties? '
            'Can they be trusted? What are they agreeing to? How should value move? What happens after? '
            'When Youngsend can answer all five questions reliably for any transaction, anywhere in '
            'the world, it will have achieved its mission.',
            style_body
        ),
        Paragraph(
            'The competitive moat will not be lower fees\u2014fees can always be matched. The moat will '
            'be the network of trust created by millions of verified businesses, freelancers, and '
            'transactions. It will be the Commerce Graph that no newcomer can replicate without years '
            'of accumulated data. It will be the Transaction Passports that businesses rely on for '
            'financing, compliance, and partnership decisions. It will be the Digital Twins that have '
            'learned the financial DNA of businesses around the world. This is a platform built for '
            'compounding advantage, where every day of operation makes the service more valuable and '
            'more difficult to displace.',
            style_body
        ),
        make_blockquote(
            'The moat won\'t be lower fees. It will be the network of trust created by millions '
            'of verified businesses, freelancers, and transactions\u2014a Commerce Graph that takes '
            'years to build and is impossible to replicate overnight.'
        ),
        Paragraph(
            'Youngsend stands at the intersection of several massive trends: the globalization of '
            'commerce, the rise of AI in financial services, the growing demand for trust '
            'infrastructure in an increasingly digital world, and the emergence of AI agents as '
            'participants in commercial workflows. By building the platform that connects these '
            'trends into a coherent, integrated system, Youngsend is positioned not just to participate '
            'in the future of global commerce, but to define it.',
            style_body
        ),
    ]
    story += safe_keep_together(ch9_elements)

    return story


# ─── Main ──────────────────────────────────────────────────────────────────────
def main():
    doc = TocDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        leftMargin=LEFT_M,
        rightMargin=RIGHT_M,
        topMargin=TOP_M,
        bottomMargin=BOT_M,
        title='Youngsend White Paper',
        author='Youngsend',
    )

    # Create the TOC object
    toc = TableOfContents()
    toc.levelStyles = [style_toc_h1, style_toc_h2]

    # Build story
    story = build_story()

    # Inject the toc reference into doc so afterFlowable can notify it
    # The TOC is the first TableOfContents in the story; find it.
    for item in story:
        if isinstance(item, TableOfContents):
            doc.toc = item
            break

    # Page templates
    frame = Frame(LEFT_M, BOT_M, available_width, PAGE_H - TOP_M - BOT_M, id='normal')
    body_template = PageTemplate(id='BodyPage', frames=frame, onPage=draw_page_bg)
    # First page also uses body styling (no separate cover template needed)
    first_template = PageTemplate(id='First', frames=frame, onPage=draw_page_bg)

    doc.addPageTemplates([first_template, body_template])

    # multiBuild to resolve TOC
    doc.multiBuild(story)
    print(f'PDF generated: {OUTPUT_FILE}')


if __name__ == '__main__':
    main()