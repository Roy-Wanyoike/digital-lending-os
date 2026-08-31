/**
 * Authentication Routes
 * 
 * Complete REST API endpoints for user authentication:
 * 
 * POST /api/v1/auth/login           - User login (email/phone + password)
 * POST /api/v1/auth/register        - Create new user account
 * POST /api/v1/auth/logout          - Invalidate session
 * POST /api/v1/auth/refresh         - Refresh access token
 * GET  /api/v1/auth/me              - Get current user profile
 * PUT  /api/v1/auth/change-password - Change password (authenticated)
 * POST /api/v1/auth/forgot-password - Initiate password reset
 * POST /api/v1/auth/reset-password  - Complete password reset
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const authRoutes = Router();

// ============================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user with email/phone and password
 * @access  Public
 * @body    { email?, phone?, password }
 * @returns { user, accessToken, refreshToken, expiresIn }
 */
authRoutes.post('/login', authController.login.bind(authController));

/**
 * @route   POST /api/v1/auth/register
 * @desc    Create a new user account
 * @access  Public
 * @body    { email, password, name, phone?, tenantId?, role? }
 * @returns { user, accessToken, refreshToken, expiresIn }
 */
authRoutes.post('/register', authController.register.bind(authController));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Initiate password reset flow
 * @access  Public
 * @body    { email?, phone? }
 * @returns { message }
 */
authRoutes.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Complete password reset with valid token
 * @access  Public
 * @body    { token, password }
 * @returns { message }
 */
authRoutes.post('/reset-password', authController.resetPassword.bind(authController));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token in cookie or body)
 * @cookie  refreshToken
 * @body    { refreshToken? }
 * @returns { accessToken, expiresIn }
 */
authRoutes.post('/refresh', authController.refreshToken.bind(authController));

// ============================================
// PROTECTED ENDPOINTS (Authentication required)
// ============================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Protected (requires Bearer token)
 * @header  Authorization: Bearer <token>
 * @returns { user object without sensitive fields }
 */
authRoutes.get('/me', authenticate, authController.me.bind(authController));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Invalidate current session
 * @access  Protected (requires Bearer token or refresh token cookie)
 * @header  Authorization: Bearer <token>
 * @cookie  refreshToken
 * @returns { message }
 */
authRoutes.post('/logout', optionalAuth, authController.logout.bind(authController));

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change authenticated user's password
 * @access  Protected (requires Bearer token)
 * @header  Authorization: Bearer <token>
 * @body    { currentPassword, newPassword }
 * @returns { message }
 * @note    Invalidates all sessions after password change
 */
authRoutes.put(
  '/change-password',
  authenticate,
  authController.changePassword.bind(authController)
);

// Export router with base path info
export default {
  path: '/auth',
  router: authRoutes,
};
