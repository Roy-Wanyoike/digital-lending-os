import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getApiUser } from '@/lib/auth/api-helpers'

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const country = searchParams.get('country') || ''

    const where: Record<string, unknown> = { isActive: true }

    if (type) {
      where.type = type
    }

    const methods = await db.globalPaymentMethod.findMany({
      where,
      orderBy: [{ type: 'asc' }, { methodName: 'asc' }],
    })

    // Filter by country if provided (parse JSON countries field)
    let filtered = methods
    if (country) {
      filtered = methods.filter((method) => {
        try {
          const countries: string[] = JSON.parse(method.countries)
          return countries.includes(country.toUpperCase())
        } catch {
          return false
        }
      })
    }

    return NextResponse.json({ data: filtered })
  } catch (error) {
    console.error('Error listing global payment methods:', error)
    return NextResponse.json({ error: 'Failed to list global payment methods' }, { status: 500 })
  }
}