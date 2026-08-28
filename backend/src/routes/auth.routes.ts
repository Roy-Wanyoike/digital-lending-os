/**
 * Authentication Routes
 * 
 * Endpoints for user authentication, token management, and session handling.
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { config } from '../config';
import {
  successResponse,
  createdResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
  conflictResponse,
} from '../utils/response';
import { logger } from '../utils/logger';
import { AuthRequest, JWTPayload } from '../types';

export const authRoutes = Router();

/**
 * POST /api/v1/auth/login
 * User login with email/phone and password
 */
authRoutes.post('/login', async (req: AuthRequest, res) => {
  try {
    const { email, phone, password, tenantSlug } = req.body;

    // Validate required fields
    if (!password) {
      return badRequestResponse(res, 'Password is required');
    }

    if (!email && !phone) {
      return badRequestResponse(res, 'Email or phone is required');
    }

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
      return unauthorizedResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return errorResponse(
        res,
        423,
        'Account temporarily locked due to too many failed attempts',
        'ACCOUNT_LOCKED',
        { lockedUntil: user.lockedUntil }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: failedAttempts };
      
      if (failedAttempts >= config.auth.maxLoginAttempts) {
        const lockoutUntil = new Date(Date.now() + config.auth.lockoutDuration);
        updateData.lockedUntil = lockoutUntil;
        
        logger.warn('Account locked', { userId: user.id, email: user.email });
      }
      
      await db.user.update({
        where: { id: user.id },
        data: updateData,
      });

      return unauthorizedResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS');
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
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
      tenantId: user.tenantId,
    };

    const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn as any,
    });

    const refreshToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion || 0, type: 'refresh' },
      config.auth.refreshSecret,
      { expiresIn: config.auth.refreshExpiresIn as any }
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: config.cookie.maxAge,
      path: '/api/v1/auth',
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
    });

    return successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
        } : null,
      },
      accessToken,
      expiresIn: config.auth.jwtExpiresIn,
    }, 'Login successful');

  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, 500, 'Login failed', 'LOGIN_ERROR');
  }
});

/**
 * POST /api/v1/auth/logout
 * Invalidate current session
 */
authRoutes.post('/logout', async (req: AuthRequest, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
    });

    // If user is authenticated, increment token version to invalidate existing tokens
    if (req.user?.id) {
      await db.user.update({
        where: { id: req.user.id },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, 500, 'Logout failed', 'LOGOUT_ERROR');
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
authRoutes.post('/refresh', async (req: AuthRequest, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return unauthorizedResponse(res, 'No refresh token provided', 'NO_REFRESH_TOKEN');
    }

    // Verify refresh token
    const payload = jwt.verify(refreshToken, config.auth.refreshSecret) as {
      userId: string;
      tokenVersion: number;
      type: string;
    };

    if (payload.type !== 'refresh') {
      return unauthorizedResponse(res, 'Invalid token type', 'INVALID_TOKEN_TYPE');
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
      return unauthorizedResponse(res, 'User not found or inactive', 'USER_INACTIVE');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return unauthorizedResponse(res, 'Token has been revoked', 'TOKEN_REVOKED');
    }

    // Generate new access token
    const newPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
      tenantId: user.tenantId,
    };

    const newAccessToken = jwt.sign(newPayload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn as any,
    });

    return successResponse(res, {
      accessToken: newAccessToken,
      expiresIn: config.auth.jwtExpiresIn,
    }, 'Token refreshed successfully');

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return unauthorizedResponse(res, 'Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }
    logger.error('Token refresh error:', error);
    return unauthorizedResponse(res, 'Failed to refresh token', 'REFRESH_FAILED');
  }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 */
authRoutes.get('/me', async (req: AuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return unauthorizedResponse(res);
    }

    const user = await db.user.findUnique({
      where: { id: req.user.id },
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
      return unauthorizedResponse(res, 'User not found or inactive', 'USER_INACTIVE');
    }

    // Remove sensitive fields
    const { passwordHash, ...safeUser } = user;

    return successResponse(res, safeUser);
  } catch (error) {
    logger.error('Get me error:', error);
    return errorResponse(res, 500, 'Failed to get user profile', 'GET_ME_ERROR');
  }
});

/**
 * POST /api/v1/auth/change-password
 * Change authenticated user's password
 */
authRoutes.post('/change-password', async (req: AuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return unauthorizedResponse(res);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return badRequestResponse(res, 'Current and new password are required');
    }

    if (newPassword.length < config.auth.passwordMinLength) {
      return badRequestResponse(
        res,
        `Password must be at least ${config.auth.passwordMinLength} characters`
      );
    }

    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return unauthorizedResponse(res);
    }

    // Verify current password
    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      return unauthorizedResponse(res, 'Current password is incorrect', 'WRONG_PASSWORD');
    }

    // Hash and save new password
    const hashedNewPassword = await bcrypt.hash(newPassword, config.auth.bcryptRounds);

    await db.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: hashedNewPassword,
        tokenVersion: { increment: 1 }, // Invalidate all existing sessions
        passwordChangedAt: new Date(),
      },
    });

    logger.info('Password changed successfully', { userId: req.user.id });

    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    logger.error('Change password error:', error);
    return errorResponse(res, 500, 'Failed to change password', 'CHANGE_PASSWORD_ERROR');
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Initiate password reset flow
 */
authRoutes.post('/forgot-password', async (req: AuthRequest, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return badRequestResponse(res, 'Email or phone is required');
    }

    // Find user (don't reveal if user exists or not)
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
      // Generate reset token (in production, send via email/SMS)
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token (you'd typically use a separate table)
      await db.user.update({
        where: { id: user.id },
        data: {
          // Note: In production, use a proper password_resets table
          metadata: JSON.stringify({ resetToken, resetExpires }),
        },
      });

      logger.info('Password reset initiated', { userId: user.id, email: user.email });
      
      // In production: Send email/SMS with reset link
      // For now, just return success (don't reveal token existence)
    }

    // Always return success to prevent enumeration
    return successResponse(
      res,
      null,
      'If an account exists with that email/phone, a password reset link has been sent'
    );
  } catch (error) {
    logger.error('Forgot password error:', error);
    return errorResponse(res, 500, 'Failed to process request', 'FORGOT_PASSWORD_ERROR');
  }
});
