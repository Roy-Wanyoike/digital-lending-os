# ADR-005: Wallet & Transactions Threat Model

**Status:** Active
**Date:** 2025-01-29
**Domain Owner:** D5 — Wallet & Transactions

## Threat Inventory

### T1: Negative Balance (Overdraft)

**Description:** An attacker submits concurrent withdrawal or conversion requests that individually pass balance checks but collectively exceed the wallet balance.

**Severity:** Critical — Direct financial loss

**Current Mitigations:**
- All balance mutations within Prisma `$transaction` (PostgreSQL serializable isolation)
- Currency conversion re-reads fresh wallet balances inside the transaction
- Fee-inclusive balance checks: `availableBalance >= amount + fee`

**Residual Risk:** Low. PostgreSQL's row-level locking within a transaction prevents concurrent writes to the same wallet row. However, the pre-transaction balance check in withdrawal/crypto-withdrawal routes is a soft guard — the real enforcement is the transaction.

**Recommended Hardening:**
- Add a CHECK constraint on the Wallet model: `availableBalance >= 0`
- Consider `SELECT ... FOR UPDATE` in the transaction for explicit pessimistic locking
- Add an application-level idempotency key to prevent duplicate submissions

---

### T2: Race Condition on Concurrent Withdrawals

**Description:** Two withdrawal requests for the same wallet arrive simultaneously. Both read `availableBalance = 100`, both check `100 >= 50`, both proceed.

**Severity:** High

**Current Mitigations:**
- Prisma `$transaction` with serializable isolation ensures only one transaction commits
- The second transaction will fail with a serialization error, caught by the try-catch

**Residual Risk:** Low for same-currency same-wallet scenarios. Higher risk exists for:
- Currency conversion where stale pre-transaction reads were previously used (now fixed)
- Withdrawal where the balance check was outside the transaction (now fixed with fee-inclusive check)

**Recommended Hardening:**
- Add a `version` column to Wallet for optimistic locking
- Return a specific error code (409 Conflict) for serialization failures so the client can retry

---

### T3: Conversion Rate Manipulation

**Description:** An attacker manipulates the exchange rate to get favorable conversion terms.

**Severity:** Medium

**Current Mitigations:**
- Exchange rates are server-side constants (not client-supplied)
- Rate is looked up by server code, not passed in the request body
- The conversion record stores the rate used, providing an audit trail

**Residual Risk:** Low for demo. In production:
- Rates will come from CurrencyRate table or external API
- Must ensure rate source is authenticated and tamper-proof
- Consider rate expiry: reject conversions using rates older than N minutes

**Recommended Hardening:**
- Store rate timestamps and reject stale rates
- Add rate deviation alerts (e.g., if rate changes > 5% in 1 hour)
- Admin approval for large conversions (> $10,000)

---

### T4: Cross-Tenant Wallet Access

**Description:** An attacker attempts to access or manipulate wallets belonging to another tenant.

**Severity:** Critical

**Current Mitigations:**
- Every wallet operation verifies ownership: wallet → business → tenant
- Auth required on all endpoints via `getApiUser()` with null check
- Tenant isolation enforced at query level

**Residual Risk:** Low. The ownership chain (wallet → business → tenant) is checked on every operation.

---

### T5: Invalid Crypto Address

**Description:** User submits a crypto withdrawal to an invalid address, resulting in lost funds on the blockchain.

**Severity:** High (irreversible on-chain)

**Current Mitigations:**
- Format validation per network:
  - Bitcoin: starts with 1/3/bc1
  - ERC-20: 0x-prefixed, 42 chars
  - TRC-20: starts with T
  - Solana: 32-44 chars
  - BSC: 0x-prefixed, 42 chars
  - BEP-2: starts with "bnb", 42 chars

**Residual Risk:** Medium. Format validation catches typos but not all invalid addresses. A syntactically valid address can still be wrong (wrong recipient).

**Recommended Hardening:**
- In production: validate address checksums (e.g., ERC-20 EIP-55 checksum validation)
- Add a confirmation step with address preview
- For large amounts (> $500): require email/SMS verification before submitting
- Display warning about irreversibility (already implemented in UI)

---

### T6: Fee Bypass

**Description:** Attacker crafts a request that bypasses fee calculation, resulting in zero-fee transactions.

**Severity:** Medium

**Current Mitigations:**
- Fees are calculated server-side, not client-supplied
- Fee amounts are stored in the transaction record
- Balance checks include fees

**Residual Risk:** Low. Fee calculation is deterministic and server-controlled.

---

## Summary Matrix

| Threat | Severity | Likelihood | Mitigation Status |
|--------|----------|------------|-------------------|
| T1: Negative Balance | Critical | Low | Mitigated (transactions, fee-inclusive checks) |
| T2: Race Condition | High | Medium | Mitigated (Prisma transactions, fresh reads) |
| T3: Rate Manipulation | Medium | Low | Mitigated (server-side rates) |
| T4: Cross-Tenant Access | Critical | Low | Mitigated (ownership chain verification) |
| T5: Invalid Crypto Address | High | Medium | Partially mitigated (format validation only) |
| T6: Fee Bypass | Medium | Low | Mitigated (server-side calculation) |