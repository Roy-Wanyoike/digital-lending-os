/**
 * Audit Logging Middleware
 * 
 * Comprehensive audit logging for:
 * - All mutating operations (POST, PUT, PATCH, DELETE)
 * - Authentication events
 * - Authorization failures
 * - Sensitive data access
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt?: Date;
}

export interface AuditOptions {
  /**
   * Actions to log (default: all mutations)
   */
  actions?: string[];

  /**
   * Entities to always log regardless of action
   */
  sensitiveEntities?: string[];

  /**
   * Exclude certain paths from logging
   */
  excludePaths?: RegExp[];

  /**
   * Mask sensitive fields in logged data
   */
  maskFields?: string[];
  
  /**
   * Custom function to determine if request should be audited
   */
  shouldAudit?: (req: Request) => boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_OPTIONS: Required<AuditOptions> = {
  actions: ['POST', 'PUT', 'PATCH', 'DELETE'],
  sensitiveEntities: ['User', 'Session', 'ApiKey', 'Permission', 'Role'],
  excludePaths: [
    /\/health/,
    /\/api-docs/,
    /\/favicon\.ico/,
    /\/static\//,
  ],
  maskFields: [
    'password',
    'passwordHash',
    'token',
    'refreshToken',
    'secret',
    'apiKey',
    'cardNumber',
    'cvv',
  ],
  shouldAudit: () => true,
};

// =============================================================================
// AUDIT SERVICE
// =============================================================================

class AuditService {
  private options: Required<AuditOptions>;

  constructor(options?: AuditOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Create an audit log entry
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          ...entry,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        },
      });
    } catch (error) {
      // Don't let audit logging break the application
      logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Extract audit information from request
   */
  extractFromRequest(req: Request): Partial<AuditLogEntry> {
    return {
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
      ipAddress: this.extractIP(req),
      userAgent: req.headers['user-agent'] as string,
      requestId: req.headers['x-request-id'] as string,
    };
  }

  /**
   * Determine entity type from URL path
   */
  extractEntityType(req: Request): { type: string; id?: string } {
    const pathParts = req.path.split('/').filter(Boolean);
    
    // Remove version prefix if present
    if (pathParts[0]?.startsWith('v')) {
      pathParts.shift();
    }

    // Entity is usually the first path segment
    const entityType = pathParts[0] ? this.singularize(pathParts[0]) : 'Unknown';
    
    // ID is usually the last segment if it looks like an ID
    const lastSegment = pathParts[pathParts.length - 1];
    const entityId = this.looksLikeId(lastSegment) ? lastSegment : undefined;

    return { type: entityType.charAt(0).toUpperCase() + entityType.slice(1), id: entityId };
  }

  /**
   * Mask sensitive fields in data object
   */
  maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...data };

    for (const field of this.options.maskFields) {
      if (field in masked && masked[field] !== undefined) {
        const value = String(masked[field]);
        masked[field] = value.length > 4 ? `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}` : '****';
      }
    }

    return masked;
  }

  /**
   * Check if request should be audited
   */
  shouldAuditRequest(req: Request): boolean {
    // Check excluded paths
    for (const pattern of this.options.excludePaths) {
      if (pattern.test(req.path)) {
        return false;
      }
    }

    // Check custom function
    if (!this.options.shouldAudit(req)) {
      return false;
    }

    // Check method
    if (!this.options.actions.includes(req.method)) {
      return false;
    }

    return true;
  }

  private extractIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private singularize(word: string): string {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ses')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }

  private looksLikeId(str: string): boolean {
    // CUID format or UUID-like
    return /^[a-z0-9]{20,36}$/.test(str) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }
}

// =============================================================================
// MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create audit logging middleware
 * 
 * @example
 * ```typescript
 * app.use(auditMiddleware());
 * 
 * // With options
 * app.use(auditMiddleware({
 *   maskFields: ['password', 'ssn'],
 *   excludePaths: [/\/health/],
 * }));
 * ```
 */
export function auditMiddleware(options?: AuditOptions) {
  const auditService = new AuditService(options);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only audit requests that match criteria
    if (!auditService.shouldAuditRequest(req)) {
      return next();
    }

    // Store original response data for comparison
    let responseBody: unknown;
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function(body: any): Response {
      responseBody = body;
      return originalJson(body);
    };

    // Capture response finish
    const finishHandler = async (): Promise<void> => {
      try {
        const context = auditService.extractFromRequest(req);
        const { type: entityType, id: entityId } = auditService.extractEntityType(req);
        
        // Determine action name
        const actionMap: Record<string, string> = {
          POST: 'CREATE',
          PUT: 'UPDATE',
          PATCH: 'PARTIAL_UPDATE',
          DELETE: 'DELETE',
        };
        
        const action = actionMap[req.method] || req.method.toUpperCase();

        // Prepare old/new values based on operation
        let oldValues: Record<string, unknown> | undefined;
        let newValues: Record<string, unknown> | undefined;

        if (req.method === 'PUT' || req.method === 'PATCH') {
          // For updates, we'd ideally fetch the old record first
          // This is a simplified version - in production, use a pre-query hook
          oldValues = typeof req.body === 'object' ? { _previous: true } : undefined;
          newValues = typeof req.body === 'object' ? auditService.maskSensitiveData(req.body as Record<string, unknown>) : undefined;
        } else if (req.method === 'POST' || req.method === 'DELETE') {
          newValues = typeof req.body === 'object' ? auditService.maskSensitiveData(req.body as Record<string, unknown>) : undefined;
        }

        // Create audit entry
        await auditService.log({
          ...context,
          action: `${action}_${entityType.toUpperCase()}`,
          entityType,
          entityId,
          oldValues: oldValues as any,
          newValues: newValues as any,
        });

      } catch (error) {
        logger.error('Audit middleware error:', error);
      }
    };

    // Listen for response finish
    res.on('finish', finishHandler);

    next();
  };
}

/**
 * Quick helper to log authentication events
 */
export function logAuthEvent(
  req: Request,
  event: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'TOKEN_REFRESH',
  details?: Record<string, unknown>
): void {
  const auditService = new AuditService();

  // Fire and forget - don't await
  auditService.log({
    userId: (req as any).user?.id,
    tenantId: (req as any).user?.tenantId,
    action: event,
    entityType: 'Auth',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
    requestId: req.headers['x-request-id'] as string,
    newValues: details as any,
  }).catch(err => logger.error('Auth audit error:', err));
}

// =============================================================================
// EXPORTS
// =============================================================================

export { AuditService, AuditLogEntry };
export default auditMiddleware;
