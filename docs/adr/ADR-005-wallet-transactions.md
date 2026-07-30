# ADR-005: Wallet & Transactions Architecture

**Status:** Accepted
**Date:** 2025-01-29
**Domain Owner:** D5 — Wallet & Transactions

## Context

Youngsend provides multi-currency wallet infrastructure supporting 18 fiat currencies (USD, EUR, GBP, NGN, KES, etc.) and 6 cryptocurrencies (USDT, USDC, BTC, ETH, SOL, BNB). Wallets are scoped to businesses, which are scoped to tenants. The system must support deposits, withdrawals, currency conversion, and crypto withdrawals with strong consistency guarantees.

## Decision

### Wallet Model

Each wallet belongs to a `Business` (via `businessId`) and holds a single currency. Three balance columns track different states:

| Column | Purpose |
|--------|---------|
| `balance` | Total ledger balance (source of truth) |
| `availableBalance` | Funds available for withdrawal/conversion |
| `pendingBalance` | Funds locked in pending (non-demo) withdrawals |
| `frozenBalance` | Funds frozen by compliance/admin |

**Invariant:** `balance = availableBalance + pendingBalance + frozenBalance`

### Balance Management

All balance mutations use Prisma `$transaction` for atomicity:

1. **Deposit (demo):** Create `Deposit` → Create `WalletTransaction` (type=deposit) → Update wallet `balance` and `availableBalance`
2. **Withdrawal (demo):** Create `Withdrawal` → Create `WalletTransaction` (type=withdrawal) + fee transaction → Update wallet `balance` and `availableBalance`
3. **Withdrawal (non-demo):** Create `Withdrawal` → Move funds from `availableBalance` to `pendingBalance`
4. **Currency Conversion:** Create `CurrencyConversion` → Debit source wallet → Credit destination wallet (both in single transaction)
5. **Crypto Withdrawal:** Create `CryptoWithdrawal` → Create withdrawal tx + fee tx → Update wallet balances

### Conversion Flow

```
User selects source wallet → amount → destination wallet

1. Validate both wallets exist, active, same tenant
2. Look up exchange rate (demo rates or CurrencyRate table)
3. Calculate: gross = fromAmount × rate, fee = gross × 0.5%, net = gross - fee
4. In Prisma transaction:
   a. Re-read both wallets for fresh balances
   b. Check sufficient balance in source
   c. Create CurrencyConversion record
   d. Create debit WalletTransaction on source
   e. Update source wallet balance/availableBalance
   f. Create credit WalletTransaction on destination
   g. Update destination wallet balance/availableBalance
```

### Atomicity Guarantees

- All balance mutations wrapped in `db.$transaction()` (serializable by default in PostgreSQL)
- Currency conversion re-reads wallet balances inside the transaction to prevent TOCTOU race conditions
- Fee-inclusive balance checks prevent over-drafting (amount + fee ≤ availableBalance)
- `availableBalance` is the gate for all debits — `balance` is the ledger total

### Fee Structure

| Operation | Fee Model |
|-----------|-----------|
| Deposit | None (provider fees apply) |
| Fiat Withdrawal | max(2.50 flat, 0.5% of amount) |
| Currency Conversion | 0.5% of gross converted amount |
| Crypto Withdrawal | 1% min $1.00 processing + network fee (varies by chain) |

## Consequences

- Multi-currency wallets per business enable cross-border operations
- Triple-balance model (available/pending/frozen) provides fine-grained fund control
- Demo mode auto-completes all operations for testing; production mode uses Temporal workflows
- Exchange rates are hardcoded for demo; production will use CurrencyRate table or external API
- Referral bonus ($100 USD) is credited atomically within the deposit transaction
