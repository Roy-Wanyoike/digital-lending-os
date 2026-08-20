import { db } from '../src/lib/db'

async function testData() {
  console.log('=== Digital Lending OS - Database State Check ===\n')
  
  // Test Tenants
  const tenants = await db.tenant.findMany({ take: 10 })
  console.log(`📊 TENANTS: ${tenants.length} total`)
  console.log('Sample tenants:')
  tenants.forEach(t => {
    console.log(`   - ${t.name} (slug: ${t.slug}, status: ${t.status}, plan: ${t.plan})`)
  })
  
  // Count all tenants
  const tenantCount = await db.tenant.count()
  console.log(`\n   Total tenant count: ${tenantCount}`)
  
  console.log('\n' + '='.repeat(50))
  
  // Test Users
  const users = await db.user.findMany({ take: 10, include: { tenant: true } })
  console.log(`\n👥 USERS: ${users.length} shown (first 10)`)
  users.forEach(u => {
    console.log(`   - ${u.name} (${u.email}) [${u.role}] @ ${u.tenant?.name || 'unknown'}`)
  })
  
  const userCount = await db.user.count()
  console.log(`\n   Total user count: ${userCount}`)
  
  // Users by role
  const roles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'STAFF', 'AGENT', 'VIEWER']
  console.log('\n   Users by role:')
  for (const role of roles) {
    const count = await db.user.count({ where: { role: role as any } })
    if (count > 0) console.log(`      ${role}: ${count}`)
  }
  
  console.log('\n' + '='.repeat(50))
  
  // Test Customers
  const customers = await db.customer.findMany({ take: 10, include: { tenant: true } })
  console.log(`\n🧑‍💼 CUSTOMERS: ${customers.length} shown (first 10)`)
  customers.forEach(c => {
    console.log(`   - ${c.firstName} ${c.lastName} (phone: ${c.phone}) [${c.status}] @ ${c.tenant?.name || 'unknown'}`)
  })
  
  const customerCount = await db.customer.count()
  console.log(`\n   Total customer count: ${customerCount}`)
  
  console.log('\n' + '='.repeat(50))
  
  // Summary
  console.log('\n📋 SUMMARY:')
  console.log(`   Tenants: ${tenantCount}`)
  console.log(`   Users: ${userCount}`)
  console.log(`   Customers: ${customerCount}`)
  
  // Check for specific expected data
  console.log('\n🔍 SPECIFIC CHECKS:')
  
  // Check for abepot tenant
  const abepotTenant = await db.tenant.findUnique({ where: { slug: 'abepot' } })
  if (abepotTenant) {
    console.log('   ✅ Tenant "abepot" exists:', abepotTenant.name)
    
    // Get users in abepot
    const abepotUsers = await db.user.findMany({
      where: { tenantId: abepotTenant.id },
      take: 5
    })
    console.log(`   ✅ Abepot has ${abepotUsers.length}+ users:`)
    abepotUsers.forEach(u => {
      console.log(`      - ${u.email} [${u.role}]`)
    })
    
    // Get customers in abepot
    const abepotCustomers = await db.customer.findMany({
      where: { tenantId: abepotTenant.id },
      take: 5
    })
    console.log(`   ✅ Abepot has ${abepotCustomers.length}+ customers:`)
    abepotCustomers.forEach(c => {
      console.log(`      - ${c.phone} (${c.firstName} ${c.lastName})`)
    })
  } else {
    console.log('   ❌ Tenant "abepot" NOT found!')
  }
  
  // Check for rachel user
  const rachelUser = await db.user.findFirst({
    where: { email: { contains: 'rachel' } },
    include: { tenant: true }
  })
  if (rachelUser) {
    console.log('\n   ✅ Rachel user found:', rachelUser.email, `@ ${rachelUser.tenant?.slug}`)
  } else {
    console.log('\n   ❌ No user with "rachel" in email found')
  }
}

testData()
  .then(() => {
    console.log('\n✅ Database check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during database check:', error)
    process.exit(1)
  })
