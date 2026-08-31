/**
 * Authentication Service
 * 
 * Complete JWT-based authentication system with:
 * - Token Management (Access & Refresh tokens)
 * - Password Management (bcrypt hashing)
 * - Session Management (database-backed sessions)
 * - Password Reset Flow
 * - Account Lockout Protection
 * - Audit Logging
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../lib/db';
import { JWTPayload, UserRole } from '../types';

// ============================================
// INTERFACES
// ============================================

export interface UserPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    tenantId: string | null;
    tenant?: {
      id: string;
      name: string;
      slug: string;
      plan: string;
    } | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface SessionData {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
  role?: UserRole;
  phone?: string;
}

// ============================================
// AUTH SERVICE CLASS
// ============================================

export class AuthService {
  
  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Generate access token (15 minute expiry)
   */
  generateAccessToken(user: UserPayload): string {
    const payload: JWTPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: '15m', // 15 minutes for access token
      issuer: 'digital-lending-os',
      audience: 'digital-lending-os-api',
      jwtid: uuidv4(),
    });
  }

  /**
   * Generate refresh token (7 day expiry)
   */
  generateRefreshToken(user: { userId: string; tokenVersion: number }): string {
    return jwt.sign(
      { 
        userId: user.userId, 
        tokenVersion: user.tokenVersion || 0, 
        type: 'refresh' 
      },
      config.auth.refreshSecret,
      { 
        expiresIn: '7d', // 7 days for refresh token
        issuer: 'digital-lending-os',
        audience: 'digital-lending-os-refresh',
        jwtid: uuidv4(),
      }
    );
  }

  /**
   * Verify and decode a JWT access token
   * Returns null if token is invalid or expired
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
      
      // Verify issuer and audience
      if (decoded.iss !== 'digital-lending-os' || decoded.aud !== 'digital-lending-os-api') {
        return null;
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('Token expired', { error: error.message });
        return null;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('Invalid token', { error: error.message });
        return null;
      }
      logger.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * Returns new token pair or null if refresh is invalid
   */
  async refreshToken(refreshToken: string, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: string } | null> {
    try {
      // Verify the refresh token
      const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as {
        userId: string;
        tokenVersion: number;
        type: string;
        jti: string;
      };

      // Validate token type
      if (payload.type !== 'refresh') {
        logger.warn('Invalid token type used for refresh', { jti: payload.jti });
        return null;
      }

      // Get user from database
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          tokenVersion: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        logger.warn('User not found or inactive during refresh', { userId: payload.userId });
        return null;
      }

      // Check token version for revocation
      if (user.tokenVersion !== payload.tokenVersion) {
        logger.warn('Token has been revoked', { userId: payload.userId });
        return null;
      }

      // Check if session exists and is active
      const tokenHash = this.hashToken(refreshToken);
      const session = await db.session.findFirst({
        where: {
          userId: user.id,
          tokenHash,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        logger.warn('No valid session found for refresh token', { userId: payload.userId });
        return null;
      }

      // Update session activity
      await db.session.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });

      // Generate new tokens
      const newAccessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        tenantId: user.tenantId,
      });

      const newRefreshToken = this.generateRefreshToken({
        userId: user.id,
        tokenVersion: user.tokenVersion,
      });

      // Create new session and invalidate old one
      await db.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      await this.createSession(user.id, newRefreshToken, ipAddress);

      logger.info('Token refreshed successfully', { userId: user.id, ip: ipAddress });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: config.auth.jwtExpiresIn,
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokens(userId: string, email: string, role: UserRole, tenantId: string | null, tokenVersion: number): TokenPair {
    const accessToken = this.generateAccessToken({ userId, email, role, tenantId });
    const refreshToken = this.generateRefreshToken({ userId, tokenVersion });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  /**
   * Hash password using bcrypt with configured salt rounds (12)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.auth.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < config.auth.passwordMinLength) {
      errors.push(`Password must be at least ${config.auth.passwordMinLength} characters`);
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new session for a user
   */
  async createSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string): Promise<SessionData> {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await db.session.create({
      data: {
        userId,
        tokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        isActive: true,
        expiresAt,
      },
    });

    logger.info('Session created', { sessionId: session.id, userId, ip: ipAddress });

    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await db.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    logger.info('Session invalidated', { sessionId });
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    await db.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    logger.info('All user sessions invalidated', { userId });
  }

  /**
   * Validate a session by its ID
   */
  async validateSession(sessionId: string): Promise<SessionData | null> {
    const session = await db.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    // Check if session is active and not expired
    if (!session.isActive || session.expiresAt < new Date()) {
      // Auto-invalidate if expired
      if (session.isActive) {
        await this.invalidateSession(session.id);
      }
      return null;
    }

    // Update last activity
    await db.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Validate session by refresh token
   */
  async validateSessionByToken(refreshToken: string): Promise<SessionData | null> {
    const tokenHash = this.hashToken(refreshToken);
    
    const session = await db.session.findFirst({
      where: {
        tokenHash,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return null;
    }

    // Update last activity
    await db.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await db.session.deleteMany({
      where: {
        OR: [
          { isActive: false },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });

    logger.info(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }

  // ============================================
  // AUTHENTICATION OPERATIONS
  // ============================================

  /**
   * Authenticate user with email/phone and password
   */
  async login(email: string | undefined, phone: string | undefined, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // Find user by email or phone
    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      // Generic error to prevent enumeration
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const error: any = new Error('ACCOUNT_LOCKED');
      error.code = 'ACCOUNT_LOCKED';
      error.details = { 
        lockedUntil: user.lockedUntil,
        message: 'Account temporarily locked due to too many failed attempts. Please try again later.',
      };
      throw error;
    }

    // Verify password
    if (!user.passwordHash) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      await this.handleFailedLogin(user.id);
      
      const error: any = new Error('INVALID_CREDENTIALS');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Reset failed attempts on successful login
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(
      user.id, 
      user.email, 
      user.role as UserRole, 
      user.tenantId, 
      user.tokenVersion || 0
    );

    // Create session
    await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);

    // Log audit event
    await this.logAuthEvent(user.id, user.tenantId, 'LOGIN_SUCCESS', ipAddress);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        tenantId: user.tenantId,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
        } : null,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  /**
   * Handle failed login attempt (increment counter, lock if needed)
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, failedLoginAttempts: true },
    });

    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const updateData: Record<string, unknown> = { failedLoginAttempts: failedAttempts };
    
    if (failedAttempts >= config.auth.maxLoginAttempts) {
      const lockoutUntil = new Date(Date.now() + config.auth.lockoutDuration);
      updateData.lockedUntil = lockoutUntil;
      
      logger.warn('Account locked due to too many failed attempts', { 
        userId, 
        failedAttempts,
        lockedUntil: lockoutUntil 
      });
    }
    
    await db.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput, ipAddress?: string): Promise<LoginResult> {
    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: input.email },
          ...(input.phone ? [{ phone: input.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      const error: any = new Error('User already exists with this email or phone');
      error.code = 'USER_EXISTS';
      throw error;
    }

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      const error: any = new Error(passwordValidation.errors.join(', '));
      error.code = 'WEAK_PASSWORD';
      throw error;
    }

    // Hash password
    const passwordHash = await this.hashPassword(input.password);

    // Create user
    const user = await db.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone || null,
        tenantId: input.tenantId || null,
        role: input.role || 'STAFF',
        emailVerified: false,
      },
      include: {
        tenant: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(
      user.id, 
      user.email, 
      user.role, 
      user.tenantId, 
      user.tokenVersion || 0
    );

    // Create session
    await this.createSession(user.id, tokens.refreshToken, ipAddress);

    // Log audit event
    await this.logAuthEvent(user.id, user.tenantId, 'REGISTER', ipAddress);

    logger.info('New user registered', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: ipAddress,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        tenantId: user.tenantId,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
        } : null,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Invalidate specific session
      const tokenHash = this.hashToken(refreshToken);
      await db.session.updateMany({
        where: { userId, tokenHash, isActive: true },
        data: { isActive: false },
      });
    } else {
      // Invalidate all sessions for user
      await this.invalidateAllUserSessions(userId);
    }

    // Log audit event
    await this.logAuthEvent(userId, null, 'LOGOUT');

    logger.info('User logged out', { userId });
  }

  /**
   * Invalidate all user sessions (for password change, etc.)
   */
  async invalidateSessions(userId: string): Promise<void> {
    // Increment token version to invalidate all existing tokens
    await db.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    // Deactivate all sessions
    await this.invalidateAllUserSessions(userId);

    logger.info('All sessions invalidated for user', { userId });
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      const error: any = new Error('User not found or inactive');
      error.code = 'USER_INACTIVE';
      throw error;
    }

    // Remove sensitive fields
    const { passwordHash, metadata, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      const error: any = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Verify current password
    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      const error: any = new Error('Current password is incorrect');
      error.code = 'WRONG_PASSWORD';
      throw error;
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      const error: any = new Error(passwordValidation.errors.join(', '));
      error.code = 'WEAK_PASSWORD';
      throw error;
    }

    // Hash and save new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedNewPassword,
        tokenVersion: { increment: 1 }, // Invalidate all existing sessions
        passwordChangedAt: new Date(),
      },
    });

    // Invalidate all sessions (force re-login)
    await this.invalidateAllUserSessions(userId);

    logger.info('Password changed successfully', { userId });
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  /**
   * Initiate password reset flow
   * Always returns success to prevent user enumeration
   */
  async initiatePasswordReset(email: string | undefined, phone: string | undefined): Promise<{ success: boolean }> {
    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in metadata
      const metadata = JSON.stringify({ 
        resetToken, 
        resetExpires: resetExpires.toISOString(),
      });

      await db.user.update({
        where: { id: user.id },
        data: { metadata },
      });

      logger.info('Password reset initiated', { userId: user.id, email: user.email });
      
      // In production: Send email/SMS with reset link
      // For now, we'll log the token (remove in production!)
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Reset token for ${user.email}: ${resetToken}`);
      }
    }

    // Always return success to prevent enumeration
    return { success: true };
  }

  /**
   * Complete password reset with valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    // Find user with matching reset token
    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, metadata: true },
    });

    let targetUser: typeof users[0] | null = null;
    
    for (const user of users) {
      try {
        const meta = JSON.parse(user.metadata || '{}');
        if (meta.resetToken === token && meta.resetExpires) {
          const expiryDate = new Date(meta.resetExpires);
          if (expiryDate > new Date()) {
            targetUser = user;
            break;
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    if (!targetUser) {
      const error: any = new Error('Invalid or expired reset token');
      error.code = 'INVALID_RESET_TOKEN';
      throw error;
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      const error: any = new Error(passwordValidation.errors.join(', '));
      error.code = 'WEAK_PASSWORD';
      throw error;
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token
    const metadata = JSON.stringify({});
    
    await db.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }, // Invalidate all sessions
        passwordChangedAt: new Date(),
        metadata,
      },
    });

    // Invalidate all sessions
    await this.invalidateAllUserSessions(targetUser.id);

    logger.info('Password reset completed', { userId: targetUser.id });

    return { success: true };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Hash a token for safe storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Log authentication event for audit trail
   */
  private async logAuthEvent(
    userId: string, 
    tenantId: string | null, 
    action: string, 
    ipAddress?: string
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId,
          tenantId,
          action,
          entityType: 'AUTH',
          ipAddress: ipAddress || null,
        },
      });
    } catch (error) {
      logger.error('Failed to log auth event:', error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
