import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, notFound, withErrorHandler } from '@/backend/lib/api-response';
import { withApiTelemetry } from '@/backend/lib/telemetry/api-wrapper';

const PUBLIC_FIELDS = {
  id: true,
  linkRef: true,
  title: true,
  description: true,
  amount: true,
  currency: true,
  status: true,
  maxPayments: true,
  paymentCount: true,
  totalCollected: true,
} as const;

const getHandler = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) => {
  const { ref } = await params;

  const link = await db.paymentLink.findUnique({
    where: { linkRef: ref },
    select: PUBLIC_FIELDS,
  });

  if (!link) {
    return notFound('Payment link not found');
  }

  return ok(link);
});

export const GET = withApiTelemetry(getHandler, '/api/payment-links/ref/[ref]');
