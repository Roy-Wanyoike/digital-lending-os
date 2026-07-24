import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const registerSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  ownerName: z.string().min(1, 'Your name is required'),
  ownerEmail: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      )
    }

    const { name, ownerName, ownerEmail, password } = parsed.data
    const slug = slugify(name)

    // Check if tenant slug already exists
    const existingTenant = await db.tenant.findUnique({
      where: { slug },
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'An organization with this name already exists.' },
        { status: 409 }
      )
    }

    // Check if email already registered in any tenant
    const existingAccount = await db.account.findFirst({
      where: { email: ownerEmail.toLowerCase() },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // Hash the password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create tenant
    const tenant = await db.tenant.create({
      data: {
        name,
        slug,
        plan: 'starter',
        ownerEmail,
        ownerName,
      },
    })

    // Create default business for the tenant
    const business = await db.business.create({
      data: {
        name: `${ownerName}'s Business`,
        country: 'US',
        tenantId: tenant.id,
      },
    })

    // Create admin account
    const account = await db.account.create({
      data: {
        email: ownerEmail.toLowerCase(),
        passwordHash,
        name: ownerName,
        role: 'admin',
        tenantId: tenant.id,
        businessId: business.id,
      },
    })

    return NextResponse.json(
      {
        data: {
          tenant,
          account,
        },
        message: 'Registration successful',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
