# Digital Lending OS Payment Security Module

> Idempotent payment state machine, cryptographic utilities, input validation,
> security middleware, and tamper-proof audit trail for the Digital Lending OS payment
> processing pipeline.

```
   ██████╗ ██████╗ ███╗   ███╗██████╗  ██████╗  ██████╗ ████████╗
  ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔════╝ ██╔════╝ ╚══██╔══╝
  ██║     ██║   ██║██╔████╔██║██████╔╝██║  ███╗██║  ███╗    ██║
  ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║██║   ██║    ██║
  ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ╚██████╔╝╚██████╔╝    ██║
   ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝      ╚═════╝  ╚═════╝     ╚═╝
        PAYMENT STATE MACHINE & SECURITY
```

---

## Table of Contents

1. [State Machine](#state-machine)
2. [Idempotency](#idempotency)
3. [Encryption](#encryption)
4. [Validation](#validation)
5. [Security Middleware](#security-middleware)
6. [Audit Trail](#audit-trail)
7. [Architecture Overview](#architecture-overview)
8. [Quick Start](#quick-start)

---

## State Machine

### States

```
 ┌─────────────┐   ┌──────────────────┐   ┌────────────┐
 │   CREATED   │──>│ PENDING_PROVIDER │──>│ PROCESSING │
 └─────────────┘   └───────┬──────────┘   └──┬───┬─────┘
       │                     │                 │   │
       │                     │ cancel          │   │ confirm
       │                     v                 │   v
       │              ┌────────────┐          │ ┌──────────┐
       │              │ CANCELLED  │          │ │ COMPLETED│
       │              └────────────┘          │ └──┬─┬─┬──┘
       │                                      │   │ │ │
       │                                      │   │ │ │ dispute
       │                                      │   │ │ v
       │                                      │   │ │┌──────────┐
       │                                      │   │ ││ DISPUTED │
       │                                      │   │ │└──┬──┬───┘
       │                                      │   │ │   │  │
       │                                      │   │ │refund│resolve (merchant)
       │                                      │   │ v │   │
       │                                      │   │┌───────┐│
       │                                      │   ││REFUNDING││
       │                                      │   │└───┬───┘│
       │                                      │   │     │   │
       │                                      │   v     │   │
       │                                      │ ┌────────┐│  │
       │                                      │ │REFUNDED│<──┘
       │                                      │ └────────┘  (resolve = refund)
       │              ┌────────────┐          │
       └──── retry ──>│   FAILED   │<─────────┘
                     └────────────┘         (provider failure)
```

### State Definitions

| State             | Description                                      | Terminal? |
|-------------------|--------------------------------------------------|-----------|
| `CREATED`         | Payment intent created, not yet sent to provider | No        |
| `PENDING_PROVIDER`| Sent to provider, awaiting user action           | No        |
| `PROCESSING`      | User has paid, webhook from provider in-flight    | No        |
| `COMPLETED`       | Provider confirmed payment success                | Yes       |
| `FAILED`          | Provider reported payment failure                 | No*       |
| `REFUNDING`       | Refund initiated, awaiting provider confirmation  | No        |
| `REFUNDED`        | Refund confirmed by provider                      | Yes       |
| `CANCELLED`       | Payment cancelled (timeout or user action)        | Yes       |
| `DISPUTED`        | Customer opened a dispute/chargeback              | No        |

*FAILED can retry via PENDING_PROVIDER

### Legal Transitions

| From              | To                | Guard Description                    |
|-------------------|-------------------|--------------------------------------|
| CREATED           | PENDING_PROVIDER  | Provider initialized                 |
| PENDING_PROVIDER  | PROCESSING        | Webhook received from provider       |
| PROCESSING        | COMPLETED         | Provider confirmed payment success   |
| PROCESSING        | FAILED            | Provider reported payment failure   |
| COMPLETED         | REFUNDING         | Refund requested                     |
| REFUNDING         | REFUNDED          | Refund confirmed by provider         |
| COMPLETED         | DISPUTED          | Dispute opened                       |
| DISPUTED          | COMPLETED         | Dispute resolved in favor of merchant|
| DISPUTED          | REFUNDED          | Dispute resolved with refund         |
| PENDING_PROVIDER  | CANCELLED         | Payment cancelled (timeout/user)      |
| FAILED            | PENDING_PROVIDER  | Retry with new provider              |

### Idempotent Transitions

Each transition is idempotent using the key format:

```
transition_key = paymentId + ":" + targetState
```

Example:
- `pay_abc123:COMPLETED` → first call processes, subsequent calls return cached result
- The idempotency cache verifies that the current state matches before returning cached results

### Usage

```typescript
import { getPaymentStateMachine } from '@/backend/lib/payment'

const sm = getPaymentStateMachine()
sm.initialize('pay_abc123')

// Transition to PENDING_PROVIDER
const result = await sm.transition('pay_abc123', 'PENDING_PROVIDER', {
  actorId: 'user_456',
  provider: 'stripe',
})

console.log(result.success)        // true
console.log(result.idempotent)     // false (first call)
console.log(result.previousState) // CREATED
console.log(result.newState)       // PENDING_PROVIDER

// Replay same transition → returns cached result
const replay = await sm.transition('pay_abc123', 'PENDING_PROVIDER')
console.log(replay.idempotent)    // true
```

---

## Idempotency

### IdempotencyGuard

An in-memory lock manager with TTL support that prevents duplicate processing
of payment operations.

```
┌──────────┐     acquire(key, ttlMs)     ┌──────────────────┐
│  Client   │ ─────────────────────────> │  IdempotencyGuard │
│  Request  │                             │  ┌──────────────┐ │
└──────────┘  <── acquired: true ──────  │  │ Map<string,  │ │
                                       │  │  Entry>      │ │
┌──────────┐     acquire(same key)      │  └──────────────┘ │
│  Client   │ ─────────────────────────> │                    │
│  Replay   │  <── acquired: false ────  │  status:          │
└──────────┘     (already processing)    │  - processing     │
                                           │  - completed     │
┌──────────┐     acquire(same key)      │  - failed         │
│  Client   │ ─────────────────────────> │                    │
│  After    │  <── cached response ─────  │  TTL expiry →    │
│  Complete │                             │  auto-cleanup     │
└──────────┘                             └──────────────────┘
```

### Entry Lifecycle

```
  acquire()     complete()/fail()     TTL expires
  ─────────>    ──────────────────>    ──────────>
  [processing]  [completed/failed]    [deleted]
```

### Key Generation

```typescript
import { IdempotencyGuard } from '@/backend/lib/payment'

// Payment operation key
IdempotencyGuard.paymentKey('intent_abc123')
// → "idempotency:intent_abc123"

// State transition key
IdempotencyGuard.transitionKey('pay_abc123', 'COMPLETED')
// → "txn:pay_abc123:COMPLETED"
```

### Next.js Middleware

```typescript
import { withIdempotency } from '@/backend/lib/payment'

// Wrap any API handler for automatic Idempotency-Key handling
export const POST = withIdempotency(async (req) => {
  // ... process payment
  return NextResponse.json({ success: true })
}, {
  required: true,      // Require Idempotency-Key header
  ttlMs: 5 * 60 * 1000 // 5 minute cache
})
```

**Client usage:**
```
POST /api/payments/initialize
Idempotency-Key: user_456-pay_20240101-abc123
Content-Type: application/json
```

**Replay response:**
```
HTTP 200
X-Idempotency-Replayed: true
```

**Conflict (concurrent processing):**
```
HTTP 409
Retry-After: 5
```

---

## Encryption

### AES-256-GCM Field-Level Encryption

Sensitive payment data (card tokens, bank details) is encrypted at the field
level using AES-256-GCM with authentication tags.

```
Plaintext ──> [IV(12B)] ──> [AES-256-GCM] ──> Ciphertext + AuthTag
                                                        │
                                              ┌─────────┴──────────┐
                                              │  Packed & Base64:    │
                                              │  IV + AuthTag + CT   │
                                              └─────────────────────┘
```

### Key Derivation (PBKDF2)

```
PAYMENT_ENCRYPTION_KEY (env)
         │
         v
   ┌──────────┐     100,000 iterations     ┌────────────┐
   │  PBKDF2   │ ──────────────────────────> │  256-bit   │
   │  SHA-512  │     salt (32 bytes)         │  AES Key   │
   └──────────┘                             └────────────┘
```

### Usage

```typescript
import { encryptField, decryptField, generateSecureToken, hashWithBcrypt } from '@/backend/lib/payment'

// Encrypt a card token
const encrypted = encryptField('tok_visa_4242')
// → { encrypted: "base64...", keyId: "default", algorithm: "aes-256-gcm" }

// Decrypt
const plaintext = decryptField(encrypted)
// → "tok_visa_4242"

// Generate secure token (64 hex chars = 32 bytes)
const token = generateSecureToken(32, 'hex')

// Hash with bcrypt
const hash = await hashWithBcrypt('sensitive_value', 12)
```

### Environment Variables

| Variable                   | Description                        |
|----------------------------|------------------------------------|
| `PAYMENT_ENCRYPTION_KEY`   | Master passphrase for key derivation|
| `PAYMENT_ENCRYPTION_SALT`  | Static salt (base64 encoded)       |
| `PAYMENT_ENCRYPTION_KEY_ID`| Key version identifier             |

---

## Validation

### Payment Initiation Schema (Zod)

```typescript
import { validatePaymentInitiation } from '@/backend/lib/payment'

const validated = validatePaymentInitiation({
  amount: 50000,          // $500.00 in cents
  currency: 'USD',
  provider: 'stripe',
  email: 'user@example.com',
  reference: 'pay_abc123',
  idempotencyKey: 'idem_xyz',
})
```

### Webhook Signature Verification

```
              Provider (Stripe/Paystack/etc)
                        │
                        │ POST /api/payments/webhooks/:provider
                        │ X-Signature: sha256=abc123...
                        │
                        v
              ┌─────────────────────┐
              │  Signature Verify    │
              │                     │
              │  1. Timing-safe     │
              │     HMAC compare    │
              │  2. Timestamp      │
              │     freshness (<5m)│
              │  3. Zod schema     │
              │     validation      │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         valid │               invalid
              v                     v
       Process event          Reject (400)
```

### Provider-Specific Verification

| Provider     | Algorithm    | Secret Used         |
|--------------|-------------|---------------------|
| Paystack     | HMAC-SHA512 | Secret Key          |
| Stripe       | HMAC-SHA256 | Webhook Secret (t=X,v1=Y format) |
| Flutterwave  | HMAC-SHA256 | Secret Hash         |
| IntaSend      | HMAC-SHA256 | API Key             |
| Paya         | HMAC-SHA256 | Webhook Secret      |

### Input Sanitization

All user inputs are sanitized against:
- XSS (script tags, event handlers, javascript: protocol)
- SQL injection (SELECT, INSERT, UPDATE, DELETE patterns)
- NoSQL injection (${...} template patterns)
- iframe / data URI injection

---

## Security Middleware

### Request Processing Pipeline

```
  Incoming Request
        │
        v
  ┌───────────────┐   blocked?   ┌────────────┐
  │ IP Blocklist   │ ──────────> │ 403 FORBIDDEN│
  │ Check          │              └────────────┘
  └───────┬───────┘
          │ allowed
          v
  ┌───────────────┐   suspicious  ┌────────────┐
  │ User-Agent     │ ──────────> │ 403 FORBIDDEN│
  │ Validation     │  + auth token│             │
  └───────┬───────┘              └────────────┘
          │ clean
          v
  ┌───────────────┐   OPTIONS    ┌────────────┐
  │ CORS Handler   │ ──────────> │ 204 (preflight)│
  │               │              └────────────┘
  └───────┬───────┘
          │ not preflight
          v
  ┌───────────────┐   >1MB       ┌────────────┐
  │ Body Size      │ ──────────> │ 413 PAYLOAD  │
  │ Check          │              │ TOO LARGE   │
  └───────┬───────┘              └────────────┘
          │ ok
          v
  ┌───────────────┐   exceeded   ┌────────────┐
  │ Rate Limiter   │ ──────────> │ 429 RATE     │
  │ (per-user/IP)  │              │ LIMITED      │
  └───────┬───────┘              └────────────┘
          │ allowed
          v
  ┌───────────────┐
  │ Route Handler  │
  │               │
  └───────┬───────┘
          │
          v
  ┌───────────────┐
  │ Security       │
  │ Headers Inject │
  │ + CORS Headers │
  └───────────────┘
```

### Security Headers (Helmet-style)

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cache-Control: no-store, no-cache, must-revalidate
```

### Usage

```typescript
import { securePaymentHandler } from '@/backend/lib/payment'

export const POST = securePaymentHandler(async (req) => {
  // ... payment logic
  return NextResponse.json({ success: true })
}, {
  skipAuth: false,      // Check IP + UA
  skipRateLimit: false,  // Enforce rate limits
})
```

---

## Audit Trail

### Hash Chain Structure

```
Genesis Hash ──────────────────────────────────────────────────
      │
      v
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ Entry #1     │────>│ Entry #2     │────>│ Entry #3     │──> ...
  │ hash: abc..  │     │ hash: def..  │     │ hash: ghi..  │
  │ prev: GEN    │     │ prev: abc..  │     │ prev: def..  │
  │ sig:   xyz..  │     │ sig:   uvw.. │     │ sig:   rst.. │
  └─────────────┘     └─────────────┘     └─────────────┘
```

Each entry contains:
- **Hash**: SHA-256 of the entry content (deterministic JSON sort)
- **Previous Hash**: Links to the prior entry (or genesis for first)
- **Signature**: HMAC-SHA256 of the hash, signed with the audit key

Tamper detection: altering any entry breaks the chain, detectable by
`verifyChain()`.

### Audit Actions

| Action                 | Description                           |
|------------------------|---------------------------------------|
| `STATE_TRANSITION`     | Payment state machine transition      |
| `WEBHOOK_RECEIVED`     | Incoming webhook from provider        |
| `WEBHOOK_VERIFIED`     | Webhook signature verified            |
| `WEBHOOK_REJECTED`     | Webhook signature verification failed |
| `REFUND_INITIATED`     | Refund process started                |
| `DISPUTE_OPENED`       | Customer dispute/chargeback           |
| `ENCRYPTION_KEY_ROTATED`| Encryption key version changed       |
| `IDEMPOTENCY_DEDUP`    | Duplicate request detected & deduped   |
| `IP_BLOCKED`           | Request blocked by IP blocklist        |
| `RATE_LIMIT_EXCEEDED`  | Rate limit threshold hit               |

### Usage

```typescript
import { getAuditTrail } from '@/backend/lib/payment'

const audit = getAuditTrail()

// Record a state transition
await audit.recordStateTransition({
  paymentId: 'pay_abc123',
  fromState: 'PROCESSING',
  toState: 'COMPLETED',
  actor: 'system',
  provider: 'stripe',
})

// Verify chain integrity
const result = audit.verifyChain()
console.log(result.valid) // true
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Digital Lending OS Payment Flow                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client                                                           │
│    │                                                              │
│    │ POST /api/payments/initialize                               │
│    │ Idempotency-Key: <unique>                                   │
│    │                                                              │
│    v                                                              │
│  ┌─────────────────────────────────────┐                         │
│  │       securePaymentHandler()        │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ 1. IP Blocklist Check         │  │                         │
│  │  │ 2. User-Agent Validation      │  │                         │
│  │  │ 3. CORS Preflight             │  │                         │
│  │  │ 4. Body Size Limit (1MB)      │  │                         │
│  │  │ 5. Rate Limiter (100/min)     │  │                         │
│  │  │ 6. Inject Security Headers    │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │      withIdempotency()               │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ Acquire Idempotency-Key lock   │  │                         │
│  │  │ → Replay cached if exists    │  │                         │
│  │  │ → 409 if in-flight            │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │    validatePaymentInitiation()       │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ Zod schema validation         │  │                         │
│  │  │ Currency whitelist             │  │                         │
│  │  │ Amount bounds (1 - 100M)      │  │                         │
│  │  │ Injection sanitization         │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │    PaymentStateMachine               │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ CREATED → PENDING_PROVIDER    │  │                         │
│  │  │ Idempotent transition         │  │                         │
│  │  │ Guard validation              │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │    Provider (Stripe/Paystack/...)    │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ Encrypt sensitive fields      │  │                         │
│  │  │ Send to provider API          │  │                         │
│  │  │ Return checkout URL           │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │    AuditTrail.record()              │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ Hash chain append              │  │                         │
│  │  │ HMAC signature                  │  │                         │
│  │  │ Persist (optional callback)     │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └─────────────────────────────────────┘                         │
│                                                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ Webhook Path ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                  │
│  Provider POST /webhooks/:provider                                │
│    │                                                              │
│    v                                                              │
│  ┌─────────────────────────────────────┐                         │
│  │  verifyWebhookPayload()             │                         │
│  │  ┌───────────────────────────────┐  │                         │
│  │  │ HMAC verification (timing-safe) │ │                         │
│  │  │ Zod schema validation         │  │                         │
│  │  └───────────────────────────────┘  │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │  PaymentStateMachine.transition()   │                         │
│  │  PROCESSING → COMPLETED / FAILED    │                         │
│  └──────────────┬──────────────────────┘                         │
│                 │                                                  │
│                 v                                                  │
│  ┌─────────────────────────────────────┐                         │
│  │  AuditTrail.record()               │                         │
│  │  (state transition + webhook)      │                         │
│  └─────────────────────────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Environment Variables

```bash
# Encryption
PAYMENT_ENCRYPTION_KEY=your-master-passphrase-here
PAYMENT_ENCRYPTION_SALT=<base64-encoded-32-byte-salt>
PAYMENT_ENCRYPTION_KEY_ID=v1

# Provider Keys
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
FLW_SECRET_KEY=FLWSECK-...
INTASEND_SECRET_KEY=...
PAYA_API_KEY=...

# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_...
PAYA_WEBHOOK_SECRET=...

# Audit
AUDIT_SIGNING_KEY=your-audit-hmac-secret

# Security
BLOCKED_IPS=1.2.3.4,5.6.7.8
NEXT_PUBLIC_APP_URL=https://app.digitallendingos.co.ke
```

### File Reference

| File                     | Description                            |
|--------------------------|----------------------------------------|
| `state-machine.ts`       | Payment state machine with idempotent transitions |
| `idempotency.ts`         | IdempotencyGuard + Next.js middleware   |
| `encryption.ts`          | AES-256-GCM, PBKDF2, token generation  |
| `validation.ts`          | Zod schemas + webhook signature verify   |
| `security-middleware.ts` | CORS, headers, rate limiting HOF        |
| `audit-trail.ts`         | Tamper-proof hash chain audit log        |
| `types.ts`               | Payment provider types & interfaces      |
| `config.ts`              | Provider configuration from env vars    |
| `index.ts`               | Re-exports & provider registry           |
| `providers/*.ts`         | Individual provider implementations      |
