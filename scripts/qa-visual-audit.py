#!/usr/bin/env python3
"""Comprehensive visual QA audit — screenshots every page in light + dark mode."""
from playwright.sync_api import sync_playwright
import os, json, sys, time

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/download/qa-screenshots"
os.makedirs(OUT, exist_ok=True)

def login(page):
    """Log in with admin credentials."""
    page.goto(f"{BASE}/login?callbackUrl=/dashboard", wait_until="networkidle", timeout=15000)
    page.fill('#email', "admin@youngsend.com")
    page.fill('#password', "demo1234")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard**", timeout=15000)
    time.sleep(1)

def screenshot(page, name, full_page=True):
    path = os.path.join(OUT, name)
    page.screenshot(path=path, full_page=full_page)
    print(f"  ✅ {name}")
    return path

def audit_page(page, name, url, full_page=True):
    """Navigate, wait, screenshot, and collect visible text for analysis."""
    try:
        page.goto(url, wait_until="networkidle", timeout=15000)
        time.sleep(1)
    except Exception as e:
        # Fallback: just wait for domcontentloaded
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        time.sleep(2)
    path = screenshot(page, name, full_page)
    text = page.inner_text("body").strip()[:500]
    return {"name": name, "url": url, "path": path, "text_preview": text}

def capture_all(color_scheme):
    """Capture all pages in the given color scheme."""
    tag = "light" if color_scheme == "light" else "dark"
    print(f"\n{'='*60}")
    print(f"  Capturing {tag.upper()} mode screenshots")
    print(f"{'='*60}")
    
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            color_scheme=color_scheme,
        )
        page = ctx.new_page()
        
        # --- Public pages ---
        print("\nPublic pages:")
        results.append(audit_page(page, f"{tag}-01-landing.png", f"{BASE}/"))
        results.append(audit_page(page, f"{tag}-02-login.png", f"{BASE}/login"))
        results.append(audit_page(page, f"{tag}-03-pay.png", f"{BASE}/pay"))
        
        # --- Login ---
        print("\nLogging in...")
        try:
            login(page)
            print("  ✅ Login successful")
        except Exception as e:
            print(f"  ❌ Login failed: {e}")
            browser.close()
            return results
        
        # --- Dashboard main page ---
        print("\nDashboard pages:")
        results.append(audit_page(page, f"{tag}-04-dashboard-overview.png", f"{BASE}/dashboard"))
        
        # --- Dashboard tabs ---
        tabs = [
            ("wallets", "05-wallets"),
            ("transactions", "06-transactions"),
            ("payment-links", "07-payment-links"),
            ("escrow", "08-escrow"),
            ("analytics", "09-analytics"),
            ("settings", "10-settings"),
            ("businesses", "11-businesses"),
            ("team", "12-team"),
            ("notifications", "13-notifications"),
            ("referrals", "14-referrals"),
            ("subscriptions", "15-subscriptions"),
            ("invoices", "16-invoices"),
            ("trust-graph", "17-trust-graph"),
        ]
        for tab_name, slug in tabs:
            results.append(audit_page(page, f"{tag}-{slug}.png", f"{BASE}/dashboard?tab={tab_name}"))
        
        # --- Standalone pages ---
        print("\nStandalone pages:")
        results.append(audit_page(page, f"{tag}-18-deposits.png", f"{BASE}/deposits"))
        results.append(audit_page(page, f"{tag}-19-withdrawals.png", f"{BASE}/withdrawals"))
        results.append(audit_page(page, f"{tag}-20-conversion.png", f"{BASE}/conversion"))
        
        # --- Mobile viewport (light mode only) ---
        if color_scheme == "light":
            print("\nMobile viewport (375x812):")
            mobile_ctx = browser.new_context(
                viewport={"width": 375, "height": 812},
                color_scheme="light",
                is_mobile=True,
                has_touch=True,
            )
            mpage = mobile_ctx.new_page()
            mpage.goto(f"{BASE}/dashboard", wait_until="networkidle", timeout=15000)
            time.sleep(1)
            screenshot(mpage, f"{tag}-21-mobile-dashboard.png")
            mpage.goto(f"{BASE}/dashboard?tab=wallets", wait_until="networkidle", timeout=15000)
            time.sleep(1)
            screenshot(mpage, f"{tag}-22-mobile-wallets.png")
            mobile_ctx.close()
            print("  ✅ Mobile screenshots done")
        
        browser.close()
    
    return results

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    all_results = []
    
    if mode in ("all", "light"):
        all_results.extend(capture_all("light"))
    if mode in ("all", "dark"):
        all_results.extend(capture_all("dark"))
    
    # Save metadata
    meta_path = os.path.join(OUT, "audit-metadata.json")
    with open(meta_path, "w") as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"  Total screenshots: {len(all_results)}")
    print(f"  Metadata: {meta_path}")
    print(f"{'='*60}")
