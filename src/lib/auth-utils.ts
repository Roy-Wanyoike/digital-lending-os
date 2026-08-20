/**
 * Digital Lending OS - Authentication Utilities
 * 
 * Compatibility layer that provides utility functions used by
 * auth components. These functions wrap the RBAC module to provide
 * the expected API surface.
 */

import type { UserRole, User } from './auth-types';
import { hasPermission as checkPermission, getEffectivePermissions } from './rbac';

/**
 * Get all permissions for a role as an array.
 * 
 * @param role - The user's role
 * @returns Array of permission strings
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return Array.from(getEffectivePermissions(role));
}

/**
 * Check if a user has a specific permission.
 * 
 * @param user - The user object (must have role property)
 * @param permission - The permission string to check
 * @returns Whether the user has this permission
 */
export function requirePermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return checkPermission(user.role, permission);
}

/**
 * Check if a user has ALL of the specified permissions.
 * 
 * @param user - The user object
 * @param permissions - Array of required permissions
 * @returns Whether the user has all permissions
 */
export function requireAllPermissions(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  if (permissions.length === 0) return true;
  return permissions.every(perm => checkPermission(user.role, perm));
}

/**
 * Check if a user has ANY of the specified permissions.
 * 
 * @param user - The user object
 * @param permissions - Array of permissions to check
 * @returns Whether the user has at least one permission
 */
export function requireAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  if (permissions.length === 0) return true;
  return permissions.some(perm => checkPermission(user.role, perm));
}

/**
 * Get user's effective permissions as a Set for fast lookup.
 * 
 * @param role - The user's role
 * @returns Set of all effective permissions including inherited ones
 */
export function getUserPermissions(role: UserRole): Set<string> {
  return getEffectivePermissions(role);
}
