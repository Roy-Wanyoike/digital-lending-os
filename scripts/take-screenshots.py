#!/usr/bin/env python3
"""Take screenshots of the Youngsend dashboard using Playwright."""
import asyncio
import os

from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/download/screenshots"
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()

        # 1. Login page
        print("1/8  Login page…")
        await page.goto(f"{BASE}/login", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUT}/01-login.png", full_page=True)

        # Fill credentials and log in
        print("2/8  Logging in…")
        await page.fill('input[type="email"]', 'youngsharktechnologies@gmail.com')
        await page.fill('input[type="password"]', 'Demo1234!')
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/", timeout=20000)
        await page.wait_for_timeout(3000)

        # 3. Overview tab
        print("3/8  Overview…")
        await page.wait_for_selector('[data-slot="card-content"]', timeout=15000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUT}/02-overview.png", full_page=True)

        # 4. Wallet tab
        print("4/8  Wallet…")
        await page.click('text=Wallet')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUT}/03-wallet.png", full_page=True)

        # 5. Referral tab
        print("5/8  Referral…")
        await page.click('text=Referral')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUT}/04-referral.png", full_page=True)

        # 6. Payments tab
        print("6/8  Payments…")
        await page.click('text=Payments')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUT}/05-payments.png", full_page=True)

        # 7. Escrow tab
        print("7/8  Escrow…")
        await page.click('text=Escrow')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUT}/06-escrow.png", full_page=True)

        # 8. Trust Graph tab
        print("8/8  Trust Graph…")
        await page.click('text=Trust Graph')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUT}/07-trust-graph.png", full_page=True)

        await browser.close()
        print(f"Done! Screenshots saved to {OUT}/")

asyncio.run(main())
