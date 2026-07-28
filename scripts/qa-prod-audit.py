#!/usr/bin/env python3
"""Production visual QA audit — runs with server already started."""
from playwright.sync_api import sync_playwright
import os, time, json, sys

BASE = os.environ.get('BASE_URL', 'http://localhost:3000')
OUT = '/home/z/my-project/download/qa-screenshots'
os.makedirs(OUT, exist_ok=True)

def login(page):
    page.goto(f'{BASE}/login?callbackUrl=/dashboard', wait_until='networkidle', timeout=15000)
    page.fill('#email', 'admin@youngsend.com')
    page.fill('#password', 'demo1234')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=15000)
    time.sleep(2)

def ss(page, name, full=True):
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=full)
    print(f'  {name}')
    return path

def capture_all(scheme):
    tag = scheme
    print(f'\n--- {tag.upper()} MODE ---')
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width':1440,'height':900}, color_scheme=scheme)
        page = ctx.new_page()

        # Public pages
        page.goto(f'{BASE}/', wait_until='networkidle', timeout=15000); time.sleep(1)
        results.append(ss(page, f'prod-{tag}-01-landing.png'))

        page.goto(f'{BASE}/login', wait_until='networkidle', timeout=15000); time.sleep(1)
        results.append(ss(page, f'prod-{tag}-02-login.png'))

        page.goto(f'{BASE}/pay', wait_until='networkidle', timeout=15000); time.sleep(1)
        results.append(ss(page, f'prod-{tag}-03-pay.png'))

        # Login
        login(page)
        results.append(ss(page, f'prod-{tag}-04-dashboard.png'))

        # Dashboard tabs
        tabs = [
            ('wallets','05-wallets'), ('transactions','06-transactions'),
            ('payment-links','07-payment-links'), ('escrow','08-escrow'),
            ('analytics','09-analytics'), ('settings','10-settings'),
            ('businesses','11-businesses'), ('team','12-team'),
            ('notifications','13-notifications'), ('referrals','14-referrals'),
            ('subscriptions','15-subscriptions'), ('invoices','16-invoices'),
            ('trust-graph','17-trust-graph'),
        ]
        for tab, slug in tabs:
            page.goto(f'{BASE}/dashboard?tab={tab}', wait_until='networkidle', timeout=15000)
            time.sleep(1)
            results.append(ss(page, f'prod-{tag}-{slug}.png'))

        # Standalone pages
        for name, url in [('18-deposits','/deposits'), ('19-withdrawals','/withdrawals'), ('20-conversion','/conversion')]:
            page.goto(f'{BASE}{url}', wait_until='networkidle', timeout=15000)
            time.sleep(1)
            results.append(ss(page, f'prod-{tag}-{name}.png'))

        # Mobile (light only)
        if scheme == 'light':
            mob = browser.new_context(viewport={'width':375,'height':812}, is_mobile=True, has_touch=True)
            mp = mob.new_page()
            mp.goto(f'{BASE}/dashboard', wait_until='networkidle', timeout=15000); time.sleep(1)
            results.append(ss(mp, f'prod-{tag}-21-mobile-dashboard.png'))
            mp.goto(f'{BASE}/dashboard?tab=wallets', wait_until='networkidle', timeout=15000); time.sleep(1)
            results.append(ss(mp, f'prod-{tag}-22-mobile-wallets.png'))
            mob.close()

        browser.close()
    return results

all_results = []
all_results.extend(capture_all('light'))
all_results.extend(capture_all('dark'))

with open(os.path.join(OUT, 'prod-audit-metadata.json'), 'w') as f:
    json.dump(all_results, f, indent=2)
print(f'\nTotal screenshots: {len(all_results)}')
