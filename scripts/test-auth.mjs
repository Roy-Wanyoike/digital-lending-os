import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:3000';
const COOKIE_FILE = '/tmp/ys_test_cookies.txt';

// Clean old cookies
if (existsSync(COOKIE_FILE)) unlinkSync(COOKIE_FILE);

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, redirect: 'manual' });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  // Save cookies from Set-Cookie headers
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) {
    const existing = existsSync(COOKIE_FILE) ? readFileSync(COOKIE_FILE, 'utf-8') : '';
    const cookies = [...existing.split('; ').filter(Boolean), ...setCookie.map(c => c.split(';')[0])].join('; ');
    writeFileSync(COOKIE_FILE, cookies);
  }
  return { status: res.status, json, headers: Object.fromEntries(res.headers) };
}

function cookies() {
  if (existsSync(COOKIE_FILE)) return readFileSync(COOKIE_FILE, 'utf-8');
  return '';
}

console.log('1. Testing /api/auth/session (unauthenticated)...');
const session1 = await fetchJSON(`${BASE}/api/auth/session`);
console.log(`   Status: ${session1.status}, Body: ${JSON.stringify(session1.json)}`);

console.log('2. Testing /api/auth/csrf...');
const csrf = await fetchJSON(`${BASE}/api/auth/csrf`);
console.log(`   Status: ${csrf.status}, Body: ${JSON.stringify(csrf.json)}`);
const csrfToken = csrf.json?.csrfToken;
console.log(`   CSRF Token: ${csrfToken ? 'OK' : 'MISSING'}`);

console.log('3. Testing login...');
const login = await fetch(`${BASE}/api/auth/callback/credentials`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookies(),
  },
  body: `csrfToken=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent('admin@youngsend.com')}&password=demo1234&callbackUrl=%2F`,
  redirect: 'manual',
});
console.log(`   Status: ${login.status}, Location: ${login.headers.get('location')}`);
// Save login cookies
const loginCookies = login.headers.getSetCookie?.() || [];
if (loginCookies.length) {
  const existing = cookies();
  const all = [...existing.split('; ').filter(Boolean), ...loginCookies.map(c => c.split(';')[0])].join('; ');
  writeFileSync(COOKIE_FILE, all);
}
await login.text(); // drain body

console.log('4. Testing /api/auth/session (authenticated)...');
const session2 = await fetchJSON(`${BASE}/api/auth/session`, {
  headers: { 'Cookie': cookies() },
});
console.log(`   Status: ${session2.status}, Body: ${JSON.stringify(session2.json).slice(0, 300)}`);

console.log('5. Testing /api/dashboard/stats...');
const stats = await fetchJSON(`${BASE}/api/dashboard/stats`, {
  headers: { 'Cookie': cookies() },
});
console.log(`   Status: ${stats.status}, Body: ${JSON.stringify(stats.json).slice(0, 300)}`);

console.log('\nDone!');
