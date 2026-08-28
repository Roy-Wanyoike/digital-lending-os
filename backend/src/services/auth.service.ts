/**
 * Authentication Service
 * 
 * Handles JWT token generation, password hashing, session management,
 * and user authentication operations.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../../prisma/client';
import { JWTPayload, UserRole } from '../types';

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
  expiresIn: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Authenticate user with email/phone and password
   */
  async login(email: string | undefined, phone: string | undefined, password: string, ipAddress?: string): Promise<LoginResult> {
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
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const error: any = new Error('ACCOUNT_LOCKED');
      error.code = 'ACCOUNT_LOCKED';
      error.details = { lockedUntil: user.lockedUntil };
      throw error;
    }

    // Verify password
    if (!user.passwordHash) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts };
      
      if (failedAttempts >= config.auth.maxLoginAttempts) {
        const lockoutUntil = new Date(Date.now() + config.auth.lockoutDuration);
        updateData.lockedUntil = lockoutUntil;
        
        logger.warn('Account locked', { userId: user.id, email: user.email });
      }
      
      await db.user.update({
        where: { id: user.id },
        data: updateData,
      });

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
    const tokens = this.generateTokens(user.id, user.email, user.role as UserRole, user.tenantId, user.tokenVersion || 0);

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
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  /**
   * Generate access and refresh token pair
   */
  generateTokens(userId: string, email: string, role: UserRole, tenantId: string | null, tokenVersion: number): TokenPair {
    const payload: JWTPayload = {
      userId,
      email,
      role,
      tenantId,
    };

    const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });

    const refreshToken = jwt.sign(
      { userId, tokenVersion, type: 'refresh' },
      config.auth.refreshSecret,
      { expiresIn: config.auth.refreshExpiresIn }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: string }> {
    const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as {
      userId: string;
      tokenVersion: number;
      type: string;
    };

    if (payload.type !== 'refresh') {
      const error: any = new Error('Invalid token type');
      error.code = 'INVALID_TOKEN_TYPE';
      throw error;
    }

    // Get user and check token version
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
      const error: any = new Error('User not found or inactive');
      error.code = 'USER_INACTIVE';
      throw error;
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      const error: any = new Error('Token has been revoked');
      error.code = 'TOKEN_REVOKED';
      throw error;
    }

    // Generate new access token
    const newPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
    };

    const newAccessToken = jwt.sign(newPayload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });

    return {
      accessToken: newAccessToken,
      expiresIn: config.auth.jwtExpiresIn,
    };
  }

  /**
   * Invalidate user sessions by incrementing token version
   */
  async invalidateSessions(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
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
    const { passwordHash, ...safeUser } = user;
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

    if (newPassword.length < config.auth.passwordMinLength) {
      const error: any = new Error(`Password must be at least ${config.auth.passwordMinLength} characters`);
      error.code = 'PASSWORD_TOO_SHORT';
      throw error;
    }

    // Hash and save new password
    const hashedNewPassword = await bcrypt.hash(newPassword, config.auth.bcryptRounds);

    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedNewPassword,
        tokenVersion: { increment: 1 },
      },
    });

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Initiate password reset flow
   */
  async initiatePasswordReset(email: string | undefined, phone: string | undefined): Promise<void> {
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
      // Generate reset token
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in metadata
      await db.user.update({
        where: { id: user.id },
        data: {
          metadata: JSON.stringify({ resetToken, resetExpires }),
        },
      });

      logger.info('Password reset initiated', { userId: user.id, email: user.email });
      
      // In production: Send email/SMS with reset link
    }
    // Always return success to prevent enumeration
  }

  /**
   * Hash password with bcrypt
   * 
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password string
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.auth.bcryptRounds);
  }

  /**
   * Verify password against hash
   * 
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns Promise resolving to boolean indicating match
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token for a user
   * 
   * @param user - User object containing id, email, role, tenantId
   * @returns JWT access token string
   */
  generateAccessToken(user: { userId: string; email: string; role: UserRole; tenantId: string | null }): string {
    const payload: JWTPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });
  }

  /**
   * Generate refresh token for a user
   * 
   * @param user - User object containing userId and tokenVersion
   * @returns JWT refresh token string
   */
  generateRefreshToken(user: { userId: string; tokenVersion: number }): string {
    return jwt.sign(
      { userId: user.userId, tokenVersion: user.tokenVersion || 0, type: 'refresh' },
      config.auth.refreshSecret,
      { expiresIn: config.auth.refreshExpiresIn }
    );
  }

  /**
   * Verify and decode a JWT token
   * 
   * @param token - JWT token string to verify
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        const err: any = new Error('Token has expired');
        err.code = 'TOKEN_EXPIRED';
        throw err;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        const err: any = new Error('Invalid token');
        err.code = 'INVALID_TOKEN';
        throw error;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
