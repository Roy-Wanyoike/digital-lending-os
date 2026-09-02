# ADR-005: Wallet & Transactions Review Checklist

**Domain Owner:** D5 — Wallet & Transactions  
**Date:** 2025-01-29

## Route-Level Checks

### `/api/wallets` (GET + POST)
- [x] Auth check (null check on `getApiUser`)
- [x] Tenant isolation (GET: filter by tenant's business IDs)
- [x] Input validation (POST: currency format regex `^[A-Z]{3}$`)
- [x] Business ownership validation (POST: verify business belongs to tenant)
- [x] Duplicate wallet prevention (POST: check existing wallet for same business+currency)
- [x] try-catch with proper error responses
- [x] Audit logging on wallet creation
- [x] `businessId` query param filtering (GET)

### `/api/wallets/[id]` (GET + PUT)
- [x] Auth check with null guard
- [x] Wallet → Business → Tenant ownership chain
- [x] `businessId` null guard
- [x] PUT schema validation (status enum only, no balance manipulation)
- [x] try-catch with AuthError handling

### `/api/wallets/deposit` (POST + GET)
- [x] Auth check
- [x] Zod schema validation (amount > 0, paymentMethod enum)
- [x] Wallet ownership verification
- [x] Wallet status check (must be active)
- [x] `businessId` null guard
- [x] Atomic balance update in Prisma transaction
- [x] Referral bonus logic inside same transaction
- [x] Real-time event emission on completion
- [x] GET: tenant isolation with businessId null guard

### `/api/wallets/withdrawal` (POST + GET)
- [x] Auth check with null guard
- [x] Zod schema validation
- [x] Fee-inclusive balance check (`amount + fee <= availableBalance`)
- [x] Wallet ownership + active status checks
- [x] `businessId` null guard
- [x] Atomic balance update in Prisma transaction
- [x] Separate fee transaction record
- [x] Non-demo mode: move availableBalance → pendingBalance
- [x] Temporal workflow integration

### `/api/wallets/convert` (POST + GET)
- [x] Auth check with null guard
- [x] Source ≠ destination validation
- [x] Both wallets exist, active, same tenant
- [x] `businessId` null guard on both wallets
- [x] Fresh balance reads INSIDE transaction (race condition fix)
- [x] Exchange rate validated server-side
- [x] Both wallets updated atomically
- [x] Conversion record with full audit trail

### `/api/wallets/crypto-withdrawal` (POST + GET)
- [x] Auth check with null guard
- [x] Zod schema validation (crypto enum, network enum)
- [x] Network ↔ crypto compatibility validation
- [x] Address format validation per network (BTC, ERC-20, TRC-20, Solana, BSC, BEP-2)
- [x] Fee-inclusive balance check (`amount + processingFee <= availableBalance`)
- [x] Wallet ownership + active status
- [x] `businessId` null guard
- [x] Atomic balance update in transaction

### `/api/wallets/[id]/transactions` (GET + POST)
- [x] Auth check with null guard
- [x] Wallet ownership verification
- [x] `businessId` null guard
- [x] Pagination (offset + limit + total count + hasMore)
- [x] Type/status filtering
- [x] POST: balance check inside transaction
- [x] POST: insufficient balance prevention (no negative balance)

## UI Checks (WalletTab.tsx)

### API Integration
- [x] All API calls match backend routes
- [x] `businessId` query param sent on wallet fetch
- [x] Error responses displayed via toast
- [x] Loading states (LoadingSkeleton, txLoading, submitting states)

### Dialogs
- [x] Create wallet: currency selection, businessId from selector
- [x] Deposit: amount, payment method, notes, demo provider
- [x] Withdraw: amount, method, bank details, fee estimate display
- [x] Convert: from/to wallet selection (excludes same wallet), amount, rate preview
- [x] Crypto: crypto/network selection, address, amount, preview with fees
- [x] History: tabbed view (transactions, deposits, withdrawals, crypto)

### UX
- [x] Business selector filters wallets
- [x] Wallet cards show balance, available, pending, frozen
- [x] Portfolio KPI in USD
- [x] Crypto network auto-selects on crypto change
- [x] Convert target auto-clears if same as source
- [x] Warning about irreversible crypto transactions

## Security Checks
- [x] No wallet endpoint accepts balance as input (prevents direct manipulation)
- [x] All mutation endpoints use Prisma transactions
- [x] Currency conversion uses fresh reads inside transaction
- [x] Fee calculations are server-side only
- [x] Exchange rates are server-side constants (not client-supplied)

## Known Limitations / Future Work

<!-- TRACKING: All items below are genuine future work, not yet implemented -->
- [ ] Add `CHECK (availableBalance >= 0)` constraint on Wallet table
- [ ] Implement optimistic locking with version column
- [ ] Replace demo exchange rates with CurrencyRate table or external API
- [ ] Add ERC-20 EIP-55 checksum validation
- [ ] Add idempotency keys for withdrawal/conversion endpoints
- [ ] Return 409 for serialization conflicts (client retry)
- [ ] Rate deviation alerts for production
- [ ] Add `isDefault` field support in wallet creation