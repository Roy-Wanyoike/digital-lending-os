// ─── Encryption Utilities ──────────────────────────────────────────
//
// AES-256-GCM encryption for sensitive payment data (card tokens, bank details).
// Key derivation with PBKDF2. Field-level encryption/decryption helpers.
// Secure random token generation.
//
// NOTE: Uses Node.js crypto module. In Edge Runtime, use SubtleCrypto instead.
//

import { createHash, randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto'

// ── Configuration ──────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEY_LENGTH = 32 // 256 bits
const PBKDF2_HASH = 'sha512'

// ── Types ──────────────────────────────────────────────────────────

export interface EncryptedField {
  /** Base64-encoded: iv + ciphertext + authTag */
  encrypted: string
  /** Key identifier (for key rotation) */
  keyId: string
  /** Algorithm used */
  algorithm: string
}

export interface KeyDerivationResult {
  key: Buffer
  salt: string
  iterations: number
}

// ── Key Management ─────────────────────────────────────────────────

/**
 * Derive a 256-bit encryption key from a passphrase using PBKDF2.
 */
export function deriveKey(
  passphrase: string,
  salt?: string,
  iterations: number = PBKDF2_ITERATIONS,
): KeyDerivationResult {
  const saltBuffer = salt ? Buffer.from(salt, 'base64') : randomBytes(32)
  const key = pbkdf2Sync(
    passphrase,
    saltBuffer,
    iterations,
    PBKDF2_KEY_LENGTH,
    PBKDF2_HASH,
  )
  return {
    key,
    salt: saltBuffer.toString('base64'),
    iterations,
  }
}

/**
 * Get the encryption key from environment variable.
 * Derives the key via PBKDF2 using a static salt stored in env.
 */
export function getEncryptionKey(): { key: Buffer; keyId: string } {
  const passphrase = process.env.PAYMENT_ENCRYPTION_KEY
  if (!passphrase) {
    throw new Error('PAYMENT_ENCRYPTION_KEY environment variable is not set')
  }

  const keyId = process.env.PAYMENT_ENCRYPTION_KEY_ID ?? 'default'
  const salt = process.env.PAYMENT_ENCRYPTION_SALT
  const { key } = deriveKey(passphrase, salt)

  return { key, keyId }
}

// ── Field-Level Encryption ─────────────────────────────────────────

/**
 * Encrypt a single field value using AES-256-GCM.
 * Returns a structured EncryptedField that can be stored in the database.
 *
 * @param plaintext - The sensitive value to encrypt
 * @param encryptionKey - Optional pre-derived key (otherwise uses env)
 * @param keyId - Optional key identifier
 */
export function encryptField(
  plaintext: string,
  encryptionKey?: Buffer,
  keyId?: string,
): EncryptedField {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext')
  }

  let key: Buffer
  let kid: string

  if (encryptionKey) {
    key = encryptionKey
    kid = keyId ?? 'custom'
  } else {
    const result = getEncryptionKey()
    key = result.key
    kid = result.keyId
  }

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Pack: iv (12 bytes) + authTag (16 bytes) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted])

  return {
    encrypted: packed.toString('base64'),
    keyId: kid,
    algorithm: ALGORITHM,
  }
}

/**
 * Decrypt a field that was encrypted with encryptField().
 *
 * @param encryptedField - The EncryptedField structure
 * @param encryptionKey - Optional pre-derived key (otherwise uses env based on keyId)
 */
export function decryptField(
  encryptedField: EncryptedField | string,
  encryptionKey?: Buffer,
): string {
  let field: EncryptedField

  if (typeof encryptedField === 'string') {
    // Legacy: raw base64 string (assumes default key, no key rotation)
    field = { encrypted: encryptedField, keyId: 'default', algorithm: ALGORITHM }
  } else {
    field = encryptedField
  }

  if (!encryptionKey) {
    const result = getEncryptionKey()
    encryptionKey = result.key
  }

  const packed = Buffer.from(field.encrypted, 'base64')

  // Unpack: iv (12) + authTag (16) + ciphertext (rest)
  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

// ── Secure Token Generation ─────────────────────────────────────────

/**
 * Generate a cryptographically secure random token.
 * Uses hex encoding by default.
 *
 * @param bytes - Number of random bytes (default 32 = 64 hex chars)
 * @param encoding - 'hex' | 'base64' | 'base64url'
 */
export function generateSecureToken(
  bytes: number = 32,
  encoding: 'hex' | 'base64' | 'base64url' = 'hex',
): string {
  const buffer = randomBytes(bytes)
  switch (encoding) {
    case 'hex':
      return buffer.toString('hex')
    case 'base64':
      return buffer.toString('base64')
    case 'base64url':
      return buffer.toString('base64url')
    default:
      return buffer.toString('hex')
  }
}

/**
 * Generate a payment reference token suitable for external use.
 * Format: YS + timestamp(6 chars) + random(8 chars)
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  const random = randomBytes(4).toString('hex').toUpperCase()
  return `YS${timestamp}${random}`
}

// ── Bcrypt Wrapper ─────────────────────────────────────────────────

/**
 * Hash a value with bcrypt.
 * Wraps bcryptjs for Edge Runtime compatibility.
 */
export async function hashWithBcrypt(value: string, rounds: number = 10): Promise<string> {
  // Dynamic import for tree-shaking; bcryptjs works in Edge Runtime
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(value, rounds)
}

/**
 * Compare a value against a bcrypt hash.
 */
export async function compareWithBcrypt(value: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(value, hash)
}

// ── Utility: SHA-256 Hash ──────────────────────────────────────────

/**
 * Compute a SHA-256 hash of the input string.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Compute HMAC-SHA256 for webhook signature verification.
 */
export function hmacSha256(key: string | Buffer, data: string): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex')
}

// ── Masking Utilities ──────────────────────────────────────────────

/**
 * Mask a sensitive string, showing only the last N characters.
 * e.g., maskValue('4111111111111111', 4) => '************1111'
 */
export function maskValue(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return '*'.repeat(value?.length ?? 0)
  }
  const masked = '*'.repeat(value.length - visibleChars)
  return `${masked}${value.slice(-visibleChars)}`
}

/**
 * Mask an email address.
 * e.g., maskEmail('user@example.com') => 'u***@example.com'
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '****'
  const maskedLocal = local.length > 1
    ? `${local[0]}${'*'.repeat(local.length - 1)}`
    : '***'
  return `${maskedLocal}@${domain}`
}
