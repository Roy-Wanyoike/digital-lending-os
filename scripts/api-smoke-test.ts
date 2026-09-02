const BASE = 'http://localhost:3000'

async function test(name, url, validate) {
  try {
    const res = await fetch(url)
    const json = await res.json()
    const data = json.data !== undefined ? json.data : json
    const err = validate(data)
    if (err) { console.log(`❌ ${name}: ${err}`); return false }
    console.log(`✅ ${name}: OK (${Array.isArray(data) ? data.length + ' items' : typeof data})`)
    return true
  } catch (e) { console.log(`❌ ${name}: FETCH ERROR - ${e.message}`); return false }
}

async function main() {
  console.log('=== Digital Lending OS API Smoke Test ===\n')
  let pass = 0, fail = 0
  const check = async (n, u, v) => { const r = await test(n, u, v); r ? pass++ : fail++ }

  await check('Dashboard Stats', `${BASE}/api/dashboard/stats`, (d) => {
    if (typeof d.totalBusinesses !== 'number') return 'missing totalBusinesses'
    if (typeof d.escrowsByStatus !== 'object') return 'escrowsByStatus not an object'
    if (!Array.isArray(d.recentTransactions)) return 'missing recentTransactions'
    return ''
  })

  await check('Businesses', `${BASE}/api/businesses?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].passport?.credentialLevel) return 'passport missing credentialLevel'
    return ''
  })

  await check('Escrow Transactions', `${BASE}/api/escrow/transactions?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].txRef) return 'missing txRef'
    if (!d[0].buyer?.name) return 'missing buyer relation'
    return ''
  })

  await check('Payment Intents', `${BASE}/api/payments/intents?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].intentRef) return 'missing intentRef'
    if (d[0].sourceCurrency === undefined) return 'missing sourceCurrency'
    return ''
  })

  await check('Exchange Rates', `${BASE}/api/payments/rates`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (d[0].from === undefined) return 'missing from/to fields'
    return ''
  })

  await check('Payment Methods', `${BASE}/api/payment-methods/global`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].type) return 'missing type field'
    return ''
  })

  await check('Verifications', `${BASE}/api/passport/verifications?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    return ''
  })

  await check('Digital Twins', `${BASE}/api/twin/profiles?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].business?.name) return 'missing business relation'
    return ''
  })

  await check('Payment Links', `${BASE}/api/payment-links?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].linkRef) return 'missing linkRef'
    return ''
  })

  await check('Fraud Alerts', `${BASE}/api/fraud/alerts?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].alertRef) return 'missing alertRef'
    if (!d[0].fraudType) return 'missing fraudType'
    return ''
  })

  await check('Fraud Rules', `${BASE}/api/fraud/rules`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].action) return 'missing action field'
    return ''
  })

  await check('Business Matching', `${BASE}/api/matching?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].matchType) return 'missing matchType'
    return ''
  })

  await check('Collections', `${BASE}/api/collections?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].caseRef) return 'missing caseRef'
    if (!d[0].agingBucket) return 'missing agingBucket'
    return ''
  })

  await check('Compliance Rules', `${BASE}/api/compliance/rules`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].ruleType) return 'missing ruleType'
    return ''
  })

  await check('Compliance Screenings', `${BASE}/api/compliance/screenings?limit=5`, (d) => {
    if (!Array.isArray(d) || d.length === 0) return 'empty array'
    if (!d[0].screeningType) return 'missing screeningType'
    return ''
  })

  console.log(`\n=== Results: ${pass}/${pass + fail} passed ===`)
  if (fail > 0) process.exit(1)
}

main()