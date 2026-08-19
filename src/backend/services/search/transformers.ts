// ─── OpenSearch Document Transformers ──────────────────────────────
// Transforms Prisma model records to flat OpenSearch documents and back.
// Each transformer normalizes dates to ISO strings, denormalizes related
// fields for search relevance, and strips relation objects.
//
// Search result transformers add highlight fragments and compute
// snippet fields for display.

// ── Payment types ───────────────────────────────────────────────────

export interface PaymentSearchDoc {
  id: string
  amount: number
  currency: string
  status: string
  provider: string | null
  createdAt: string
  updatedAt: string
  userId: string
  tenantId: string
  description: string | null
  fromBusinessId: string
  toBusinessId: string
  fromBusinessName?: string
  toBusinessName?: string
  paymentMethod: string | null
  escrowId: string | null
  intentRef: string | null
  txRef: string | null
  sourceAmount: number
  sourceCurrency: string
  targetAmount: number
  targetCurrency: string
}

export interface TransactionSearchDoc {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  walletId: string
  businessId: string
  createdAt: string
  reference: string | null
  txRef: string
  description: string | null
  counterpartyId: string | null
  referenceType: string | null
  balanceBefore: number
  balanceAfter: number
  provider: string | null
}

export interface BusinessSearchDoc {
  id: string
  name: string
  legalName: string | null
  industry: string | null
  country: string
  city: string | null
  status: string
  tenantId: string
  createdAt: string
  description: string | null
  website: string | null
  employeeCount: number | null
  annualRevenue: number | null
  trustScore: number | null
  credentialLevel: string | null
  kycStatus: string | null
  riskRating: string | null
}

export interface UserSearchDoc {
  id: string
  name: string
  email: string
  role: string
  status: string
  tenantId: string
  businessId: string | null
  lastLoginAt: string | null
  createdAt: string
}

export interface AuditLogSearchDoc {
  id: string
  action: string
  actor: string | null
  actorId: string
  details: string
  timestamp: string
  tenantId: string
  ipAddress: string | null
  resourceId: string | null
  resource: string | null
  metadata: Record<string, unknown> | null
}

// ── Highlighted result wrapper ──────────────────────────────────────

export interface HighlightedResult<T> {
  document: T
  highlights: Record<string, string[]>
  score: number | null
}

// ── Transformers: Prisma → OpenSearch Doc ──────────────────────────

/**
 * Transform a PaymentIntent record (with optional includes) to a
 * flat search document.
 */
export function toPaymentDoc(prismaPayment: Record<string, unknown>): PaymentSearchDoc {
  const p = prismaPayment as any // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: p.id,
    amount: Number(p.sourceAmount ?? p.amount ?? 0),
    currency: String(p.sourceCurrency ?? p.currency ?? 'USD'),
    status: String(p.status ?? 'unknown'),
    provider: p.routingProvider ? String(p.routingProvider) : null,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
    userId: String(p.fromBusinessId ?? ''),
    tenantId: String(p.tenantId ?? p.fromBusiness?.tenantId ?? ''),
    description: p.description ? String(p.description) : null,
    fromBusinessId: String(p.fromBusinessId ?? ''),
    toBusinessId: String(p.toBusinessId ?? ''),
    fromBusinessName: p.fromBusiness?.name ?? undefined,
    toBusinessName: p.toBusiness?.name ?? undefined,
    paymentMethod: p.paymentMethod ?? null,
    escrowId: p.escrowId ?? null,
    intentRef: p.intentRef ?? null,
    txRef: null,
    sourceAmount: Number(p.sourceAmount ?? 0),
    sourceCurrency: String(p.sourceCurrency ?? 'USD'),
    targetAmount: Number(p.targetAmount ?? 0),
    targetCurrency: String(p.targetCurrency ?? 'USD'),
  }
}

/**
 * Transform a PaymentTransaction (or WalletTransaction) to a search doc.
 */
export function toTransactionDoc(prismaTransaction: Record<string, unknown>): TransactionSearchDoc {
  const t = prismaTransaction as any // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: t.id,
    type: String(t.type ?? 'unknown'),
    amount: Number(t.amount ?? 0),
    currency: String(t.currency ?? 'USD'),
    status: String(t.status ?? 'unknown'),
    walletId: String(t.walletId ?? ''),
    businessId: String(t.wallet?.businessId ?? t.businessId ?? ''),
    createdAt: new Date(t.createdAt).toISOString(),
    reference: t.reference ?? null,
    txRef: String(t.txRef ?? t.providerTxId ?? ''),
    description: t.description ?? null,
    counterpartyId: t.counterpartyId ?? null,
    referenceType: t.referenceType ?? null,
    balanceBefore: Number(t.balanceBefore ?? 0),
    balanceAfter: Number(t.balanceAfter ?? 0),
    provider: t.provider ?? null,
  }
}

/**
 * Transform a Business record (with optional passport/trust includes).
 */
export function toBusinessDoc(prismaBusiness: Record<string, unknown>): BusinessSearchDoc {
  const b = prismaBusiness as any // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: b.id,
    name: String(b.name ?? ''),
    legalName: b.legalName ?? null,
    industry: b.industry ?? null,
    country: String(b.country ?? ''),
    city: b.city ?? null,
    status: String(b.status ?? 'unknown'),
    tenantId: String(b.tenantId ?? ''),
    createdAt: new Date(b.createdAt).toISOString(),
    description: b.description ?? null,
    website: b.website ?? null,
    employeeCount: b.employeeCount ?? null,
    annualRevenue: b.annualRevenue ?? null,
    trustScore: b.trustScore?.overallScore ?? null,
    credentialLevel: b.passport?.credentialLevel ?? null,
    kycStatus: b.passport?.kycStatus ?? null,
    riskRating: b.passport?.riskRating ?? null,
  }
}

/**
 * Transform an Account (user) record to a search doc.
 */
export function toUserDoc(prismaUser: Record<string, unknown>): UserSearchDoc {
  const u = prismaUser as any // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: u.id,
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    role: String(u.role ?? 'viewer'),
    status: u.isActive ? 'active' : 'inactive',
    tenantId: String(u.tenantId ?? ''),
    businessId: u.businessId ?? null,
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
  }
}

/**
 * Transform an audit log entry to a search doc.
 */
export function toAuditLogDoc(entry: {
  id: string
  action: string
  actorId: string
  actorName?: string
  details: string
  timestamp?: Date | string
  tenantId: string
  ipAddress?: string
  resourceId?: string
  resource?: string
  metadata?: Record<string, unknown>
}): AuditLogSearchDoc {
  return {
    id: entry.id,
    action: entry.action,
    actor: entry.actorName ?? entry.actorId,
    actorId: entry.actorId,
    details: entry.details,
    timestamp: entry.timestamp
      ? new Date(entry.timestamp).toISOString()
      : new Date().toISOString(),
    tenantId: entry.tenantId,
    ipAddress: entry.ipAddress ?? null,
    resourceId: entry.resourceId ?? null,
    resource: entry.resource ?? null,
    metadata: entry.metadata ?? null,
  }
}

// ── Search Result Transformers ──────────────────────────────────────

/**
 * Wrap search hits into highlighted results.
 */
export function toHighlightedResults<T>(
  hits: Array<{ _source: T; _score: number | null; highlight?: Record<string, string[]> }>,
): HighlightedResult<T>[] {
  return hits.map((hit) => ({
    document: hit._source,
    highlights: hit.highlight ?? {},
    score: hit._score,
  }))
}

/**
 * Extract the best highlight fragment for a field.
 */
export function getHighlightFragment(
  highlights: Record<string, string[]>,
  field: string,
  fallback = '',
): string {
  const fragments = highlights[field]
  if (fragments && fragments.length > 0) {
    return fragments[0]
  }
  return fallback
}

/**
 * Build a highlight request for an index's highlight fields.
 */
export function buildHighlightRequest(
  highlightFields: string[],
): Record<string, unknown> {
  const fields: Record<string, Record<string, unknown>> = {}
  for (const field of highlightFields) {
    fields[field] = {
      type: 'unified',
      fragment_size: 150,
      number_of_fragments: 3,
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
    }
  }
  return { fields }
}
