const BASE = 'http://localhost:3000'

async function test(name: string, url: string, method = 'GET', body?: any) {
  try {
    const opts: any = { method }
    if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body) }
    const res = await fetch(`${BASE}${url}`, opts)
    const json = await res.json()
    const ok = res.status < 400
    const data = json.data ?? json
    const count = Array.isArray(data) ? data.length : typeof data === 'object' && data.pagination ? data.pagination.total : 'object'
    console.log(`${ok ? '✅' : '❌'} ${name} → ${res.status} (${count})`)
    return ok
  } catch (e: any) {
    console.log(`❌ ${name} → ERROR: ${e.message}`)
    return false
  }
}

async function main() {
  console.log('🔍 Smoke testing all APIs...\n')
  let passed = 0, total = 0
  
  const tests = [
    ['Dashboard Stats', '/api/dashboard/stats'],
    ['Businesses', '/api/businesses?limit=5'],
    ['Escrow List', '/api/escrow/transactions?limit=5'],
    ['Wallets (biz_1)', '/api/wallets?businessId=biz_1'],
    ['Payment Links', '/api/payment-links?limit=5'],
    ['Payment Intents', '/api/payments/intents?limit=5'],
    ['Trust Scores', '/api/trust/scores?limit=5'],
    ['Trust Reviews', '/api/trust/reviews?limit=5'],
    ['Trust Relationships', '/api/trust/relationships?limit=5'],
    ['Fraud Alerts', '/api/fraud/alerts?limit=5'],
    ['Fraud Rules', '/api/fraud/rules'],
    ['Compliance Rules', '/api/compliance/rules'],
    ['Compliance Screenings', '/api/compliance/screenings?limit=5'],
    ['Matching', '/api/matching?limit=5'],
    ['Verifications', '/api/passport/verifications?limit=5'],
    ['Invoices', '/api/invoices?limit=5'],
    ['Collections', '/api/collections?limit=5'],
    ['Twin Profiles', '/api/twin/profiles?limit=5'],
    ['Payment Methods', '/api/payments/methods?businessId=biz_1'],
    ['Global Payment Methods', '/api/payment-methods/global'],
    ['Payment Rates', '/api/payments/rates'],
    ['Users', '/api/users?limit=5'],
  ]

  for (const [name, url] of tests) {
    total++
    if (await test(name as string, url as string)) passed++
  }

  // Test POST endpoints
  console.log('\n📝 Testing write endpoints...')
  const postTests = [
    ['Create Escrow', '/api/escrow/transactions', { buyerId: 'biz_1', sellerId: 'biz_2', amount: 5000, currency: 'USD' }],
    ['Create Wallet', '/api/wallets', { businessId: 'biz_2', currency: 'EUR' }],
    ['Create Payment Link', '/api/payment-links', { businessId: 'biz_1', amount: 100, currency: 'USD' }],
  ]
  for (const [name, url, body] of postTests) {
    total++
    if (await test(name as string, url as string, 'POST', body)) passed++
  }

  console.log(`\n${'='.repeat(40)}`)
  console.log(`Results: ${passed}/${total} passed`)
  if (passed === total) console.log('🎉 All tests passed!')
  else console.log('⚠️  Some tests failed')
}

main()