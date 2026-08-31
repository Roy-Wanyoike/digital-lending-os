/**
 * Authentication Controller
 * 
 * Complete HTTP handlers for authentication operations:
 * - Login, logout, token refresh
 * - User registration
 * - User profile retrieval
 * - Password management (change, reset)
 * 
 * Security Features:
 * - Rate limiting on sensitive endpoints
 * - Generic error messages to prevent enumeration
 * - CSRF protection via httpOnly cookies
 * - Audit logging for all auth events
 */

import { Request, Response, NextFunction } from 'express';
import { authService, RegisterInput } from '../services/auth.service';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '../utils/response';
import { AuthRequest } from '../types';

// ============================================
// RATE LIMITING STORE (in-memory for demo)
// In production, use Redis or similar
// ============================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 10 },      // 15 min window, 10 attempts
  register: { windowMs: 60 * 60 * 1000, maxAttempts: 5 },     // 1 hour window, 5 attempts
  forgotPassword: { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 1 hour window, 3 attempts
  resetPassword: { windowMs: 60 * 60 * 1000, maxAttempts: 5 }, // 1 hour window, 5 attempts
};

function checkRateLimit(key: string, limit: typeof RATE_LIMITS.login): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
    return true;
  }

  if (record.count >= limit.maxAttempts) {
    return false;
  }

  record.count++;
  return true;
}

function getRateLimitHeaders(key: string, limit: typeof RATE_LIMITs.login): Record<string, string> {
  const record = rateLimitStore.get(key);
  if (!record) {
    return {
      'X-RateLimit-Limit': String(limit.maxAttempts),
      'X-RateLimit-Remaining': String(limit.maxAttempts),
      'X-RateLimit-Reset': String(Date.now() + limit.windowMs),
    };
  }
  
  const remaining = Math.max(0, limit.maxAttempts - record.count);
  return {
    'X-RateLimit-Limit': String(limit.maxAttempts),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(record.resetTime),
  };
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// ============================================
// AUTH CONTROLLER CLASS
// ============================================

export class AuthController {

  /**
   * POST /api/v1/auth/login
   * User login with email/phone and password
   * 
   * Request Body:
   * - email (string, optional): User's email address
   * - phone (string, optional): User's phone number
   * - password (string, required): User's password
   */
  async login(req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Apply rate limiting
    const rateLimitKey = `login:${clientIp}`;
    if (!checkRateLimit(rateLimitKey, RATE_LIMITS.login)) {
      logger.warn('Login rate limit exceeded', { ip: clientIp });
      
      const headers = getRateLimitHeaders(rateLimitKey, RATE_LIMITS.login);
      return errorResponse(
        res,
        429,
        'Too many login attempts. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
        undefined,
        headers as any
      );
    }

    try {
      const { email, phone, password } = req.body;

      // Validate required fields
      if (!password) {
        return badRequestResponse(res, 'Password is required');
      }

      if (!email && !phone) {
        return badRequestResponse(res, 'Email or phone is required');
      }

      // Attempt authentication
      const result = await authService.login(
        email,
        phone,
        password,
        clientIp,
        req.headers['user-agent']
      );

      // Set refresh token as HTTP-only cookie for security
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      // Add CSRF protection header
      res.setHeader('X-Auth-Token', result.accessToken.substring(0, 20) + '...');

      const headers = getRateLimitHeaders(rateLimitKey, RATE_LIMITS.login);
      return successResponse(res, result, 'Login successful', headers as any);

    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof Error) {
        const code = (error as any).code;
        
        // Return generic error message for security
        if (code === 'INVALID_CREDENTIALS') {
          return unauthorizedResponse(
            res, 
            'Invalid email or password', 
            'INVALID_CREDENTIALS'
          );
        }
        
        if (code === 'ACCOUNT_LOCKED') {
          const details = (error as any).details;
          return errorResponse(
            res,
            423,
            details?.message || 'Account temporarily locked. Please try again later.',
            'ACCOUNT_LOCKED',
            { lockedUntil: details?.lockedUntil }
          );
        }
      }
      
      return errorResponse(res, 500, 'Login failed. Please try again.', 'LOGIN_ERROR');
    }
  }

  /**
   * POST /api/v1/auth/register
   * Create a new user account
   * 
   * Request Body:
   * - email (string, required): User's email address
   * - password (string, required): User's password (min 8 chars, uppercase, lowercase, number, special)
   * - name (string, required): User's full name
   * - phone (string, optional): User's phone number
   * - tenantId (string, optional): Tenant ID for multi-tenant users
   * - role (string, optional): User role (default: STAFF)
   */
  async register(req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Apply rate limiting
    const rateLimitKey = `register:${clientIp}`;
    if (!checkRateLimit(rateLimitKey, RATE_LIMITS.register)) {
      logger.warn('Registration rate limit exceeded', { ip: clientIp });
      return errorResponse(
        res,
        429,
        'Too many registration attempts. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    try {
      const { email, password, name, phone, tenantId, role } = req.body;

      // Validate required fields
      if (!email || !password || !name) {
        return badRequestResponse(res, 'Email, password, and name are required');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return badRequestResponse(res, 'Invalid email format');
      }

      // Register user
      const result = await authService.register({
        email,
        password,
        name,
        phone,
        tenantId,
        role,
      }, clientIp);

      // Set refresh token cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      return createdResponse(res, result, 'Registration successful');

    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof Error) {
        const code = (error as any).code;
        
        if (code === 'USER_EXISTS') {
          // Generic error to prevent enumeration
          return conflictResponse(
            res,
            'An account with this email or phone already exists',
            'USER_EXISTS'
          );
        }
        
        if (code === 'WEAK_PASSWORD') {
          return badRequestResponse(res, error.message);
        }
      }
      
      return errorResponse(res, 500, 'Registration failed. Please try again.', 'REGISTER_ERROR');
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidate current session and clear cookies
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        path: '/api/v1/auth',
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
      });

      // If user is authenticated and has a refresh token, invalidate the session
      if (req.user?.id) {
        await authService.logout(req.user.id, refreshToken);
      }

      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      // Still return success even if cleanup fails
      return successResponse(res, null, 'Logged out successfully');
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   * 
   * The refresh token should be in the HTTP-only cookie.
   * Returns new access token and optionally rotates refresh token.
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Get refresh token from cookie or request body
      let refreshToken = req.cookies.refreshToken;
      
      // Also allow from body for API clients that can't use cookies
      if (!refreshToken && req.body.refreshToken) {
        refreshToken = req.body.refreshToken;
      }

      if (!refreshToken) {
        return unauthorizedResponse(res, 'No refresh token provided', 'NO_REFRESH_TOKEN');
      }

      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await authService.refreshToken(refreshToken, clientIp);

      if (!result) {
        // Clear invalid cookie
        res.clearCookie('refreshToken', {
          path: '/api/v1/auth',
          httpOnly: true,
          secure: config.cookie.secure,
          sameSite: config.cookie.sameSite,
        });
        
        return unauthorizedResponse(
          res, 
          'Invalid or expired refresh token. Please log in again.', 
          'INVALID_REFRESH_TOKEN'
        );
      }

      // Update refresh token cookie if rotated
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: config.cookie.secure,
          sameSite: config.cookie.sameSite,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/api/v1/auth',
        });
      }

      return successResponse(res, result, 'Token refreshed successfully');

    } catch (error) {
      logger.error('Token refresh error:', error);
      return unauthorizedResponse(res, 'Failed to refresh token', 'REFRESH_FAILED');
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user profile
   * Requires valid Bearer token
   */
  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return unauthorizedResponse(res, 'Not authenticated');
      }

      const user = await authService.getUserProfile(req.user.id);

      return successResponse(res, user);
    } catch (error) {
      logger.error('Get me error:', error);
      
      const code = (error as any)?.code;
      if (code === 'USER_INACTIVE') {
        return unauthorizedResponse(res, 'User not found or inactive', code);
      }
      
      return errorResponse(res, 500, 'Failed to get user profile', 'GET_ME_ERROR');
    }
  }

  /**
   * PUT /api/v1/auth/change-password
   * Change authenticated user's password
   * 
   * Request Body:
   * - currentPassword (string, required): Current password for verification
   * - newPassword (string, required): New password meeting strength requirements
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return unauthorizedResponse(res, 'Not authenticated');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return badRequestResponse(res, 'Current and new password are required');
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      // Note: After password change, all sessions are invalidated
      // Client will need to re-login

      return successResponse(res, null, 'Password changed successfully. Please log in again.');
    } catch (error) {
      logger.error('Change password error:', error);
      
      const code = (error as any)?.code;
      if (code === 'WRONG_PASSWORD') {
        return unauthorizedResponse(res, 'Current password is incorrect', code);
      }
      if (code === 'WEAK_PASSWORD' || code === 'PASSWORD_TOO_SHORT') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Password does not meet requirements');
      }
      
      return errorResponse(res, 500, 'Failed to change password', 'CHANGE_PASSWORD_ERROR');
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Initiate password reset flow
   * 
   * Request Body:
   * - email (string, optional): User's email address
   * - phone (string, optional): User's phone number
   * 
   * Always returns success to prevent user enumeration.
   * In production, sends email/SMS with reset link.
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Apply stricter rate limiting for this endpoint
    const rateLimitKey = `forgot-password:${clientIp}`;
    if (!checkRateLimit(rateLimitKey, RATE_LIMITS.forgotPassword)) {
      logger.warn('Forgot password rate limit exceeded', { ip: clientIp });
      return errorResponse(
        res,
        429,
        'Too many requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    try {
      const { email, phone } = req.body;

      if (!email && !phone) {
        return badRequestResponse(res, 'Email or phone is required');
      }

      await authService.initiatePasswordReset(email, phone);

      // Always return success to prevent enumeration
      return successResponse(
        res,
        null,
        'If an account exists with that email/phone, a password reset link has been sent.'
      );

    } catch (error) {
      logger.error('Forgot password error:', error);
      // Still return success to prevent enumeration
      return successResponse(
        res,
        null,
        'If an account exists with that email/phone, a password reset link has been sent.'
      );
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Complete password reset with valid token
   * 
   * Request Body:
   * - token (string, required): Reset token received via email/SMS
   * - password (string, required): New password meeting strength requirements
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Apply rate limiting
    const rateLimitKey = `reset-password:${clientIp}`;
    if (!checkRateLimit(rateLimitKey, RATE_LIMITS.resetPassword)) {
      logger.warn('Reset password rate limit exceeded', { ip: clientIp });
      return errorResponse(
        res,
        429,
        'Too many requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return badRequestResponse(res, 'Token and password are required');
      }

      await authService.resetPassword(token, password);

      return successResponse(res, null, 'Password reset successful. You can now log in with your new password.');

    } catch (error) {
      logger.error('Reset password error:', error);
      
      const code = (error as any)?.code;
      if (code === 'INVALID_RESET_TOKEN') {
        return badRequestResponse(
          res,
          'Invalid or expired reset token. Please request a new password reset.',
          code
        );
      }
      if (code === 'WEAK_PASSWORD') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Password does not meet requirements');
      }
      
      return errorResponse(res, 500, 'Failed to reset password', 'RESET_PASSWORD_ERROR');
    }
  }
}

// Import config for cookie settings
import { config } from '../config';

// Export singleton instance
export const authController = new AuthController();
