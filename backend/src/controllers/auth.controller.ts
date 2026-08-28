/**
 * Authentication Controller
 * 
 * Handles HTTP requests for authentication operations:
 * - Login, logout, token refresh
 * - User profile retrieval
 * - Password management
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services';
import { logger } from '../utils/logger';
import {
  successResponse,
  createdResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '../utils/response';
import { AuthRequest } from '../types';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * User login with email/phone and password
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, phone, password } = req.body;

      if (!password) {
        return badRequestResponse(res, 'Password is required');
      }

      if (!email && !phone) {
        return badRequestResponse(res, 'Email or phone is required');
      }

      const result = await authService.login(
        email,
        phone,
        password,
        req.ip
      );

      // Set refresh token as cookie (handled in service, but we need to set it here)
      const tokens = authService.generateTokens(
        result.user.id,
        result.user.email,
        result.user.role,
        result.user.tenantId,
        0 // Will get actual version from DB
      );

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      return successResponse(res, result, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof Error) {
        const code = (error as any).code;
        if (code === 'INVALID_CREDENTIALS' || code === 'ACCOUNT_LOCKED') {
          return unauthorizedResponse(res, error.message, code);
        }
      }
      
      return errorResponse(res, 500, 'Login failed', 'LOGIN_ERROR');
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Invalidate current session
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        path: '/api/v1/auth',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      // If user is authenticated, invalidate sessions
      if (req.user?.id) {
        await authService.invalidateSessions(req.user.id);
      }

      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      return errorResponse(res, 500, 'Logout failed', 'LOGOUT_ERROR');
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return unauthorizedResponse(res, 'No refresh token provided', 'NO_REFRESH_TOKEN');
      }

      const result = await authService.refreshToken(refreshToken);

      return successResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      const code = (error as any)?.code;
      if (['USER_INACTIVE', 'TOKEN_REVOKED', 'INVALID_TOKEN_TYPE'].includes(code)) {
        return unauthorizedResponse(res, error instanceof Error ? error.message : 'Failed to refresh token', code);
      }
      
      return unauthorizedResponse(res, 'Failed to refresh token', 'REFRESH_FAILED');
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user profile
   */
  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return unauthorizedResponse(res);
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
   * POST /api/v1/auth/change-password
   * Change authenticated user's password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return unauthorizedResponse(res);
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return badRequestResponse(res, 'Current and new password are required');
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      logger.error('Change password error:', error);
      
      const code = (error as any)?.code;
      if (code === 'WRONG_PASSWORD') {
        return unauthorizedResponse(res, error instanceof Error ? error.message : 'Wrong password', code);
      }
      if (code === 'PASSWORD_TOO_SHORT') {
        return badRequestResponse(res, error instanceof Error ? error.message : 'Password too short');
      }
      
      return errorResponse(res, 500, 'Failed to change password', 'CHANGE_PASSWORD_ERROR');
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Initiate password reset flow
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
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
        'If an account exists with that email/phone, a password reset link has been sent'
      );
    } catch (error) {
      logger.error('Forgot password error:', error);
      return errorResponse(res, 500, 'Failed to process request', 'FORGOT_PASSWORD_ERROR');
    }
  }
}

// Export singleton instance
export const authController = new AuthController();
