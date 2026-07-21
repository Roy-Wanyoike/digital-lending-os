#!/usr/bin/env python3
"""
Youngsend White Paper - Complete PDF Generator
Generates cover (HTML/Playwright) + body (ReportLab) and merges them.
Output: /home/z/my-project/download/Youngsend_Whitepaper.pdf
"""

import os
import subprocess
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame,
    Paragraph, Spacer, Table, TableStyle, NextPageTemplate,
    KeepTogether, CondPageBreak, Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════════════════════
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
FINAL_PDF = os.path.join(OUTPUT_DIR, 'Youngsend_Whitepaper.pdf')
BODY_PDF = os.path.join(OUTPUT_DIR, '_youngsend_body.pdf')
COVER_HTML = os.path.join(SCRIPT_DIR, 'cover.html')
COVER_PDF = os.path.join(SCRIPT_DIR, '_cover.pdf')
HTML2POSTER = '/home/z/my-project/skills/pdf/scripts/html2poster.js'

# ═══════════════════════════════════════════════════════════════════════════════
# FONT REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerifBold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerifItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerifBoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerifBold',
                   italic='FreeSerifItalic', boldItalic='FreeSerifBoldItalic')

# ═══════════════════════════════════════════════════════════════════════════════
# COLOR PALETTE
# ═══════════════════════════════════════════════════════════════════════════════
PAGE_BG       = colors.HexColor('#f8f9fc')
SECTION_BG    = colors.HexColor('#f1f3f8')
CARD_BG       = colors.HexColor('#e8ebf2')
TABLE_STRIPE  = colors.HexColor('#f0f2f7')
HEADER_FILL   = colors.HexColor('#1e2a4a')
COVER_BLOCK   = colors.HexColor('#2a3a5c')
BORDER        = colors.HexColor('#c8cdd8')
ICON          = colors.HexColor('#3b5998')
ACCENT        = colors.HexColor('#1a6fb5')
ACCENT_2      = colors.HexColor('#0ea5e9')
TEXT_PRIMARY   = colors.HexColor('#1a1a2e')
TEXT_MUTED     = colors.HexColor('#6b7280')
WHITE          = colors.HexColor('#ffffff')
SEM_SUCCESS   = colors.HexColor('#059669')
SEM_WARNING   = colors.HexColor('#d97706')
SEM_ERROR     = colors.HexColor('#dc2626')
SEM_INFO      = colors.HexColor('#2563eb')

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE GEOMETRY
# ═══════════════════════════════════════════════════════════════════════════════
PAGE_W, PAGE_H = A4  # 595.28 x 841.89
MARGIN = 1 * inch  # symmetric 1-inch margins
available_width = PAGE_W - 2 * MARGIN
available_height = PAGE_H - 2 * MARGIN

# ═══════════════════════════════════════════════════════════════════════════════
# STYLES
# ═══════════════════════════════════════════════════════════════════════════════
style_body = ParagraphStyle(
    'Body', fontName='FreeSerif', fontSize=14, leading=20,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=10,
    wordWrap='CJK',
)
style_h1 = ParagraphStyle(
    'H1', fontName='FreeSerifBold', fontSize=36, leading=44,
    textColor=TEXT_PRIMARY, spaceBefore=20, spaceAfter=14,
)
style_h2 = ParagraphStyle(
    'H2', fontName='FreeSerifBold', fontSize=24, leading=32,
    textColor=HEADER_FILL, spaceBefore=16, spaceAfter=10,
)
style_h3 = ParagraphStyle(
    'H3', fontName='FreeSerifBold', fontSize=16, leading=22,
    textColor=ACCENT, spaceBefore=12, spaceAfter=8,
)
style_bullet = ParagraphStyle(
    'Bullet', fontName='FreeSerif', fontSize=14, leading=20,
    leftIndent=28, bulletIndent=14, textColor=TEXT_PRIMARY, spaceAfter=6,
    wordWrap='CJK',
)
style_callout_label = ParagraphStyle(
    'CalloutLabel', fontName='FreeSerifBold', fontSize=12,
    textColor=ACCENT, spaceBefore=0, spaceAfter=2, leading=16,
)
style_callout_text = ParagraphStyle(
    'CalloutText', fontName='FreeSerif', fontSize=13,
    leading=18, textColor=TEXT_PRIMARY, wordWrap='CJK',
)
style_caption = ParagraphStyle(
    'Caption', fontName='FreeSerifItalic', fontSize=11, leading=15,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=8, spaceBefore=4,
)
style_toc_h1 = ParagraphStyle(
    'TOCH1', fontName='FreeSerifBold', fontSize=14, leading=24,
    leftIndent=20, textColor=TEXT_PRIMARY,
)
style_toc_h2 = ParagraphStyle(
    'TOCH2', fontName='FreeSerif', fontSize=12, leading=20,
    leftIndent=40, textColor=TEXT_MUTED,
)
style_toc_title = ParagraphStyle(
    'TOCTitle', fontName='FreeSerifBold', fontSize=36, leading=44,
    textColor=TEXT_PRIMARY, spaceBefore=60, spaceAfter=24,
    alignment=TA_LEFT,
)

# Table styles
style_th = ParagraphStyle(
    'TH', fontName='FreeSerifBold', fontSize=11, leading=15,
    textColor=WHITE, wordWrap='CJK',
)
style_td = ParagraphStyle(
    'TD', fontName='FreeSerif', fontSize=10, leading=14,
    textColor=TEXT_PRIMARY, wordWrap='CJK',
)

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def make_callout(text, label=None):
    """Accent-bordered callout box."""
    elements = []
    if label:
        elements.append(Paragraph(f'<b>{label}</b>', style_callout_label))
    elements.append(Paragraph(text, style_callout_text))
    inner = [[e] for e in elements]
    t = Table(inner, colWidths=[available_width - 24])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0, WHITE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
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


def make_blockquote(text):
    """Left-bordered blockquote."""
    t = Table(
        [[Paragraph(f'<i>{text}</i>', ParagraphStyle(
            'Quote', fontName='FreeSerifItalic', fontSize=13,
            leading=19, textColor=TEXT_MUTED, wordWrap='CJK'))]],
        colWidths=[available_width - 60]
    )
    t.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBEFORE', (0, 0), (0, -1), 2, ACCENT),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ]))
    t.hAlign = 'CENTER'
    return t


def heading1(chapter_num, title):
    """H1 with bookmark for TOC."""
    chapter_label_style = ParagraphStyle(
        'ChNum', fontName='FreeSerifBold', fontSize=13,
        leading=16, textColor=ACCENT, spaceBefore=0, spaceAfter=2
    )
    p = Paragraph(f'Chapter {chapter_num}', chapter_label_style)
    h = Paragraph(f'<a name="chapter_{chapter_num}"/>{title}', style_h1)
    h.bookmark_name = title
    h.bookmark_key = f'chapter_{chapter_num}'
    h.bookmark_text = f'Chapter {chapter_num}: {title}'
    h.bookmark_level = 0
    return [p, h]


def heading2(key, title):
    """H2 with bookmark for TOC."""
    h = Paragraph(f'<a name="{key}"/>{title}', style_h2)
    h.bookmark_name = title
    h.bookmark_key = key
    h.bookmark_text = title
    h.bookmark_level = 1
    return h


def heading3(title):
    """H3 (no TOC entry)."""
    return Paragraph(title, style_h3)


def safe_keep_together(elements):
    """Wrap heading + first paragraph in KeepTogether, keep rest separate."""
    if len(elements) <= 2:
        return [KeepTogether(elements)]
    grouped = KeepTogether(elements[:2])
    result = [grouped] + elements[2:]
    return result


def body(text):
    return Paragraph(text, style_body)


def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', style_bullet)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE NUMBERING
# ═══════════════════════════════════════════════════════════════════════════════
ROMAN_MAP = {
    1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v',
    6: 'vi', 7: 'vii', 8: 'viii', 9: 'ix', 10: 'x',
    11: 'xi', 12: 'xii', 13: 'xiii', 14: 'xiv', 15: 'xv',
}

_toc_page_count = [0]  # tracks how many TOC pages in current build pass
_body_page_offset = [0]  # offset so body pages start at 1


class TocDocTemplate(BaseDocTemplate):
    """BaseDocTemplate with TOC support via multiBuild, proper page numbering."""

    def __init__(self, *args, **kwargs):
        BaseDocTemplate.__init__(self, *args, **kwargs)
        self.page_count_offset = 0

    def afterFlowable(self, flowable):
        """Notify TOC of headings."""
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


def draw_toc_page(canvas, doc):
    """TOC page: Roman numeral footer, header line, page bg."""
    # Reset counter on first page of each build pass (multiBuild runs twice)
    if doc.page == 1:
        _toc_page_count[0] = 0
    _toc_page_count[0] += 1

    canvas.saveState()
    # Background
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Header text
    canvas.setFont('FreeSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 36, 'Youngsend White Paper')
    # Accent line under header
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, PAGE_H - 42, PAGE_W - MARGIN, PAGE_H - 42)
    # Roman numeral page number
    roman = ROMAN_MAP.get(_toc_page_count[0], str(_toc_page_count[0]))
    canvas.setFont('FreeSerif', 10)
    canvas.setFillColor(TEXT_PRIMARY)
    canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, roman)
    canvas.restoreState()


def draw_body_page(canvas, doc):
    """Body page: Arabic footer, header line, page bg. Page 1 of body = shown as 1."""
    # Capture TOC page count on first body page of each build pass
    if _body_page_offset[0] == 0 or doc.page == _toc_page_count[0] + 1:
        _body_page_offset[0] = _toc_page_count[0]

    canvas.saveState()
    # Background
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Header text
    canvas.setFont('FreeSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 36, 'Youngsend White Paper')
    # Accent line under header
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, PAGE_H - 42, PAGE_W - MARGIN, PAGE_H - 42)
    # Arabic page number (offset so body starts at 1)
    body_num = doc.page - _body_page_offset[0]
    if body_num >= 1:
        canvas.setFont('FreeSerif', 10)
        canvas.setFillColor(TEXT_PRIMARY)
        canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, str(body_num))
    canvas.restoreState()


# ═══════════════════════════════════════════════════════════════════════════════
# BUILD STORY
# ═══════════════════════════════════════════════════════════════════════════════
def build_story():
    story = []

    # ───────────────────────────────────────────────────────────────────────
    # TABLE OF CONTENTS (on TOC template)
    # ───────────────────────────────────────────────────────────────────────
    story.append(Paragraph('Table of Contents', style_toc_title))
    story.append(Spacer(1, 8))

    toc = TableOfContents()
    toc.levelStyles = [style_toc_h1, style_toc_h2]
    story.append(toc)
    story.append(Spacer(1, 24))

    # Switch to body template after TOC
    story.append(NextPageTemplate('BodyPage'))

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 1: EXECUTIVE SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch1 = heading1(1, 'Executive Summary')
    ch1 += [
        body(
            'Youngsend is not another Stripe, PayPal, Wise, Flutterwave, or M-Pesa. It is the Financial '
            'Operating System and Trust Network for Global Commerce. Where existing platforms solve isolated '
            'fragments of the financial puzzle, Youngsend weaves those fragments into a single, intelligent '
            'fabric that connects identity, trust, contracts, payments, escrow, and reputation into one '
            'seamless experience.'
        ),
        body(
            'Imagine if Stripe, Escrow.com, Wise, Deel, LinkedIn, DocuSign, and Experian had one '
            'intelligent child powered by artificial intelligence. That child would understand who you are, '
            'who you are dealing with, what you have agreed to, how money should move, and what happens after '
            'every transaction completes. Youngsend is that child, and it is growing up fast in a world that '
            'desperately needs exactly what it offers.'
        ),
        make_callout(
            'Allow anyone, anywhere in the world, to safely do business with anyone else, '
            'regardless of country, currency, or payment method.',
            label='Mission'
        ),
        body(
            'The platform addresses the entire transaction lifecycle from end to end: discover a counterparty, '
            'verify their identity and business credentials, negotiate terms, create a binding agreement, lock '
            'funds in intelligent escrow, verify progress and delivery, release money upon satisfaction, exchange '
            'currencies at competitive rates, handle tax obligations, maintain accounting records, build reputation '
            'for future transactions, and establish credit history. Today, every one of these steps requires a '
            'different platform, a different login, a different API, and a different set of assumptions about the '
            'counterparty. Youngsend unifies them all.'
        ),
        body(
            'Everyone owns one piece of the transaction today. Banks own payments. Escrow companies own '
            'fund protection. LinkedIn owns professional identity. Experian owns credit data. DocuSign owns '
            'agreements. No single entity owns the entire trust layer that connects all of these pieces together. '
            'This white paper documents the full product vision, technical architecture, unique differentiating '
            'features, revenue model, and launch strategy for Youngsend, the platform built to own that trust '
            'layer and transform global commerce for the AI era.'
        ),
    ]
    story += safe_keep_together(ch1)

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 2: PROBLEM STATEMENT
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch2 = heading1(2, 'Problem Statement')
    ch2 += [
        body(
            'The global financial system is profoundly fragmented. A typical international business '
            'relies on banks for wire transfers, PayPal for online invoices, Wise for currency conversion, '
            'Stripe for card processing, M-Pesa for mobile payments in Africa, cryptocurrency for borderless '
            'value transfer, separate escrow services for high-value deals, email threads for contract '
            'negotiations, DocuSign for signatures, QuickBooks or Xero for accounting, and yet another '
            'platform for compliance. None of these systems connect. Each one operates in isolation, creating '
            'friction, expense, and risk at every handoff between services.'
        ),
        body(
            'This fragmentation is not merely an inconvenience. It is a structural barrier that suppresses '
            'the volume of global trade that could otherwise occur. When a small business in Nigeria wants to '
            'hire a developer in Ukraine, or a manufacturer in Vietnam wants to sell to a distributor in Brazil, '
            'the absence of a unified trust and transaction layer means that many potentially valuable deals '
            'simply never happen. The cost of establishing trust, arranging payment, managing risk, and ensuring '
            'compliance across borders is often higher than the value of the transaction itself.'
        ),

        heading2('ch2-payments', 'The Payments Problem'),
        body(
            'Cross-border payments remain expensive, slow, and unreliable. Businesses routinely pay two to '
            'five percent in transfer fees on top of hidden foreign-exchange markups that can add another one to '
            'three percent. Multiple currency conversions along a single payment chain compound costs further. '
            'Settlements that should be instant can take three to five business days, and payment failures due to '
            'compliance flags, intermediary bank rejections, or simple technical errors are common. Entire '
            'countries and regions remain underserved or entirely unsupported by major payment networks, leaving '
            'millions of businesses without reliable access to global commerce infrastructure.'
        ),

        heading2('ch2-trust', 'The Trust Problem'),
        body(
            'There is no universal mechanism to determine whether a counterparty is trustworthy before entering '
            'into a transaction. Businesses and freelancers operate in a landscape where invoice fraud, fake '
            'business identities, and misrepresented credentials are commonplace. A company in Singapore has no '
            'reliable way to verify that a supplier in Nigeria is legitimate, and a freelancer in Argentina has '
            'no way to prove a track record of reliable delivery across platforms. Traditional credit bureaus are '
            'national in scope and exclude billions of people. Online reviews are easily gamed. The biggest gap '
            'in global commerce today is not payment infrastructure but trust infrastructure.'
        ),

        heading2('ch2-escrow', 'The Escrow Problem'),
        body(
            'Escrow services exist but they are expensive, manual, and slow. Traditional escrow providers '
            'charge high fees, require extensive paperwork, and operate on timelines measured in weeks rather '
            'than hours. They are limited to certain industries, typically real estate and large mergers, and '
            'are inaccessible to freelancers, small businesses, and digital product sellers. Even where escrow '
            'is available, it lacks intelligence: no automated milestone verification, no AI-assisted dispute '
            'resolution, and no integration with the broader payment and identity infrastructure that modern '
            'commerce demands.'
        ),

        heading2('ch2-freelancers', 'The Freelancer Problem'),
        body(
            'Freelancers face a unique constellation of challenges that existing platforms fail to address '
            'comprehensively. Payment platforms freeze accounts without warning, holding funds for months '
            'during vague security reviews. There is no global reputation system that follows a freelancer '
            'across platforms: a top-rated Upwork freelancer starts from zero on Fiverr or Toptal. Access '
            'to credit and financing is nearly impossible for workers without traditional employment history. '
            'Tax obligations across multiple jurisdictions add further complexity, and the administrative burden '
            'of managing contracts, invoices, and compliance drains time that should be spent on productive '
            'work. Cash flow uncertainty makes financial planning nearly impossible.'
        ),

        heading2('ch2-businesses', 'The Business Problem'),
        body(
            'Businesses of all sizes suffer from late-paying customers, unpredictable cash flow, and the '
            'challenge of financing operations against outstanding invoices. Invoice financing remains '
            'inaccessible to many small and medium enterprises, particularly in emerging markets. Multiple '
            'disconnected systems for invoicing, payments, contracts, and compliance create operational '
            'overhead and data silos. The absence of a unified view of financial health means businesses '
            'make decisions with incomplete information, leading to inefficient capital allocation and '
            'unnecessary risk exposure. Every hour spent managing disconnected financial tools is an hour '
            'not spent growing the business.'
        ),

        heading2('ch2-developers', 'The Developer Problem'),
        body(
            'Developers who build financial products must integrate a patchwork of APIs from dozens of '
            'providers to create even a basic commercial workflow. Connecting identity verification, payment '
            'processing, escrow management, contract generation, and compliance monitoring requires integrating '
            'five to ten separate services, each with its own authentication model, data format, rate limits, '
            'and reliability characteristics. This integration burden slows innovation, increases technical '
            'debt, and fragments the developer experience in ways that prevent the creation of truly '
            'comprehensive financial applications.'
        ),

        heading2('ch2-ai', 'The AI Era Problem'),
        body(
            'The rise of AI agents introduces an entirely new dimension of challenge. AI systems are '
            'increasingly capable of executing complex workflows including negotiating deals, issuing invoices, '
            'and approving payments, but businesses have no safe, governed way to let AI participate in '
            'financial operations. There is no framework for AI wallets with configurable permissions, no '
            'audit infrastructure designed for machine-initiated transactions, and no trust layer that can '
            'evaluate whether an AI agent is acting on behalf of a verified, authorized principal. As AI '
            'becomes a participant in commerce rather than merely a tool, the absence of financial '
            'infrastructure designed for this reality becomes a critical and urgent gap.'
        ),
    ]
    story += safe_keep_together(ch2)

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 3: THE YOUNGSEND PLATFORM - 15 CORE FEATURES
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch3 = heading1(3, 'The Youngsend Platform')
    ch3 += [
        body(
            'The Youngsend Platform is a comprehensive suite of fifteen core products, each designed to '
            'address a specific dimension of the global commerce problem while working together as an '
            'integrated whole. These are not independent tools thrown together; they are deeply interconnected '
            'components of a single financial operating system where data, trust, and value flow seamlessly '
            'between them. Every product generates data that strengthens the others, creating a compounding '
            'advantage that grows more powerful with each transaction on the platform.'
        ),
        heading2('ch3-identity', '3.1 Global Identity'),
        body(
            'Global Identity provides one identity and one verification process that is reusable everywhere '
            'across the platform and beyond. Think of it as a Google Login for finance: verify once, transact '
            'everywhere. The system supports document verification, biometric checks, and business registry '
            'cross-referencing across jurisdictions. Once verified, a user\'s identity credential can be '
            'presented to any counterparty on the platform, eliminating repetitive KYC processes and reducing '
            'friction in every new business relationship.'
        ),
        heading2('ch3-bizverify', '3.2 Business Verification'),
        body(
            'Business Verification goes beyond individual identity to validate companies, their directors, '
            'registered bank accounts, and tax compliance status. The system cross-references government '
            'registries, financial databases, and public records to build a comprehensive trust profile for '
            'every business. Verified businesses receive a visible trust badge that signals credibility to '
            'counterparties, reducing due diligence time and enabling faster deal execution with continuous '
            'monitoring of any changes in corporate structure or compliance standing.'
        ),
        heading2('ch3-reputation', '3.3 AI Reputation Engine'),
        body(
            'The AI Reputation Engine measures actual behavior rather than self-reported credentials or '
            'subjective reviews. It tracks whether parties pay on time, deliver on time, how often disputes '
            'arise, any history of fraud, overall business stability, and financial health indicators. Unlike '
            'review systems that can be gamed, the engine draws exclusively on verified transaction data from '
            'across the platform, creating scores that are transparent, explainable, and grounded in real '
            'commercial performance.'
        ),
        heading2('ch3-contracts', '3.4 AI Contract Builder'),
        body(
            'The AI Contract Builder transforms natural language into legally sound agreements. A user types '
            '"Build website for $5,000" and the AI generates a complete contract including scope of work, '
            'milestones, payment schedule, late fees, intellectual property clauses, jurisdiction selection, '
            'and dispute resolution procedures. The system also generates a corresponding invoice, links it to '
            'the escrow product, and establishes a payment schedule tied to delivery milestones, all stored '
            'immutably on the platform.'
        ),
        heading2('ch3-escrow', '3.5 Smart Escrow'),
        body(
            'Smart Escrow is the backbone of trusted transactions, supporting freelancing services, vehicle '
            'purchases, real estate, machinery and equipment sales, international trade, digital products, '
            'construction projects, and general professional services. Features include milestone-based fund '
            'release, AI verification for document review and delivery confirmation, human verification agents '
            'for larger deals, insurance options, structured dispute workflows, and a complete audit trail '
            'ensuring transparency at every stage of the transaction lifecycle.'
        ),
        heading2('ch3-invoice', '3.6 Smart Invoice'),
        body(
            'Smart Invoices are dynamically generated, QR-verified, and digitally signed documents that carry '
            'far more intelligence than a traditional invoice. Each invoice includes an AI-generated fraud '
            'score, real-time payment tracking, a direct link to the underlying contract, and live escrow '
            'status when applicable. Recipients verify invoice authenticity instantly by scanning the QR code, '
            'and the system tracks payment status automatically with configurable reminder schedules and '
            'escalation workflows for overdue amounts.'
        ),
        heading2('ch3-routing', '3.7 Payment Routing AI'),
        body(
            'Payment Routing AI automatically selects the optimal payment pathway for each transaction by '
            'evaluating cost, speed, foreign-exchange rate, historical success rate for the specific corridor, '
            'compliance requirements, and overall reliability. The system routes across SWIFT, Visa, '
            'Mastercard, local bank networks, mobile money systems, and cryptocurrency rails as appropriate. '
            'If the primary route fails, the AI automatically falls back to the next-best option without user '
            'intervention, continuously learning from platform-wide transaction data.'
        ),
        heading2('ch3-fx', '3.8 FX Marketplace'),
        body(
            'The FX Marketplace aggregates and compares exchange rates from licensed banks, specialized FX '
            'providers, payment networks, and stablecoin rails where regulations permit. Users see transparent, '
            'real-time rate comparisons with full visibility into fees and settlement times, empowering them to '
            'choose the best option for their specific transaction. For businesses with recurring FX needs, the '
            'platform automates currency conversion based on configurable strategies such as rate thresholds or '
            'cost-optimized routing.'
        ),
        heading2('ch3-paylinks', '3.9 Payment Links 2.0'),
        body(
            'Every payment page on Youngsend shows the verified company behind the request, the trust score '
            'of the business, the option to place funds in escrow, an AI fraud analysis of the transaction, '
            'and a complete timeline of the transaction history. This transforms the simple act of paying an '
            'invoice into a rich, informative experience where the payer has full visibility into who they are '
            'paying, how trustworthy the recipient is, and what protections are in place.'
        ),
        heading2('ch3-finhealth', '3.10 Financial Health Score'),
        body(
            'The Financial Health Score measures revenue consistency, payment history, business behavior '
            'patterns, cash flow stability, verified contracts in force, and repeat customer rates. Unlike '
            'a traditional credit score that relies on debt history, this score reflects the overall financial '
            'vitality of a business based on its actual commercial activity. It serves as a powerful signal '
            'for counterparties evaluating potential partners and for financial institutions assessing '
            'creditworthiness.'
        ),
        heading2('ch3-financing', '3.11 Invoice Financing'),
        body(
            'Businesses can request financing against verified invoices on the platform, subject to '
            'underwriting and regulatory requirements. Because Youngsend has verified the invoice, the '
            'underlying contract, the delivery confirmation, and the payer\'s payment history, the risk '
            'profile is dramatically clearer than in traditional invoice financing. This enables faster '
            'approval, lower rates, and access to capital for businesses in markets that traditional '
            'lenders have historically underserved.'
        ),
        heading2('ch3-treasury', '3.12 AI Treasury'),
        body(
            'AI Treasury automatically forecasts cash flow based on outstanding invoices, upcoming expenses, '
            'and historical patterns. It tracks expenses in real time, suggests optimal payment timing to '
            'maximize working capital, optimizes currency conversion timing based on market conditions and '
            'upcoming payment obligations, and flags unusual spending patterns that may indicate errors or '
            'fraud. The system acts as an automated financial operations manager that works around the clock.'
        ),
        heading2('ch3-copilot', '3.13 AI Financial Copilot'),
        body(
            'The AI Financial Copilot allows users to ask natural language questions about their business '
            'finances and receive instant, accurate answers drawn from their actual transaction data. '
            '"Who owes me money?" returns a prioritized list of outstanding invoices. "Can I afford to hire '
            'another developer?" analyzes current cash flow and commitments. "Which customer pays late?" '
            'identifies patterns in payment behavior. "How much tax should I prepare for?" estimates '
            'obligations based on income and jurisdiction.'
        ),
        heading2('ch3-wallet', '3.14 AI Wallet'),
        body(
            'The AI Wallet is designed for humans, businesses, and future AI agents. It supports configurable '
            'permissions, spending limits, approval workflows, and comprehensive audit logs. For businesses, '
            'the wallet enables multi-signature approvals and role-based access. For AI agents, the wallet '
            'provides permissioned, auditable access to financial operations with real-time monitoring and '
            'automatic anomaly detection, ensuring that machine-initiated transactions remain safe and '
            'transparent.'
        ),
        heading2('ch3-repnetwork', '3.15 Global Commerce Reputation Network'),
        body(
            'The biggest moat of the entire platform. Every company, freelancer, supplier, and customer on '
            'Youngsend has a verified reputation built from real transaction history, not self-reported '
            'credentials or subjective reviews. This reputation network is the foundation for trust decisions, '
            'pricing, financing access, and business matching across the entire ecosystem. As the network '
            'grows, the data becomes richer and the reputation signals become more accurate, creating a '
            'compounding advantage that is extraordinarily difficult for competitors to replicate.'
        ),
    ]
    story += safe_keep_together(ch3)

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 4: UNIQUE DIFFERENTIATING FEATURES
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch4 = heading1(4, 'Unique Differentiating Features')
    ch4 += [
        body(
            'Beyond the fifteen core products, Youngsend introduces a suite of unique differentiating '
            'features that collectively make the platform legendary. These are not incremental improvements '
            'over existing tools; they represent entirely new capabilities that no competitor offers today, '
            'creating a product experience that is fundamentally more intelligent, more trustworthy, and more '
            'comprehensive than anything else in the market.'
        ),
        heading3('Commerce DNA'),
        body(
            'Instead of a traditional credit score, Youngsend builds a Commerce DNA profile for every user. '
            'This profile shows Trust Score, Pays On Time percentage, Delivery Success percentage, Refund Rate, '
            'Dispute Rate, Growth trajectory, Financial Health, International reach, Verified Contracts count, '
            'and Verified Revenue. This becomes the business equivalent of a GitHub contribution graph: a '
            'rich, visual, verifiable record of commercial performance that follows a business or freelancer '
            'everywhere they go.'
        ),
        heading3('AI Deal Negotiator'),
        body(
            'AI helps both sides of a transaction negotiate more effectively. It analyzes market rates, '
            'suggests fair split percentages, recommends payment milestone structures, and can generate a '
            'complete contract automatically once terms are agreed. The AI acts as a neutral advisor that '
            'ensures both parties reach terms that are fair, clear, and enforceable, reducing the likelihood '
            'of disputes before they can arise.'
        ),
        heading3('AI Scam Detector'),
        body(
            'Before any money is sent, the AI warns about potential risks: a newly registered company, an '
            'invoice that resembles known fraud patterns, a domain that was recently created, a payment '
            'destination that was recently changed, or a counterparty whose behavior deviates from established '
            'patterns. These warnings are real-time and specific, giving users the information they need to '
            'make informed decisions without creating unnecessary friction for legitimate transactions.'
        ),
        heading3('Youngsend Passport'),
        body(
            'A portable identity that goes far beyond basic KYC. The Youngsend Passport includes business '
            'history, payment history, countries traded with, industries served, skills verified, languages '
            'spoken, and current compliance status. It is the single most comprehensive portable commercial '
            'identity document ever created, enabling trust decisions in seconds that would otherwise require '
            'weeks of due diligence.'
        ),
        heading3('Business Health Monitor'),
        body(
            'An AI-powered CFO that continuously monitors the financial health of a business and provides '
            'actionable insights. "Your cash runway is 5 months." "Payroll is increasing faster than revenue." '
            '"Supplier dependency risk is high: 70% of costs go to a single vendor." These insights are '
            'generated automatically from transaction data and delivered proactively, helping business owners '
            'identify and address problems before they become crises.'
        ),
        heading3('Smart Currency Lock'),
        body(
            'Users can lock an exchange rate today for a payment arriving sixty days later, removing FX '
            'uncertainty from cross-border deals. This feature is particularly valuable for international '
            'trade, freelancing, and subscription businesses where payment terms create exposure to currency '
            'fluctuations. The lock mechanism integrates directly with the escrow and invoicing systems, '
            'ensuring that the final amount received matches the agreement regardless of market movements.'
        ),
        heading3('AI Reputation Graph'),
        body(
            'The Reputation Graph builds rich relationship maps showing who has worked with whom, payment '
            'success rates between specific pairs of counterparties, verification status of all parties '
            'involved, and network-level trust signals. This goes far beyond a single score: it reveals the '
            'structure and quality of a business\'s entire commercial network, enabling nuanced trust '
            'decisions that account for the specific context of each potential transaction.'
        ),
        heading3('Commerce Timeline'),
        body(
            'Every deal on Youngsend becomes a permanent, auditable timeline: Contract Signed, Invoice '
            'Created, Escrow Funded, Shipping Initiated, Inspection Completed, Delivered, Funds Released, '
            'Accounting Updated, Tax Recorded, Credit Score Updated. Everything, forever, auditable. This '
            'timeline serves as the single source of truth for any transaction and provides the data '
            'foundation for dispute resolution, compliance reporting, and financial analysis.'
        ),
        heading3('Escrow Marketplace'),
        body(
            'Independent experts, including inspectors, lawyers, auditors, and engineers, join Youngsend as '
            'verified verification agents. When a transaction needs expert verification, Youngsend assigns '
            'the best-qualified agent based on expertise, location, availability, and past performance. Think '
            'of it as Uber for escrow verification: a marketplace that ensures every transaction can access '
            'the right expert at the right time for the right price.'
        ),
        heading3('AI Risk Prediction'),
        body(
            'Before taking a new job or entering a new deal, Youngsend predicts the probability of late '
            'payment, the likelihood of a dispute, and the probability of the customer becoming a repeat '
            'buyer. These predictions are based on the counterparty\'s full history on the platform, '
            'industry benchmarks, and macroeconomic factors, giving users the ability to make risk-adjusted '
            'decisions about which opportunities to pursue.'
        ),
        heading3('Invoice NFT'),
        body(
            'Every invoice on Youngsend receives an immutable cryptographic fingerprint, a complete ownership '
            'history, and tamper detection capabilities. This happens invisibly to users but provides a '
            'foundation for invoice financing, audit compliance, and dispute resolution that is far more '
            'reliable than any traditional invoice management system. The technology ensures that invoices '
            'cannot be altered, duplicated, or forged without detection.'
        ),
        heading3('Business Matching'),
        body(
            'AI recommends businesses with excellent payment behaviour, low fraud rates, strong delivery '
            'history, and verified identity to potential partners. A supplier in Vietnam with a strong '
            'delivery record might be matched with a buyer in Germany who needs exactly that capability. '
            'A freelancer in Kenya with consistent five-star delivery ratings might be matched with a '
            'startup in Canada looking for reliable remote talent.'
        ),
        heading3('AI Collections'),
        body(
            'AI handles the entire collections process: it negotiates payment plans, schedules reminders, '
            'follows up persistently but professionally, creates structured payment arrangements for '
            'businesses experiencing temporary difficulties, and escalates to formal dispute resolution or '
            'debt recovery when necessary. The AI adapts its approach based on the debtor\'s communication '
            'preferences, payment history, and financial situation.'
        ),
        heading3('AI Contract Memory'),
        body(
            'The AI remembers each user\'s preferences across contracts: charge fifty percent upfront, never '
            'accept Net 90 terms, always prefer USD, always include late fee clauses, require IP assignment '
            'on final payment. Over time, the contract builder becomes increasingly personalized, generating '
            'first drafts that reflect the user\'s established negotiating position and reducing the time from '
            'deal discussion to signed contract to minutes instead of days.'
        ),
        heading3('Youngsend Intelligence'),
        body(
            'A powerful search and analytics engine that answers commercial questions using the platform\'s '
            'aggregate data. "Which industries pay freelancers fastest?" "Average software development rates '
            'in Germany?" "Which countries have the highest dispute rates in cross-border trade?" This '
            'intelligence layer transforms the platform from a transaction tool into a strategic business '
            'intelligence resource.'
        ),
        heading3('Universal Wallet'),
        body(
            'A single wallet that holds cash, stablecoins, reward points, loyalty programs, gift cards, '
            'verified assets, and digital credentials. Users manage all of their financial instruments from '
            'one interface, with the AI suggesting optimal allocation and usage strategies. The Universal '
            'Wallet reduces fragmentation and gives users a comprehensive view of their total financial '
            'position across all instruments and currencies.'
        ),
        heading3('Dynamic Escrow'),
        body(
            'AI gradually releases funds based on verified milestones, GPS tracking data, IoT sensor '
            'readings, delivery confirmations, inspection results, and documentation submissions. For a '
            'construction project, funds might be released as specific building phases are verified by IoT '
            'sensors. For international shipping, GPS tracking and customs documentation trigger progressive '
            'release. This makes escrow practical for a far wider range of transactions than traditional '
            'all-or-nothing models.'
        ),
        heading3('AI Compliance Copilot'),
        body(
            'The AI Compliance Copilot provides real-time guidance on regulatory requirements for every '
            'transaction. "You can receive this payment without additional verification." "This transaction '
            'requires enhanced due diligence under current regulations." "The destination country has changed '
            'its reporting requirements for transactions above this threshold." The system keeps businesses '
            'compliant without requiring them to become regulatory experts.'
        ),
        heading3('Business Network'),
        body(
            'LinkedIn shows jobs. Youngsend shows commerce. The Business Network enables users to find '
            'verified, trusted, financially healthy suppliers, partners, and customers based on actual '
            'transaction performance rather than self-reported profiles. Warm introductions between trusted '
            'parties, collaborative deal structures, and industry-specific clusters create a commercial '
            'social layer grounded in verified reality.'
        ),
        heading3('Youngsend API Marketplace'),
        body(
            'Developers can publish and monetize fraud models, AI models, FX engines, tax modules, '
            'accounting plugins, and escrow extensions that integrate with the platform. This creates a '
            'vibrant ecosystem of specialized tools that extend Youngsend\'s capabilities without the core '
            'team needing to build every feature themselves. The API Marketplace ensures that the platform '
            'can adapt to local requirements and specialized industries faster than any single company '
            'could build internally.'
        ),
        heading3('AI Arbitration'),
        body(
            'When disputes arise, AI summarizes the contract terms, the complete transaction timeline, all '
            'evidence including messages, photos, invoices, and delivery confirmations, then presents a '
            'structured case summary to a human arbitrator. This dramatically reduces the time and cost of '
            'dispute resolution while ensuring that human judgment remains the final authority on complex '
            'or contested cases.'
        ),
        heading3('Commerce Insurance'),
        body(
            'AI estimates risk in real time and prices insurance instantly for invoice protection, shipment '
            'insurance, and freelancer non-delivery coverage. Because Youngsend has verified data on the '
            'parties, the transaction, the delivery history, and the financial health of all involved, '
            'the risk assessment is far more accurate than traditional insurance underwriting, enabling '
            'lower premiums and faster policy issuance.'
        ),
        heading3('Live Trust Score'),
        body(
            'Trust scores on Youngsend are updated in real time with every transaction, every payment, and '
            'every interaction on the platform. A single late payment or dispute immediately affects the '
            'score, and consistent positive behavior drives it upward. This real-time feedback loop creates '
            'strong incentives for reliable commercial conduct and gives counterparties up-to-the-minute '
            'information for trust decisions.'
        ),
        heading3('Silent Accounting'),
        body(
            'The user never needs to open accounting software. Every transaction on Youngsend automatically '
            'generates the appropriate accounting entries, updates financial statements, tracks tax '
            'obligations, and maintains audit-ready records. This silent accounting layer works in the '
            'background, ensuring that businesses always have accurate financial records without the '
            'administrative burden of manual bookkeeping.'
        ),
        heading3('Financial Digital Twin'),
        body(
            'A living digital representation of a user\'s entire financial life. It knows every invoice, '
            'client, supplier, contract, payment, tax event, dispute, subscription, recurring expense, and '
            'financial goal. Users can ask questions like "Can I afford to hire five engineers?" or "What '
            'happens if USD weakens by ten percent?" and the AI runs simulations using their actual financial '
            'data to provide precise, personalized answers. The Financial Digital Twin is the ultimate '
            'expression of Youngsend\'s vision: a system that understands your business as well as you do '
            'and helps you make better decisions.'
        ),
    ]
    story += safe_keep_together(ch4)

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 5: FIVE LAUNCH PRIORITIES
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch5 = heading1(5, 'Five Launch Priorities')
    ch5 += [
        body(
            'Youngsend\'s full vision encompasses dozens of products and features, but execution requires '
            'focus. The following five products have been identified as the initial launch priorities based '
            'on their ability to demonstrate value independently, their potential to generate network effects, '
            'and their strategic importance as foundations for subsequent product development. Each product '
            'addresses a pressing market need while also generating the data and user engagement necessary to '
            'accelerate the development of the broader platform.'
        ),
        heading3('1. Youngsend Trust Graph'),
        body(
            'A portable reputation system built on verified commerce data, the Trust Graph is the foundational '
            'moat of the entire platform. Every transaction generates reputation data, and that data makes '
            'every subsequent transaction safer and more efficient. Launching the Trust Graph first establishes '
            'the core value proposition and begins the process of building the network effects that will make '
            'Youngsend increasingly valuable over time. No other product on the platform is possible without '
            'the identity and verification infrastructure that the Trust Graph depends on.'
        ),
        heading3('2. AI Smart Escrow'),
        body(
            'Milestone-based, intelligent escrow for services and trade is the core product that demonstrates '
            'Youngsend\'s unique value to users. Smart Escrow solves the most acute pain point in cross-border '
            'commerce: the inability to trust a counterparty you have never met. By supporting a wide range of '
            'use cases from freelancing to international trade, and by integrating AI verification and human '
            'expert review, Smart Escrow establishes Youngsend as the platform where safe transactions happen.'
        ),
        heading3('3. Global Payment Router'),
        body(
            'Automatic selection of the best payment and FX route solves the immediate, tangible problem of '
            'expensive and unreliable cross-border payments. This product drives transaction volume, which '
            'generates the data that fuels the Trust Graph and trains the AI systems. The Payment Router also '
            'serves as the commercial entry point for many users: businesses come for better, cheaper payments '
            'and stay for the trust infrastructure that makes those payments safer.'
        ),
        heading3('4. Commerce Passport'),
        body(
            'One reusable identity for cross-border business eliminates the friction of repetitive KYC '
            'processes and makes it easy for new users to start transacting immediately. The Commerce Passport '
            'is the growth lever: by reducing onboarding friction to near zero, it accelerates user acquisition '
            'and makes the platform accessible to businesses and freelancers in markets that traditional '
            'financial infrastructure has underserved. Verified identities also improve the quality and '
            'reliability of Trust Graph data across the entire ecosystem.'
        ),
        heading3('5. Financial Digital Twin'),
        body(
            'The AI assistant that understands and helps manage business finances is the product that '
            'transforms Youngsend from a transaction platform into an indispensable business partner. The '
            'Digital Twin demonstrates the power of having all financial data in one place and gives users a '
            'compelling reason to consolidate their financial operations onto Youngsend. It also serves as '
            'the primary interface for the AI capabilities that differentiate the platform from every '
            'competitor in the market.'
        ),
        make_callout(
            'These five products reinforce each other. As more transactions happen, the Trust Graph '
            'improves. A stronger Trust Graph enables better escrow decisions, more accurate risk '
            'assessments, and access to financing and insurance. This creates a network effect much '
            'harder to copy than a payment API.',
            label='Network Effect Flywheel'
        ),
        body(
            'The strategic sequencing is deliberate. The Trust Graph and Commerce Passport establish identity '
            'and reputation infrastructure. Smart Escrow provides the core transaction product. The Payment '
            'Router drives volume and revenue. The Financial Digital Twin creates stickiness and demonstrates '
            'the power of the integrated platform. Together, these five products form a coherent launch '
            'strategy that establishes Youngsend as a category-defining platform from day one.'
        ),
    ]
    story += safe_keep_together(ch5)

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 6: TECHNOLOGY STACK & ARCHITECTURE
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch6 = heading1(6, 'Technology Stack and Architecture')
    ch6 += [
        body(
            'Youngsend\'s technology stack is designed to meet the highest standards of reliability, '
            'performance, and security that financial infrastructure demands. Every technology choice is '
            'driven by specific requirements: memory safety for handling financial data, durability for '
            'ensuring zero data loss, horizontal scalability for supporting global growth, and developer '
            'productivity for enabling rapid iteration on a complex product surface. The architecture is '
            'designed to be resilient against failures at every level, from individual service crashes to '
            'entire datacenter outages.'
        ),
        heading2('ch6-backend', '6.1 Backend: Rust + Axum'),
        body(
            'The primary backend language is Rust, chosen for its memory safety guarantees, exceptional '
            'performance characteristics, excellent concurrency support, and strong security properties. '
            'Financial infrastructure demands the highest standards of reliability: a single memory safety '
            'violation can lead to data corruption, monetary loss, or security breaches. Rust\'s ownership '
            'model eliminates entire classes of bugs at compile time, making it the ideal choice for a '
            'platform that handles people\'s money. The Axum web framework provides a modern, ergonomic '
            'HTTP layer built on Tokio\'s async runtime, delivering excellent throughput and low latency '
            'under high concurrency.'
        ),
        heading2('ch6-ai', '6.2 AI Services: Python + FastAPI + PyTorch + ONNX'),
        body(
            'The AI services layer uses Python with FastAPI for rapid development and deployment of machine '
            'learning models. PyTorch serves as the primary training framework, while ONNX provides '
            'optimized inference across different hardware accelerators. The Model Context Protocol (MCP) '
            'connects AI services with business tools, enabling AI models to access real-time transaction '
            'data, user preferences, and platform state when generating recommendations, risk assessments, '
            'and contractual language. This architecture allows AI models to be developed, tested, and '
            'deployed independently of the core backend while maintaining seamless integration.'
        ),
        heading2('ch6-temporal', '6.3 Temporal: The Durable Execution Engine'),
        body(
            'Temporal is the backbone of Youngsend\'s zero-downtime architecture and the most critical '
            'infrastructure decision in the entire stack. All critical financial workflows are implemented '
            'as Temporal workflows, ensuring that every operation completes reliably regardless of server '
            'restarts, network partitions, or deployment failures. This section describes the core Temporal '
            'workflows and the architectural rationale for this choice.'
        ),
        body(
            '<b>PaymentWorkflow</b> handles end-to-end payment processing with automatic rollback on failure. '
            'If the primary payment rail, for example Stripe, fails, Temporal automatically retries with the '
            'next-best rail, for example Wise, and if Wise fails, it continues down the routing priority list. '
            'No money is lost, no state is corrupted, and no manual intervention is required. The workflow '
            'maintains a complete audit trail of every routing decision and retry, providing the transparency '
            'that financial transactions demand.'
        ),
        body(
            '<b>EscrowWorkflow</b> manages multi-milestone escrow with human-in-the-loop dispute resolution '
            'via Temporal signals. Funds move only when all parties agree that predefined milestones have '
            'been satisfied. If a dispute arises at any point, the workflow pauses and signals a human '
            'arbitrator, resuming only when the dispute is resolved. The workflow tracks every state change, '
            'every approval, and every fund movement, creating an immutable record that supports both '
            'compliance requirements and dispute resolution.'
        ),
        body(
            '<b>InvoiceWorkflow</b> automates the entire invoice lifecycle: automated reminders at three days '
            'before due date, one day before, and on the due date itself, followed by a four-week collections '
            'escalation sequence with progressively stronger messaging. All of this is durable: if the server '
            'restarts during a reminder sequence, the workflow resumes exactly where it left off, with no '
            'missed reminders and no duplicated notifications.'
        ),
        make_callout(
            'Traditional microservices lose state when processes crash. Temporal provides durable '
            'execution: workflows survive server restarts, network partitions, and deployment failures. '
            'For a financial platform handling people\'s money, this is non-negotiable.',
            label='Why Temporal'
        ),
        body(
            'Beyond individual workflows, Temporal orchestrates cross-service coordination between payment '
            'processors, KYC services, AI engines, notification services, and accounting systems in a single '
            'coherent workflow. When a new transaction is initiated, Temporal coordinates identity verification, '
            'risk assessment, payment routing, escrow setup, notification delivery, and accounting entries as '
            'one unified process. If any step fails, the entire workflow rolls back cleanly, ensuring '
            'consistency across all services without the complexity of distributed transaction protocols '
            'like two-phase commit.'
        ),
        heading2('ch6-frontend', '6.4 Frontend: Next.js / React / TypeScript / Tailwind CSS'),
        body(
            'The web application is built with Next.js, React, and TypeScript for type safety and developer '
            'productivity. Tailwind CSS provides a utility-first styling approach that enables rapid UI '
            'development while maintaining design consistency. The frontend architecture emphasizes server-side '
            'rendering for performance and SEO, client-side interactivity for real-time updates, and a '
            'component library that ensures visual consistency across the entire application. All API '
            'communication uses type-safe contracts generated from shared TypeScript definitions.'
        ),
        heading2('ch6-mobile', '6.5 Mobile: Flutter'),
        body(
            'Flutter provides a single codebase that targets Android, iOS, and Desktop platforms, maximizing '
            'development efficiency while maintaining native performance. The choice of Flutter ensures feature '
            'parity across all platforms and enables rapid iteration on mobile experiences. The mobile app '
            'integrates biometric authentication, push notifications for transaction updates, and offline '
            'capabilities for essential functions like viewing transaction history and trust scores.'
        ),
        heading2('ch6-db', '6.6 Databases'),
        body(
            '<b>PostgreSQL</b> serves as the primary database for all financial records, leveraging its ACID '
            'compliance to ensure that every monetary transaction is recorded reliably and consistently. '
            '<b>Redis</b> handles caching, session management, rate limiting, and message queues with '
            'sub-millisecond latency. <b>ClickHouse</b> provides columnar OLAP analytics for AI model '
            'training, fraud detection, and business intelligence queries that need to scan millions of '
            'transactions in real time. This three-database architecture ensures that each workload is '
            'served by the storage engine best suited to its performance and consistency requirements.'
        ),
        heading2('ch6-streaming', '6.7 Event Streaming: Apache Kafka'),
        body(
            'Apache Kafka serves as the central nervous system of the platform. Every significant event, '
            'whether a payment, verification, invoice creation, escrow state change, notification, fraud '
            'alert, or ledger update, is published as an event to Kafka. This event-driven architecture '
            'ensures loose coupling between services, enables real-time processing pipelines for fraud '
            'detection and analytics, provides a complete audit trail of all platform activity, and allows '
            'new services to be added without modifying existing ones.'
        ),
        heading2('ch6-search', '6.8 Search: OpenSearch / Elasticsearch'),
        body(
            'OpenSearch powers the platform\'s search capabilities, including transaction search, user '
            'discovery, business directory queries, and the Youngsend Intelligence analytics engine. The '
            'search infrastructure supports full-text search, faceted filtering, geo-queries for finding '
            'nearby service providers, and real-time index updates that ensure search results reflect the '
            'latest platform state.'
        ),
        heading2('ch6-apis', '6.9 APIs'),
        body(
            'Internally, services communicate via gRPC for high-performance, type-safe, low-latency '
            'inter-service calls. Externally, REST APIs provide a developer-friendly interface for third-party '
            'integration, with comprehensive documentation, SDKs in multiple languages, and a sandbox '
            'environment for testing. GraphQL is available where flexible client-side queries make sense, '
            'allowing frontend applications to request exactly the data they need without over-fetching or '
            'under-fetching.'
        ),
        heading2('ch6-infra', '6.10 Infrastructure'),
        body(
            '<b>Cloudflare</b> provides global CDN, web application firewall, DDoS protection, and DNS '
            'management. <b>Kubernetes</b> orchestrates containerized services across multiple regions with '
            'automatic scaling, using Istio or Linkerd as a service mesh for secure inter-service '
            'communication. <b>Terraform</b> manages all infrastructure as code, ensuring reproducible '
            'environments and auditable changes. <b>GitHub Actions</b> combined with <b>ArgoCD</b> enables '
            'continuous integration and delivery with progressive deployment strategies including blue-green '
            'and canary releases that minimize the risk of production incidents.'
        ),
        heading2('ch6-security', '6.11 Security'),
        body(
            'The platform implements a Zero Trust architecture where no service, user, or network segment '
            'is implicitly trusted. Hardware Security Modules or cloud KMS manage all cryptographic keys. '
            'Passkeys via WebAuthn and multi-factor authentication protect user accounts. End-to-end TLS '
            'encrypts all data in transit, and encryption at rest protects stored data. Short-lived '
            'credentials, comprehensive audit logs, role-based and attribute-based access control, behavioral '
            'fraud detection, continuous security monitoring, and regular penetration testing form a defense '
            'in depth that protects the platform and its users against the full spectrum of modern threats.'
        ),
    ]
    story += safe_keep_together(ch6)

    # Tech Stack Table
    story.append(Spacer(1, 12))
    table_data = [
        [Paragraph('<b>Layer</b>', style_th), Paragraph('<b>Technology</b>', style_th)],
        [Paragraph('Backend', style_td), Paragraph('Rust + Axum (Tokio async runtime)', style_td)],
        [Paragraph('AI Services', style_td), Paragraph('Python + FastAPI + PyTorch + ONNX + MCP', style_td)],
        [Paragraph('Workflow Engine', style_td), Paragraph('Temporal (durable execution for all financial workflows)', style_td)],
        [Paragraph('Frontend', style_td), Paragraph('Next.js / React / TypeScript / Tailwind CSS', style_td)],
        [Paragraph('Mobile', style_td), Paragraph('Flutter (Android, iOS, Desktop)', style_td)],
        [Paragraph('Primary Database', style_td), Paragraph('PostgreSQL (ACID-compliant financial records)', style_td)],
        [Paragraph('Cache / Queue', style_td), Paragraph('Redis (caching, sessions, rate limiting)', style_td)],
        [Paragraph('Analytics DB', style_td), Paragraph('ClickHouse (columnar OLAP for AI and fraud detection)', style_td)],
        [Paragraph('Event Streaming', style_td), Paragraph('Apache Kafka (event-driven architecture)', style_td)],
        [Paragraph('Search', style_td), Paragraph('OpenSearch / Elasticsearch', style_td)],
        [Paragraph('Internal APIs', style_td), Paragraph('gRPC (high-performance inter-service communication)', style_td)],
        [Paragraph('External APIs', style_td), Paragraph('REST + GraphQL (developer-friendly integration)', style_td)],
        [Paragraph('CDN / Security', style_td), Paragraph('Cloudflare (CDN, WAF, DDoS, DNS)', style_td)],
        [Paragraph('Orchestration', style_td), Paragraph('Kubernetes + Istio/Linkerd (multi-region, auto-scaling)', style_td)],
        [Paragraph('Infrastructure as Code', style_td), Paragraph('Terraform', style_td)],
        [Paragraph('CI/CD', style_td), Paragraph('GitHub Actions + ArgoCD (blue/green, canary deploys)', style_td)],
        [Paragraph('Key Management', style_td), Paragraph('HSM / Cloud KMS', style_td)],
        [Paragraph('Auth', style_td), Paragraph('Passkeys (WebAuthn) + MFA', style_td)],
    ]

    col_w = [available_width * 0.28, available_width * 0.72]
    tech_table = Table(table_data, colWidths=col_w, repeatRows=1)
    tech_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        # Alternating stripes
        *[('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE) for i in range(2, len(table_data), 2)],
        *[('BACKGROUND', (0, i), (-1, i), WHITE) for i in range(1, len(table_data), 2)],
        # Borders
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('BOX', (0, 0), (-1, -1), 1, HEADER_FILL),
        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        # Alignment
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    tech_table.hAlign = 'CENTER'
    story.append(KeepTogether([
        Paragraph('Table 1: Youngsend Technology Stack Overview', style_caption),
        tech_table,
    ]))

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 7: REVENUE MODEL
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch7 = heading1(7, 'Revenue Model')
    ch7 += [
        body(
            'Youngsend\'s revenue model is designed to be diversified, scalable, and aligned with the value '
            'the platform delivers. Rather than relying on a single revenue stream, the platform generates '
            'income from multiple sources that grow naturally as transaction volume and user engagement '
            'increase. This diversification reduces risk and ensures the business remains resilient across '
            'different market conditions and growth stages.'
        ),

        heading2('ch7-transactions', 'Transaction Fees'),
        body(
            'The primary revenue driver is a scaled transaction fee structure that decreases in percentage '
            'as transaction value increases, incentivizing larger deals on the platform. For a transaction of '
            '$100, the fee is 0.25%. For $10,000, it is 0.4%. For $100,000, it is 0.5%. For $1,000,000, '
            'it is 0.75%. This structure ensures that small transactions remain affordable while larger '
            'transactions generate meaningful revenue, aligning the platform\'s interests with those of users '
            'across the full spectrum of transaction sizes.'
        ),

        heading2('ch7-escrow', 'Escrow Fees'),
        body(
            'Smart Escrow carries a fee for the protection and verification services it provides. Fees are '
            'tiered based on transaction value, verification level (AI-only versus human expert), and '
            'insurance coverage. The escrow fee structure is designed to make basic protection affordable '
            'for small transactions while premium services with human verification and insurance generate '
            'higher margins for larger, more complex deals.'
        ),

        heading2('ch7-verification', 'Premium Verification and Subscriptions'),
        body(
            'Businesses can pay for enhanced verification levels that include deeper due diligence, continuous '
            'monitoring, and priority dispute resolution. Subscription tiers offer additional features such as '
            'advanced analytics, priority support, higher transaction limits, and access to the AI Financial '
            'Copilot and Treasury tools. Enterprise plans provide custom integrations, dedicated account '
            'management, and tailored compliance solutions for large organizations with complex requirements.'
        ),

        heading2('ch7-fx-insurance', 'FX Services and Insurance Partnerships'),
        body(
            'The FX Marketplace generates revenue through spread markup on currency conversions. Insurance '
            'partnerships generate commission on commerce insurance products including invoice protection, '
            'shipment insurance, and freelancer non-delivery coverage. Because Youngsend\'s verified data '
            'enables more accurate risk pricing, insurance products can be offered at competitive rates while '
            'maintaining attractive margins for the platform.'
        ),

        heading2('ch7-api-financing', 'API Platform and Invoice Financing'),
        body(
            'The API Marketplace generates revenue through usage fees and revenue sharing with third-party '
            'developers who publish tools on the platform. Invoice financing generates revenue through '
            'interest and fees on financing provided against verified invoices. The combination of verified '
            'transaction data and AI-driven risk assessment enables more competitive financing terms, '
            'attracting borrowers while maintaining healthy risk-adjusted returns.'
        ),

        heading2('ch7-ai-treasury', 'AI Copilot and Treasury Subscriptions'),
        body(
            'The AI Financial Copilot and AI Treasury tools are offered as premium subscription products. '
            'Businesses pay a monthly fee for access to AI-powered cash flow forecasting, expense optimization, '
            'tax estimation, and financial health monitoring. These tools deliver tangible value that justifies '
            'ongoing subscription revenue while increasing platform stickiness by making Youngsend '
            'indispensable to daily financial operations.'
        ),
    ]
    story += safe_keep_together(ch7)

    # Revenue Table
    story.append(Spacer(1, 12))
    rev_data = [
        [Paragraph('<b>Revenue Stream</b>', style_th), Paragraph('<b>Mechanism</b>', style_th)],
        [Paragraph('Transaction Fees', style_td), Paragraph('Scaled percentage: 0.25% to 0.75% based on value', style_td)],
        [Paragraph('Escrow Fees', style_td), Paragraph('Tiered by value, verification level, and insurance', style_td)],
        [Paragraph('Premium Verification', style_td), Paragraph('Enhanced due diligence, continuous monitoring', style_td)],
        [Paragraph('Subscriptions', style_td), Paragraph('Monthly tiers for analytics, AI Copilot, Treasury', style_td)],
        [Paragraph('FX Services', style_td), Paragraph('Spread markup on currency conversions', style_td)],
        [Paragraph('Insurance Partnerships', style_td), Paragraph('Commission on invoice, shipment, freelancer insurance', style_td)],
        [Paragraph('API Marketplace', style_td), Paragraph('Usage fees and revenue sharing with developers', style_td)],
        [Paragraph('Invoice Financing', style_td), Paragraph('Interest and fees on verified-invoice financing', style_td)],
        [Paragraph('Enterprise Plans', style_td), Paragraph('Custom integrations, dedicated support, compliance', style_td)],
    ]
    rev_table = Table(rev_data, colWidths=col_w, repeatRows=1)
    rev_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        *[('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE) for i in range(2, len(rev_data), 2)],
        *[('BACKGROUND', (0, i), (-1, i), WHITE) for i in range(1, len(rev_data), 2)],
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('BOX', (0, 0), (-1, -1), 1, HEADER_FILL),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    rev_table.hAlign = 'CENTER'
    story.append(KeepTogether([
        Paragraph('Table 2: Youngsend Revenue Streams', style_caption),
        rev_table,
    ]))

    # ═══════════════════════════════════════════════════════════════════════
    # CHAPTER 8: LONG-TERM VISION
    # ═══════════════════════════════════════════════════════════════════════
    story.append(CondPageBreak(available_height * 0.25))
    ch8 = heading1(8, 'Long-Term Vision')
    ch8 += [
        body(
            'Youngsend is not trying to become another payment processor. The world already has many payment '
            'processors, and competing on fees or speed alone is a race to the bottom that ultimately '
            'destroys value for everyone involved. Instead, Youngsend aims to become the infrastructure that '
            'makes global commerce trustworthy: the layer that sits between every buyer and every seller, '
            'every employer and every freelancer, every supplier and every distributor, ensuring that every '
            'transaction can happen with confidence.'
        ),
        body(
            'The platform should answer five fundamental questions for every transaction that occurs on it. '
            'First, who are the parties? This requires robust identity verification that works across '
            'jurisdictions and is portable between transactions. Second, can they be trusted? This requires '
            'a reputation system built on verified behavioral data, not self-reported credentials or '
            'subjective reviews. Third, what are they agreeing to? This requires intelligent contract creation '
            'that captures the full intent of both parties in clear, enforceable terms. Fourth, how should '
            'value move? This requires intelligent payment routing that optimizes for cost, speed, and '
            'reliability across all available rails. Fifth, what happens after? This requires automated '
            'accounting, tax compliance, reputation updates, and credit building that ensures every '
            'transaction strengthens the platform for the next one.'
        ),
        make_callout(
            'The moat will not be lower fees. It will be the network of trust created by millions of '
            'verified businesses, freelancers, and transactions, a Commerce Graph that takes years to '
            'build and is impossible to replicate overnight.',
            label='The True Moat'
        ),
        body(
            'The long-term vision, spanning a ten-year horizon, is for Youngsend to become the trust layer '
            'of the internet. Just as HTTPS became the default security layer for all web traffic, Youngsend '
            'aims to become the default trust layer for all commercial transactions. When any business anywhere '
            'in the world considers a new transaction with an unknown counterparty, the first question should '
            'be: "Are they on Youngsend?" If the answer is yes, the transaction can proceed with confidence. '
            'If the answer is no, that absence of verified trust information becomes a signal of risk.'
        ),
        body(
            'AI agents will increasingly participate in commerce over the coming decade, negotiating deals, '
            'issuing invoices, approving payments, and managing financial operations on behalf of human '
            'principals. Youngsend provides the permissioned, auditable infrastructure for both AI-to-human '
            'and AI-to-AI transactions. The AI Wallet with configurable permissions, comprehensive audit '
            'logs, and real-time anomaly detection ensures that machine-initiated financial operations remain '
            'safe and transparent. As the boundary between human and AI economic activity blurs, Youngsend '
            'is building the infrastructure that makes this transition safe and productive.'
        ),
        body(
            'The competitive moat will not be lower fees, because fees can always be matched by well-funded '
            'competitors. The moat will be the network of trust created by millions of verified businesses, '
            'freelancers, and transactions. It will be the Commerce Graph that no newcomer can replicate '
            'without years of accumulated data. It will be the Transaction Passports that businesses rely on '
            'for financing, compliance, and partnership decisions. It will be the Financial Digital Twins that '
            'have learned the financial DNA of businesses around the world. This is a platform built for '
            'compounding advantage, where every day of operation makes the service more valuable and more '
            'difficult to displace.'
        ),
        make_blockquote(
            'When any business anywhere in the world considers a new transaction with an unknown '
            'counterparty, the first question should be: "Are they on Youngsend?" If the answer is yes, '
            'the transaction can proceed with confidence. If the answer is no, that absence of verified '
            'trust information becomes a signal of risk.'
        ),
        body(
            'Youngsend stands at the intersection of several massive trends: the globalization of commerce, '
            'the rise of AI in financial services, the growing demand for trust infrastructure in an '
            'increasingly digital world, and the emergence of AI agents as participants in commercial '
            'workflows. By building the platform that connects these trends into a coherent, integrated '
            'system, Youngsend is positioned not just to participate in the future of global commerce, but '
            'to define it. The foundation is being laid today, one verified transaction at a time.'
        ),
    ]
    story += safe_keep_together(ch8)

    return story


# ═══════════════════════════════════════════════════════════════════════════════
# GENERATE COVER PDF
# ═══════════════════════════════════════════════════════════════════════════════
def generate_cover():
    print('Rendering cover HTML to PDF via html2poster.js ...')
    result = subprocess.run(
        ['node', HTML2POSTER, COVER_HTML, '--output', COVER_PDF, '--width', '794px'],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        print(f'Cover render error: {result.stderr}')
        sys.exit(1)
    print(f'Cover PDF: {COVER_PDF}')


# ═══════════════════════════════════════════════════════════════════════════════
# GENERATE BODY PDF
# ═══════════════════════════════════════════════════════════════════════════════
def generate_body():
    print('Building body PDF via ReportLab ...')
    doc = TocDocTemplate(
        BODY_PDF,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title='Youngsend White Paper',
        author='Young Shark Technologies',
        subject='The Financial Operating System and Trust Network for Global Commerce',
        creator='Youngsend White Paper Generator',
    )

    # Page templates
    frame = Frame(MARGIN, MARGIN, available_width, available_height, id='normal')
    toc_template = PageTemplate(id='TOCPage', frames=frame, onPage=draw_toc_page)
    body_template = PageTemplate(id='BodyPage', frames=frame, onPage=draw_body_page)
    doc.addPageTemplates([toc_template, body_template])

    # Build story
    story = build_story()

    # Inject TOC reference
    for item in story:
        if isinstance(item, TableOfContents):
            doc.toc = item
            break

    # multiBuild to resolve TOC entries
    doc.multiBuild(story)

    # Store body page offset for page numbering
    # We need to know how many TOC pages were generated so body pages start at 1
    # The multiBuild runs twice; after first pass it knows TOC pages.
    # We'll use a trick: count pages after build and adjust.
    print(f'Body PDF: {BODY_PDF}')
    return doc.page


# ═══════════════════════════════════════════════════════════════════════════════
# MERGE COVER + BODY
# ═══════════════════════════════════════════════════════════════════════════════
def merge_pdfs(toc_page_count):
    from pypdf import PdfReader, PdfWriter, Transformation

    reader_cover = PdfReader(COVER_PDF)
    reader_body = PdfReader(BODY_PDF)
    writer = PdfWriter()

    # Get target A4 dimensions from body pages
    target_w = float(reader_body.pages[0].mediabox.width)
    target_h = float(reader_body.pages[0].mediabox.height)

    # Scale cover page to match body page size exactly
    cover_page = reader_cover.pages[0]
    orig_w = float(cover_page.mediabox.width)
    orig_h = float(cover_page.mediabox.height)
    scale_x = target_w / orig_w
    scale_y = target_h / orig_h

    cover_page.scale(scale_x, scale_y)
    cover_page.mediabox.upper_right = (target_w, target_h)
    writer.add_page(cover_page)

    # Copy metadata from body PDF
    if reader_body.metadata:
        writer.add_metadata(reader_body.metadata)

    # Ensure key metadata fields are present
    writer.add_metadata({
        '/Title': 'Youngsend White Paper',
        '/Author': 'Young Shark Technologies',
        '/Subject': 'The Financial Operating System and Trust Network for Global Commerce',
        '/Creator': 'Youngsend White Paper Generator',
    })

    # Add body pages
    for i, page in enumerate(reader_body.pages):
        writer.add_page(page)

    with open(FINAL_PDF, 'wb') as f:
        writer.write(f)
    print(f'Final merged PDF: {FINAL_PDF}')
    print(f'Total pages: {len(reader_cover.pages) + len(reader_body.pages)}')


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
def main():
    # Step 1: Generate cover
    generate_cover()

    # Step 2: Generate body
    body_pages = generate_body()

    # Step 3: Merge
    merge_pdfs(body_pages)

    # Step 4: Cleanup temp files
    for f in [COVER_PDF, BODY_PDF]:
        if os.path.exists(f):
            os.remove(f)

    print('\nDone. Output: /home/z/my-project/download/Youngsend_Whitepaper.pdf')


if __name__ == '__main__':
    main()