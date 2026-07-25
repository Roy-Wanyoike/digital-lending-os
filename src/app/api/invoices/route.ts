import { NextRequest, NextResponse } from 'next/server';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    // Get all business IDs belonging to this tenant
    const businesses = await db.business.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    if (businessIds.length === 0) {
      return successResponse({ invoices: [] });
    }

    const invoices = await db.invoice.findMany({
      where: { senderId: { in: businessIds } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ invoices });
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Invoices GET error:', error);
    return errorResponse('Failed to fetch invoices', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    const body = await req.json();
    const { businessId, amount, currency, description, dueDate } = body;

    if (!businessId) return errorResponse('businessId is required', 400);
    if (!amount) return errorResponse('amount is required', 400);

    // Verify businessId belongs to the user's tenant
    const business = await db.business.findFirst({
      where: { id: businessId, tenantId: user.tenantId },
    });

    if (!business) return errorResponse('Business not found or not in your tenant', 403);

    // Generate invoice reference
    const count = await db.invoice.count();
    const invoiceRef = `INV-${String(count + 1).padStart(6, '0')}`;

    const invoice = await db.invoice.create({
      data: {
        invoiceRef,
        senderId: businessId,
        receiverId: businessId, // self-invoice by default; can be updated later
        amount: parseFloat(amount),
        currency: currency || 'USD',
        notes: description || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'draft',
      },
    });

    return successResponse(invoice, 201);
  } catch (error: any) {
    if (error.message === 'Authentication required') return errorResponse(error.message, 401);
    console.error('Invoices POST error:', error);
    return errorResponse('Failed to create invoice', 500);
  }
}
