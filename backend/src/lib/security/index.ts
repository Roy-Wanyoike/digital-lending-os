/**
 * Security Utilities
 * 
 * Provides:
 * - Encryption/decryption service
 * - Secure password hashing
 * - PII detection and masking
 * - Token blacklisting
 */

import crypto from 'crypto';
import { createHash, randomBytes } from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Encryption key should be set from environment
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
  return createHash('sha256').update(key).digest();
};

// =============================================================================
// ENCRYPTION SERVICE
// =============================================================================

export class EncryptionService {
  /**
   * Encrypt a string value
   */
  static encrypt(plaintext: string): string {
    try {
      const key = getEncryptionKey();
      const iv = randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + Tag + Encrypted data
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt an encrypted string
   */
  static decrypt(ciphertext: string): string {
    try {
      const key = getEncryptionKey();
      const parts = ciphertext.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt an object (JSON)
   */
  static encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt to object
   */
  static decryptObject<T>(ciphertext: string): T {
    return JSON.parse(this.decrypt(ciphertext)) as T;
  }

  /**
   * Generate a secure random token
   */
  static generateToken(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  /**
   * Hash a value (one-way)
   */
  static hash(value: string, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(value).digest('hex');
  }
}

// =============================================================================
// PASSWORD HASHING
// =============================================================================

export class PasswordService {
  // Default bcrypt rounds for production
  private static readonly ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

  /**
   * Hash a password securely using bcrypt
   */
  static async hash(password: string): Promise<string> {
    // Dynamic import for bcrypt (native module)
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, this.ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if password meets strength requirements
   */
  static validateStrength(password: string): {
    valid: boolean;
    errors: string[];
    score: number; // 0-100
  } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else {
      score += 20;
      if (password.length >= 12) score += 10;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 15;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 15;
    }

    // Number check
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 15;
    }

    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 15;
    }

    // Common password check
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
      score -= 20;
    }

    return {
      valid: errors.length === 0,
      errors,
      score: Math.max(0, Math.min(100, score)),
    };
  }
}

// =============================================================================
// PII MASKING
// =============================================================================

interface PIIPattern {
  name: string;
  pattern: RegExp;
  maskFn: (match: string) => string;
}

const PII_PATTERNS: PIIPattern[] = [
  {
    name: 'Email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    maskFn: (email) => {
      const [localPart, domain] = email.split('@');
      const maskedLocal = localPart.length > 2 
        ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
        : '*'.repeat(localPart.length);
      return `${maskedLocal}@${domain}`;
    },
  },
  {
    name: 'Phone (Kenyan)',
    pattern: /(?:\+?254|0)?(7\d{8})/g,
    maskFn: (phone) => phone.replace(/(\d{2})\d{4}(\d{3})/, '$1****$2'),
  },
  {
    name: 'National ID',
    pattern: /\b(\d{5})\d{3}(\d{1})\b/g,
    maskFn: (id) => id.replace(/(\d{5})\d{3}(\d{1})/, '$1***$2'),
  },
  {
    name: 'KRA PIN',
    pattern: /\b([A-Z]\d)[A-Z0-9]{6}[A-Z]\b/g,
    maskFn: (pin) => pin.replace(/([A-Z]\d)[A-Z0-9]{3}([A-Z0-9]{2}[A-Z])/, '$1*****$2'),
  },
  {
    name: 'Bank Account',
    pattern: /\b(\d{4})\d{6,12}\b/g,
    maskFn: (account) => account.replace(/(\d{4})\d+(?=\d{4})?/, '$1******'),
  },
  {
    name: 'M-Pesa Transaction ID',
    pattern: /\b([A-Z]{2})(\d{10})\b/g,
    maskFn: (ref) => ref.replace(/([A-Z]{2})\d{6}(\d{4})/, '$1******$2'),
  },
];

export class PIIMaskerService {
  /**
   * Mask all PII in a string
   */
  static mask(text: string): string {
    let result = text;
    
    for (const pii of PII_PATTERNS) {
      result = result.replace(pii.pattern, pii.maskFn);
    }
    
    return result;
  }

  /**
   * Mask PII in an object recursively
   */
  static maskObject<T>(obj: T, sensitiveFields?: string[]): T {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item, sensitiveFields)) as unknown as T;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const isSensitive = sensitiveFields?.includes(key) || this.isSensitiveField(key);

      if (isSensitive && typeof value === 'string') {
        result[key] = this.mask(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.maskObject(value, sensitiveFields);
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }

  /**
   * Check if a field name suggests it contains sensitive data
   */
  private static isSensitiveField(fieldName: string): boolean {
    const sensitivePatterns = [
      /phone/i, /mobile/i, /tel/i,
      /email/i, /mail/i,
      /ssn/i, /social/i, /national.*id/i, /id.?number/i,
      /kra/i, /tax/i, /pin/i,
      /account/i, /bank/i,
      /password/i, /secret/i, /token/i,
      /address/i, /location/i,
      /name$/i, /firstname/i, /lastname/i,
      /dob/i, /birth/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * Detect potential PII in text
   */
  static detectPII(text: string): Array<{ type: string; match: string; position: number }> {
    const findings: Array<{ type: string; match: string; position: number }> = [];

    for (const pii of PII_PATTERNS) {
      let match;
      const regex = new RegExp(pii.pattern.source, pii.pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        findings.push({
          type: pii.name,
          match: match[0],
          position: match.index,
        });
      }
    }

    return findings;
  }
}

// =============================================================================
// TOKEN BLACKLIST (for JWT invalidation)
// =============================================================================

export class TokenBlacklist {
  private blacklist: Set<string> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttlMs: number = 3600000) { // Default 1 hour
    // Cleanup expired tokens periodically
    this.cleanupInterval = setInterval(() => {
      // In-memory implementation doesn't track expiry per token
      // For production with Redis, you'd use TTL
      if (this.blacklist.size > 10000) {
        this.blacklist.clear(); // Simple cleanup
      }
    }, ttlMs / 2);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Add a token to the blacklist
   */
  add(token: string, expiresAt?: Date): void {
    this.blacklist.add(token);
  }

  /**
   * Check if a token is blacklisted
   */
  isBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  /**
   * Remove a token from blacklist
   */
  remove(token: string): void {
    this.blacklist.delete(token);
  }

  /**
   * Get blacklist size
   */
  size(): number {
    return this.blacklist.size;
  }

  /**
   * Clear all blacklisted tokens
   */
  clear(): void {
    this.blacklist.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { EncryptionService, PasswordService, PIIMaskerService, TokenBlacklist };

// Create singleton instance of token blacklist
export const tokenBlacklist = new TokenBlacklist();

export default {
  encryption: EncryptionService,
  password: PasswordService,
  pii: PIIMaskerService,
  tokenBlacklist,
};
