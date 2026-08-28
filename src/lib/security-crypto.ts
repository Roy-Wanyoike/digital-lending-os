/**
 * Digital Lending OS - Security Utilities (Crypto-Dependent Functions)
 * 
 * This module contains security functions that require Node.js crypto module.
 * These functions are NOT compatible with Edge Runtime and should only be
 * used in server-side contexts (API routes, server actions, etc.).
 * 
 * Uses lazy initialization to avoid static import analysis issues with Edge Runtime.
 * 
 * @module security-crypto
 */

// Lazy-loaded crypto module to avoid Edge Runtime compatibility issues
let cryptoModule: typeof import('crypto') | null = null;

/**
 * Get the crypto module, loading it lazily only when needed.
 * Returns null if crypto is not available (e.g., in Edge Runtime).
 */
function getCrypto(): typeof import('crypto') | null {
  if (!cryptoModule) {
    try {
      // Dynamic require to avoid static analysis detecting Edge-incompatible module
      cryptoModule = require('crypto');
    } catch {
      // crypto not available in this environment (e.g., Edge Runtime)
      cryptoModule = null;
    }
  }
  return cryptoModule;
}

// ============================================================
// CSRF Protection (requires Node.js crypto)
// ============================================================

/**
 * Generate a CSRF token for state-changing operations.
 * In production, this should be cryptographically secure and
 * stored server-side with session binding.
 * 
 * **NOTE:** This function requires Node.js crypto and is NOT
 * compatible with Edge Runtime. Use only in API routes or
 * server-side code.
 * 
 * @returns Random CSRF token (64-character hex string)
 * @throws Error if called in Edge Runtime environment
 */
export function generateCSRFToken(): string {
  const crypto = getCrypto();
  if (!crypto) {
    throw new Error(
      'generateCSRFToken() requires Node.js crypto module which is not available in Edge Runtime. ' +
      'This function should only be called in API routes or server-side code.'
    );
  }
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify a CSRF token against expected value.
 * 
 * **NOTE:** This function requires Node.js crypto and is NOT
 * compatible with Edge Runtime. Use only in API routes or
 * server-side code.
 * 
 * @param token - Token from request
 * @param expectedToken - Expected token (from session)
 * @returns True if tokens match (using timing-safe comparison)
 * @throws Error if called in Edge Runtime environment
 */
export function verifyCSRFToken(token: string, expectedToken: string): boolean {
  const crypto = getCrypto();
  if (!crypto) {
    throw new Error(
      'verifyCSRFToken() requires Node.js crypto module which is not available in Edge Runtime. ' +
      'This function should only be called in API routes or server-side code.'
    );
  }
  
  if (!token || !expectedToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}
