/**
 * Authentication Service Unit Tests
 * 
 * Tests for password hashing, JWT token generation/verification,
 * and authentication flow logic.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/auth.service';
import { config } from '../src/config';
import { db } from '../src/lib/db';
import { UserRole } from '../src/types';

// Create a fresh instance for testing
const authService = new AuthService();

describe('AuthService', () => {
  // ===========================================================================
  // PASSWORD HASHING TESTS
  // ===========================================================================
  describe('hashPassword()', () => {
    it('should produce a hash for a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'SamePassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      // Hashes should be different due to salt
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string password', async () => {
      const hash = await authService.hashPassword('');
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(200);
      const hash = await authService.hashPassword(longPassword);

      expect(hash).toBeDefined();
    });
  });

  // ===========================================================================
  // PASSWORD VERIFICATION TESTS
  // ===========================================================================
  describe('verifyPassword()', () => {
    it('should return true for correct password', async () => {
      const password = 'CorrectPassword123';
      const hash = await bcrypt.hash(password, config.auth.bcryptRounds);

      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'CorrectPassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await bcrypt.hash(password, config.auth.bcryptRounds);

      const isValid = await authService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty password against non-empty hash', async () => {
      const hash = await bcrypt.hash('password123', config.auth.bcryptRounds);

      const isValid = await authService.verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const isValid = await authService.verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  // ===========================================================================
  // ACCESS TOKEN GENERATION TESTS
  // ===========================================================================
  describe('generateAccessToken()', () => {
    const testUser = {
      userId: 'user-123',
      email: 'test@example.com',
      role: UserRole.TENANT_ADMIN as UserRole,
      tenantId: 'tenant-456',
    };

    it('should generate a valid JWT token', () => {
      const token = authService.generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(token).toBeValidJwt();
    });

    it('should encode user data in token payload', () => {
      const token = authService.generateAccessToken(testUser);
      const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

      expect(decoded.userId).toBe(testUser.userId);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.tenantId).toBe(testUser.tenantId);
    });

    it('should set expiration time in token', () => {
      const token = authService.generateAccessToken(testUser);
      const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat);
    });

    it('should handle null tenantId', () => {
      const userWithoutTenant = {
        ...testUser,
        tenantId: null,
      };

      const token = authService.generateAccessToken(userWithoutTenant);
      const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

      expect(decoded.tenantId).toBeNull();
    });

    it('should generate different tokens for different users', () => {
      const user2 = {
        ...testUser,
        userId: 'user-789',
        email: 'different@example.com',
      };

      const token1 = authService.generateAccessToken(testUser);
      const token2 = authService.generateAccessToken(user2);

      expect(token1).not.toBe(token2);
    });
  });

  // ===========================================================================
  // TOKEN VERIFICATION TESTS
  // ===========================================================================
  describe('verifyToken()', () => {
    let validToken: string;

    beforeEach(() => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.STAFF,
        tenantId: 'tenant-456',
        iss: 'digital-lending-os',
        aud: 'digital-lending-os-api',
      };
      validToken = jwt.sign(payload, config.auth.jwtSecret, {
        expiresIn: config.auth.jwtExpiresIn,
      });
    });

    it('should decode valid tokens correctly', () => {
      const decoded = authService.verifyToken(validToken);

      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe('user-123');
      expect(decoded!.email).toBe('test@example.com');
      expect(decoded!.role).toBe(UserRole.STAFF);
      expect(decoded!.tenantId).toBe('tenant-456');
    });

    it('should reject expired tokens with null result', () => {
      // Create an expired token (expired 1 hour ago)
      const expiredPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.STAFF,
        tenantId: 'tenant-456',
        iss: 'digital-lending-os',
        aud: 'digital-lending-os-api',
      };
      const expiredToken = jwt.sign(expiredPayload, config.auth.jwtSecret as any, {
        expiresIn: '-1h', // Expired 1 hour ago
      } as any);

      const result = authService.verifyToken(expiredToken);

      // Expired tokens should return null (not throw)
      expect(result).toBeNull();
    });

    it('should reject tampered tokens with null result', () => {
      // Split the token and modify payload
      const parts = validToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.userId = 'hacker-user';
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      // Tampered tokens should return null
      const result = authService.verifyToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should reject tokens signed with wrong secret with null result', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.STAFF,
        tenantId: 'tenant-456',
        iss: 'digital-lending-os',
        aud: 'digital-lending-os-api',
      };
      const wrongSecretToken = jwt.sign(payload, 'wrong-secret-key', {
        expiresIn: '1h' as any,
      });

      // Wrong secret should return null
      const result = authService.verifyToken(wrongSecretToken);
      expect(result).toBeNull();
    });

    it('should reject malformed tokens with error', () => {
      // Malformed tokens should throw an error
      expect(() => {
        authService.verifyToken('not-a-valid-token');
      }).toThrow();
    });
  });

  // ===========================================================================
  // REFRESH TOKEN GENERATION TESTS
  // ===========================================================================
  describe('generateRefreshToken()', () => {
    it('should generate a valid refresh token', () => {
      const refreshToken = authService.generateRefreshToken({
        userId: 'user-123',
        tokenVersion: 0,
      });

      expect(refreshToken).toBeDefined();
      expect(refreshToken).toBeValidJwt();
    });

    it('should include token version in refresh token', () => {
      const refreshToken = authService.generateRefreshToken({
        userId: 'user-123',
        tokenVersion: 5,
      });

      const decoded = jwt.verify(refreshToken, config.auth.refreshSecret) as any;
      expect(decoded.tokenVersion).toBe(5);
      expect(decoded.type).toBe('refresh');
    });

    it('should default to tokenVersion 0 if not provided', () => {
      const refreshToken = authService.generateRefreshToken({
        userId: 'user-123',
        tokenVersion: undefined as any,
      });

      const decoded = jwt.verify(refreshToken, config.auth.refreshSecret) as any;
      expect(decoded.tokenVersion).toBe(0);
    });
  });

  // ===========================================================================
  // TOKEN PAIR GENERATION TESTS
  // ===========================================================================
  describe('generateTokens()', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = authService.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.MANAGER,
        'tenant-456',
        1
      );

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeDefined();
      expect(tokens.accessToken).toBeValidJwt();
      expect(tokens.refreshToken).toBeValidJwt();
    });

    it('access token should contain user info', () => {
      const tokens = authService.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.AGENT,
        null,
        0
      );

      const accessDecoded = jwt.verify(tokens.accessToken, config.auth.jwtSecret) as any;
      expect(accessDecoded.userId).toBe('user-123');
      expect(accessDecoded.email).toBe('test@example.com');
      expect(accessDecoded.role).toBe(UserRole.AGENT);
      expect(accessDecoded.tenantId).toBeNull();
    });

    it('refresh token should contain type identifier', () => {
      const tokens = authService.generateTokens(
        'user-123',
        'test@example.com',
        UserRole.VIEWER,
        'tenant-456',
        2
      );

      const refreshDecoded = jwt.verify(tokens.refreshToken, config.auth.refreshSecret) as any;
      expect(refreshDecoded.type).toBe('refresh');
      expect(refreshDecoded.tokenVersion).toBe(2);
    });
  });

  // ===========================================================================
  // LOGIN FLOW TESTS (with mocked DB)
  // ===========================================================================
  describe('login()', () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@tenant.com',
      name: 'Admin User',
      passwordHash: '',
      role: UserRole.TENANT_ADMIN,
      tenantId: 'tenant-456',
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      tokenVersion: 0,
      tenant: {
        id: 'tenant-456',
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'PROFESSIONAL',
      },
    };

    beforeEach(async () => {
      // Set up mock password hash
      mockUser.passwordHash = await bcrypt.hash('CorrectPassword123!', config.auth.bcryptRounds);
    });

    it('should return login result on successful authentication', async () => {
      (db.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (db.user.update as jest.Mock).mockResolvedValue({});
      (db.session.create as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: mockUser.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
      } as any);

      const result = await authService.login('admin@tenant.com', undefined, 'CorrectPassword123!', undefined, undefined);

      expect(result).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBe(config.auth.jwtExpiresIn);
    });

    it('should throw error for invalid credentials', async () => {
      (db.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.login('admin@tenant.com', undefined, 'WrongPassword!')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error when user not found', async () => {
      (db.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@test.com', undefined, 'password')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should support phone-based login', async () => {
      const phoneUser = {
        ...mockUser,
        email: null,
        phone: '+254712345678',
      };
      (db.user.findFirst as jest.Mock).mockResolvedValue(phoneUser);
      (db.user.update as jest.Mock).mockResolvedValue({});
      (db.session.create as jest.Mock).mockResolvedValue({
        id: 'session-2',
        userId: phoneUser.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
      } as any);

      const result = await authService.login(undefined, '+254712345678', 'CorrectPassword123!', undefined, undefined);

      expect(result).toBeDefined();
      expect(result.user.id).toBe(phoneUser.id);
    });

    it('should throw error for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000), // Locked for 1 more hour
      };
      (db.user.findFirst as jest.Mock).mockResolvedValue(lockedUser);

      await expect(
        authService.login('admin@tenant.com', undefined, 'CorrectPassword123!')
      ).rejects.toThrow('ACCOUNT_LOCKED');
    });

    it('should reset failed attempts on successful login', async () => {
      const userWithFailedAttempts = {
        ...mockUser,
        failedLoginAttempts: 3,
      };
      (db.user.findFirst as jest.Mock).mockResolvedValue(userWithFailedAttempts);
      (db.user.update as jest.Mock).mockResolvedValue({});
      (db.session.create as jest.Mock).mockResolvedValue({
        id: 'session-3',
        userId: userWithFailedAttempts.id,
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
      } as any);

      await authService.login('admin@tenant.com', undefined, 'CorrectPassword123!', undefined, undefined);

      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // CHANGE PASSWORD TESTS
  // ===========================================================================
  describe('changePassword()', () => {
    it('should change password successfully', async () => {
      const currentHash = await bcrypt.hash('OldPassword123!', config.auth.bcryptRounds);
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        passwordHash: currentHash,
      });
      (db.user.update as jest.Mock).mockResolvedValue({});
      (db.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 } as any);

      await authService.changePassword('user-123', 'OldPassword123!', 'NewPassword456!');

      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            tokenVersion: { increment: 1 },
          }),
        })
      );
    });

    it('should throw error for wrong current password', async () => {
      const currentHash = await bcrypt.hash('ActualPassword123!', config.auth.bcryptRounds);
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        passwordHash: currentHash,
      });

      await expect(
        authService.changePassword('user-123', 'WrongPassword!', 'NewPassword456!')
      ).rejects.toThrow('password is incorrect');
    });

    it('should throw error if new password is too short or weak', async () => {
      const currentHash = await bcrypt.hash('OldPassword123!', config.auth.bcryptRounds);
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        passwordHash: currentHash,
      });

      await expect(
        authService.changePassword('user-123', 'OldPassword123!', 'short')
      ).rejects.toThrow();
    });

    it('should throw error if user not found', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.changePassword('nonexistent', 'old', 'new')
      ).rejects.toThrow('not found');
    });
  });

  // ===========================================================================
  // SESSION INVALIDATION TESTS
  // ===========================================================================
  describe('invalidateSessions()', () => {
    it('should increment token version to invalidate sessions', async () => {
      (db.user.update as jest.Mock).mockResolvedValue({});
      (db.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 } as any);

      await authService.invalidateSessions('user-123');

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });

  // ===========================================================================
  // USER PROFILE TESTS
  // ===========================================================================
  describe('getUserProfile()', () => {
    it('should return user profile without sensitive fields', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'secret-hash',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-456',
        isActive: true,
        tenant: { id: 'tenant-456', name: 'Tenant', slug: 'slug', plan: 'STARTER', status: 'ACTIVE' },
      };
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const profile = await authService.getUserProfile('user-123');

      expect((profile as any).passwordHash).toBeUndefined();
      expect(profile.email).toBe('test@example.com');
      expect(profile.role).toBe(UserRole.TENANT_ADMIN);
    });

    it('should throw error for inactive user', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isActive: false,
      });

      await expect(authService.getUserProfile('user-123')).rejects.toThrow('inactive');
    });

    it('should throw error if user not found', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.getUserProfile('nonexistent')).rejects.toThrow();
    });
  });
});
