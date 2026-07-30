import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getApiUser, errorResponse, successResponse } from '@/lib/auth/api-helpers';
import type { ApiUser } from '@/lib/auth/api-helpers';

import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';
async function getHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    if (user.role === 'admin') {
      // Admin can see all users across tenants
      const users = await db.account.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true,
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return successResponse({ users });
    }

    // Regular users see only users in their tenant
    const users = await db.account.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ users });
  } catch (error: any) {
    console.error('Users GET error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
}

async function postHandler(req: NextRequest) {
  try {
    const user = await getApiUser(req);
    if (!user) return errorResponse('Authentication required', 401);

    if (user.role !== 'admin') {
      return errorResponse('Insufficient permissions', 403);
    }

    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !name) {
      return errorResponse('email and name are required', 400);
    }

    // Check for duplicate within same tenant
    const existing = await db.account.findFirst({
      where: { email: email.toLowerCase(), tenantId: user.tenantId },
    });
    if (existing) {
      return errorResponse('User already exists in this tenant', 409);
    }

    const newUser = await db.account.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'buyer',
        tenantId: user.tenantId,
        isActive: true,
        passwordHash: '', // Placeholder — user should set password via invite flow
      },
    });

    return successResponse(newUser, 201);
  } catch (error: any) {
    console.error('Users POST error:', error);
    return errorResponse('Failed to create user', 500);
  }
}

export const GET = withApiTelemetry(getHandler, '/api/users');

export const POST = withApiTelemetry(postHandler, '/api/users');
