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
 * 
 * @openapi
 * tags: [Auth]
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

export const authRoutes = Router();

// ============================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email/phone and password. Returns JWT access and refresh tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             email-login:
 *               summary: Login with email
 *               value:
 *                 email: "user@example.com"
 *                 password: "securePassword123"
 *             phone-login:
 *               summary: Login with phone number
 *               value:
 *                 phone: "254712345678"
 *                 password: "securePassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                       example: 900
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Invalid credentials"
 *               message: "Email or password is incorrect"
 *       429:
 *         description: Too many requests (rate limited)
 */
authRoutes.post('/login', authController.login.bind(authController));

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create new user account
 *     description: Register a new user in the system. Returns JWT tokens on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 */
authRoutes.post('/register', authController.register.bind(authController));

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Initiate password reset flow
 *     description: Sends a password reset link to the user's email or phone.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               phone:
 *                 type: string
 *                 description: Phone number (alternative to email)
 *     responses:
 *       200:
 *         description: Password reset initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset instructions sent if account exists"
 *       400:
 *         description: Email or phone required
 */
authRoutes.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Complete password reset
 *     description: Reset password using a valid reset token received via email/SMS.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password has been reset successfully"
 *       400:
 *         description: Invalid or expired token
 */
authRoutes.post('/reset-password', authController.resetPassword.bind(authController));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token. The refresh token can be provided in the request body or as an HTTP-only cookie.
 *     tags: [Auth]
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         schema:
 *           type: string
 *         description: Refresh token stored in cookie
 *         required: false
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token (alternative to cookie)
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                       example: 900
 *       401:
 *         description: Invalid or expired refresh token
 */
authRoutes.post('/refresh', authController.refreshToken.bind(authController));

// ============================================
// PROTECTED ENDPOINTS (Authentication required)
// ============================================

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information excluding sensitive fields like password hash.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
authRoutes.get('/me', authenticate, authController.me.bind(authController));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate the current session by blacklisting the refresh token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         description: Unauthorized
 */
authRoutes.post('/logout', optionalAuth, authController.logout.bind(authController));

/**
 * @openapi
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     description: Change the authenticated user's password. All existing sessions will be invalidated after password change.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password for verification
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password (min 8 characters)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Current password is incorrect or new password doesn't meet requirements
 *       401:
 *         description: Unauthorized
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
