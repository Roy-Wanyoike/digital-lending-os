// Digital Lending OS - Authentication API Test Script
// Uses Node.js built-in fetch for reliable HTTP requests

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  details?: string
  response?: unknown
  error?: string
}

const results: TestResult[] = []

async function logResult(result: TestResult) {
  results.push(result)
  if (result.status === 'PASS') {
    console.log(`   ✅ ${result.name}`)
    if (result.details) console.log(`   📝 ${result.details}`)
  } else {
    console.log(`   ❌ ${result.name}`)
    if (result.error) console.log(`   ⚠️  ${result.error}`)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('🔐 Digital Lending OS - Authentication API Tests')
  console.log('='.repeat(60))
  console.log()

  // ============================================
  // TEST 1: Tenant Lookup by Slug
  // ============================================
  console.log('📋 TEST 1: Tenant Lookup by Slug')
  console.log('-'.repeat(40))

  try {
    const tenantRes = await fetch(`${BASE_URL}/api/auth/tenants/abepot`)
    const tenantData = await tenantRes.json()
    
    if (tenantRes.ok && tenantData.success && tenantData.tenant) {
      await logResult({
        name: 'GET /api/auth/tenants/abepot',
        status: 'PASS',
        details: `Found tenant: ${tenantData.tenant.name} (${tenantData.tenant.slug})`,
        response: tenantData
      })
    } else {
      await logResult({
        name: 'GET /api/auth/tenants/abepot',
        status: 'FAIL',
        error: `Response: ${JSON.stringify(tenantData)}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'GET /api/auth/tenants/abepot',
      status: 'FAIL',
      error: String(error)
    })
  }

  // Test non-existent tenant
  try {
    const badTenantRes = await fetch(`${BASE_URL}/api/auth/tenants/nonexistent`)
    const badTenantData = await badTenantRes.json()
    
    if (badTenantRes.status === 404 && !badTenantData.success) {
      await logResult({
        name: 'GET /api/auth/tenants/nonexistent (404)',
        status: 'PASS',
        details: `Correctly returns 404 for non-existent tenant`
      })
    } else {
      await logResult({
        name: 'GET /api/auth/tenants/nonexistent (404)',
        status: 'FAIL',
        error: `Expected 404, got ${badTenantRes.status}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'GET /api/auth/tenants/nonexistent (404)',
      status: 'FAIL',
      error: String(error)
    })
  }

  console.log()

  // ============================================
  // TEST 2: DCP Admin Login
  // ============================================
  console.log('📋 TEST 2: DCP Admin Login')
  console.log('-'.repeat(40))

  let adminToken: string | null = null

  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalType: 'dcp_admin',
        email: 'rachel.tenant_admin0@abepot.co.ke',
        password: 'password123',
        tenantSlug: 'abepot'
      })
    })
    const loginData = await loginRes.json()
    
    if (loginRes.ok && loginData.success && loginData.token) {
      adminToken = loginData.token
      await logResult({
        name: 'POST /api/auth (DCP Admin Login)',
        status: 'PASS',
        details: `Logged in as ${loginData.user?.name} (${loginData.user?.role})`,
        response: loginData
      })
    } else {
      await logResult({
        name: 'POST /api/auth (DCP Admin Login)',
        status: 'FAIL',
        error: `Login failed: ${JSON.stringify(loginData)}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'POST /api/auth (DCP Admin Login)',
      status: 'FAIL',
      error: String(error)
    })
  }

  // Test wrong password
  try {
    const badLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalType: 'dcp_admin',
        email: 'rachel.tenant_admin0@abepot.co.ke',
        password: 'wrongpassword',
        tenantSlug: 'abepot'
      })
    })
    const badLoginData = await badLoginRes.json()
    
    if (badLoginRes.status === 401 && !badLoginData.success) {
      await logResult({
        name: 'POST /api/auth (Wrong Password)',
        status: 'PASS',
        details: `Correctly rejects invalid password`
      })
    } else {
      await logResult({
        name: 'POST /api/auth (Wrong Password)',
        status: 'FAIL',
        error: `Expected 401, got ${badLoginRes.status}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'POST /api/auth (Wrong Password)',
      status: 'FAIL',
      error: String(error)
    })
  }

  // Test missing fields
  try {
    const missingRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const missingData = await missingRes.json()
    
    if (missingRes.status === 400 && !missingData.success) {
      await logResult({
        name: 'POST /api/auth (Missing Fields)',
        status: 'PASS',
        details: `Correctly validates required fields`
      })
    } else {
      await logResult({
        name: 'POST /api/auth (Missing Fields)',
        status: 'FAIL',
        error: `Expected 400, got ${missingRes.status}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'POST /api/auth (Missing Fields)',
      status: 'FAIL',
      error: String(error)
    })
  }

  console.log()

  // ============================================
  // TEST 3: Session Validation
  // ============================================
  console.log('📋 TEST 3: Session Validation')
  console.log('-'.repeat(40))

  if (adminToken) {
    try {
      const sessionRes = await fetch(`${BASE_URL}/api/auth`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      const sessionData = await sessionRes.json()
      
      if (sessionRes.ok && sessionData.isAuthenticated) {
        await logResult({
          name: 'GET /api/auth (Session Validation)',
          status: 'PASS',
          details: `Session valid for ${sessionData.user?.name || sessionData.customer?.firstName}`,
          response: sessionData
        })
      } else {
        await logResult({
          name: 'GET /api/auth (Session Validation)',
          status: 'FAIL',
          error: `Session validation failed: ${JSON.stringify(sessionData)}`
        })
      }
    } catch (error) {
      await logResult({
        name: 'GET /api/auth (Session Validation)',
        status: 'FAIL',
        error: String(error)
      })
    }

    // Test without token
    try {
      const noAuthRes = await fetch(`${BASE_URL}/api/auth`)
      const noAuthData = await noAuthRes.json()
      
      if (noAuthRes.status === 401 && !noAuthData.isAuthenticated) {
        await logResult({
          name: 'GET /api/auth (No Token)',
          status: 'PASS',
          details: `Correctly rejects unauthenticated request`
        })
      } else {
        await logResult({
          name: 'GET /api/auth (No Token)',
          status: 'FAIL',
          error: `Expected 401, got ${noAuthRes.status}`
        })
      }
    } catch (error) {
      await logResult({
        name: 'GET /api/auth (No Token)',
        status: 'FAIL',
        error: String(error)
      })
    }
  } else {
    await logResult({
      name: 'GET /api/auth (Session Validation)',
      status: 'FAIL',
      error: 'Skipped - No admin token available from previous tests'
    })
  }

  console.log()

  // ============================================
  // TEST 4: Customer Login
  // ============================================
  console.log('📋 TEST 4: Customer Login')
  console.log('-'.repeat(40))

  let customerToken: string | null = null

  try {
    const custLoginRes = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portalType: 'customer',
        phone: '0701527334',  // Faith Chebet's phone
        password: 'password123',
        tenantSlug: 'abepot'
      })
    })
    const custLoginData = await custLoginRes.json()
    
    if (custLoginRes.ok && custLoginData.success && custLoginData.token) {
      customerToken = custLoginData.token
      await logResult({
        name: 'POST /api/auth (Customer Login)',
        status: 'PASS',
        details: `Customer logged in: ${custLoginData.customer?.firstName} ${custLoginData.customer?.lastName}`,
        response: custLoginData
      })
    } else {
      await logResult({
        name: 'POST /api/auth (Customer Login)',
        status: 'FAIL',
        error: `Customer login failed: ${JSON.stringify(custLoginData)}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'POST /api/auth (Customer Login)',
      status: 'FAIL',
      error: String(error)
    })
  }

  // Validate customer session
  if (customerToken) {
    try {
      const custSessionRes = await fetch(`${BASE_URL}/api/auth`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      })
      const custSessionData = await custSessionRes.json()
      
      if (custSessionRes.ok && custSessionData.isAuthenticated) {
        await logResult({
          name: 'GET /api/auth (Customer Session)',
          status: 'PASS',
          details: `Customer session valid for ${custSessionData.customer?.firstName}`,
          response: custSessionData
        })
      } else {
        await logResult({
          name: 'GET /api/auth (Customer Session)',
          status: 'FAIL',
          error: `Customer session validation failed: ${JSON.stringify(custSessionData)}`
        })
      }
    } catch (error) {
      await logResult({
        name: 'GET /api/auth (Customer Session)',
        status: 'FAIL',
        error: String(error)
      })
    }
  }

  console.log()

  // ============================================
  // TEST 5: Logout
  // ============================================
  console.log('📋 TEST 5: Logout')
  console.log('-'.repeat(40))

  if (adminToken) {
    try {
      const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      })
      const logoutData = await logoutRes.json()
      
      if (logoutRes.ok && logoutData.success) {
        await logResult({
          name: 'POST /api/auth/logout',
          status: 'PASS',
          details: `Logout successful: ${logoutData.message}`,
          response: logoutData
        })
      } else {
        await logResult({
          name: 'POST /api/auth/logout',
          status: 'FAIL',
          error: `Logout failed: ${JSON.stringify(logoutData)}`
        })
      }
    } catch (error) {
      await logResult({
        name: 'POST /api/auth/logout',
        status: 'FAIL',
        error: String(error)
      })
    }
  }

  // Logout without token should still succeed
  try {
    const noTokenLogoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const noTokenLogoutData = await noTokenLogoutRes.json()
    
    if (noTokenLogoutRes.ok && noTokenLogoutData.success) {
      await logResult({
        name: 'POST /api/auth/logout (No Token)',
        status: 'PASS',
        details: `Logout succeeds even without token`
      })
    } else {
      await logResult({
        name: 'POST /api/auth/logout (No Token)',
        status: 'FAIL',
        error: `Expected success, got: ${JSON.stringify(noTokenLogoutData)}`
      })
    }
  } catch (error) {
    await logResult({
      name: 'POST /api/auth/logout (No Token)',
      status: 'FAIL',
      error: String(error)
    })
  }

  console.log()

  // ============================================
  // TEST 6: Additional Tenant Lookups
  // ============================================
  console.log('📋 TEST 6: Additional Tenant Lookups')
  console.log('-'.repeat(40))

  const otherTenants = ['fabilo', 'signaturecapital', 'karibucredit']
  
  for (const slug of otherTenants) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/tenants/${slug}`)
      const data = await res.json()
      
      if (res.ok && data.success) {
        await logResult({
          name: `GET /api/auth/tenants/${slug}`,
          status: 'PASS',
          details: `${data.tenant?.name} (${data.tenant?.status})`
        })
      } else {
        await logResult({
          name: `GET /api/auth/tenants/${slug}`,
          status: 'FAIL',
          error: `Failed: ${JSON.stringify(data)}`
        })
      }
    } catch (error) {
      await logResult({
        name: `GET /api/auth/tenants/${slug}`,
        status: 'FAIL',
        error: String(error)
      })
    }
  }

  console.log()

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  
  console.log(`\nTotal Tests: ${results.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`)
    })
  }
  
  console.log('\n' + '='.repeat(60))
  
  // Print working credentials
  console.log('\n🔑 WORKING CREDENTIALS:')
  console.log('-'.repeat(40))
  console.log('\n📌 TENANT SLUGS:')
  console.log('   abepot - Abepot Credit (ACTIVE)')
  console.log('   fabilo - Fabilo Credit (ACTIVE)')
  console.log('   signaturecapital - Signature Capital (ACTIVE)')
  console.log('   karibucredit - Karibu Credit (TRIAL)')
  console.log('   edpartners - ED Partners Africa (ACTIVE)')
  console.log('   ... and 20 more tenants')
  
  console.log('\n📌 DCP ADMIN USERS (use any of these):')
  console.log('   Email: rachel.tenant_admin0@abepot.co.ke')
  console.log('   Role: TENANT_ADMIN')
  console.log('   Tenant: abepot')
  console.log('   Password: password123')
  console.log('')
  console.log('   Email: martha.tenant_admin0@fabilo.co.ke')
  console.log('   Role: TENANT_ADMIN')
  console.log('   Tenant: fabilo')
  console.log('   Password: password123')
  
  console.log('\n📌 DCP STAFF USERS:')
  console.log('   Email: samuel.staff0@abepot.co.ke')
  console.log('   Role: STAFF')
  console.log('   Tenant: abepot')
  console.log('   Password: password123')
  
  console.log('\n📌 CUSTOMERS (phone + PIN):')
  console.log('   Phone: 0701527334 (Faith Chebet @ Abepot)')
  console.log('   PIN/Password: password123')
  console.log('')
  console.log('   Phone: 0766427223 (Robert Moraa @ Abepot)')
  console.log('   PIN/Password: password123')

  console.log('\n📌 VALID PASSWORDS (demo mode):')
  console.log('   password123 ✅ (primary test password)')
  console.log('   admin123')
  console.log('   demo123')
  console.log('   Password123!')
  console.log('   password')

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
