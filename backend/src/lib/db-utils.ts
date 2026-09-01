/**
 * Database Utilities
 * 
 * Provides common database operations including:
 * - Transaction management
 * - Pagination helpers
 * - Soft delete functionality
 * - Audit logging
 */

import { db } from './db';
import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SoftDeleteOptions {
  deletedAtField?: string;
  deletedByField?: string;
  userId?: string;
}

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  tenantId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface TransactionOptions {
  timeout?: number;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

// =============================================================================
// DATABASE UTILITIES CLASS
// =============================================================================

export class DatabaseUtils {
  /**
   * Execute a function within a database transaction
   * Automatically handles commit/rollback
   */
  static async transaction<T>(
    fn: (tx: typeof db) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const timeout = options?.timeout || 10000; // Default 10 second timeout
    
    return db.$transaction(async (tx) => {
      // Set timeout for long-running transactions
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Transaction timed out after ${timeout}ms`));
        }, timeout);
      });

      return Promise.race([fn(tx), timeoutPromise]);
    }, {
      timeout,
      ...(options?.isolationLevel && { 
        isolationLevel: options.isolationLevel as never 
      }),
    });
  }

  /**
   * Paginate query results
   */
  static async paginate<T>(
    model: {
      findMany: (args: Record<string, unknown>) => Promise<T[]>;
      count: (args?: Record<string, unknown>) => Promise<number>;
    },
    where: Record<string, unknown>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Soft delete a record by updating its deletedAt timestamp
   */
  static async softDelete(
    model: {
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      findUnique: (args: { where: { id: string } }) => Promise<unknown>;
    },
    id: string,
    options?: SoftDeleteOptions
  ): Promise<void> {
    const deletedAt = new Date();
    const deletedBy = options?.userId;

    const updateData: Record<string, unknown> = {
      [options?.deletedAtField || 'deletedAt']: deletedAt,
    };

    if (deletedBy && options?.deletedByField) {
      updateData[options.deletedByField] = deletedBy;
    }

    await model.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Soft deleted record ${id} at ${deletedAt.toISOString()}`);
  }

  /**
   * Create an audit log entry
   */
  static async auditLog(input: AuditLogInput): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          userId: input.userId,
          tenantId: input.tenantId,
          oldValues: input.oldValues ? JSON.stringify(input.oldValues) : null,
          newValues: input.newValues ? JSON.stringify(input.newValues) : null,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      logger.error('Failed to create audit log entry:', error);
    }
  }

  /**
   * Batch insert records with chunking for large datasets
   */
  static async batchInsert<T>(
    model: {
      createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
    },
    data: T[],
    chunkSize: number = 100,
    skipDuplicates: boolean = true
  ): Promise<number> {
    let totalInserted = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const result = await model.createMany({
        data: chunk,
        skipDuplicates,
      });
      totalInserted += result.count;
    }

    return totalInserted;
  }

  /**
   * Check if a record exists
   */
  static async exists(
    model: {
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    },
    where: Record<string, unknown>
  ): Promise<boolean> {
    const count = await model.count({ where });
    return count > 0;
  }

  /**
   * Find or create a record
   */
  static async findOrCreate<T>(
    model: {
      findFirst: (args: { where: Record<string, unknown> }) => Promise<T | null>;
      create: (args: { data: Record<string, unknown> }) => Promise<T>;
    },
    where: Record<string, unknown>,
    createData: Record<string, unknown>
  ): Promise<{ record: T; created: boolean }> {
    const existing = await model.findFirst({ where });

    if (existing) {
      return { record: existing, created: false };
    }

    const record = await model.create({ data: createData }) as T;
    return { record, created: true };
  }

  /**
   * Update or create a record (upsert)
   */
  static async upsert<T>(
    model: {
      upsert: (args: {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<T>;
    },
    where: Record<string, unknown>,
    createData: Record<string, unknown>,
    updateData: Record<string, unknown>
  ): Promise<T> {
    return model.upsert({
      where,
      create: createData,
      update: updateData,
    });
  }

  /**
   * Count records with optional filtering
   */
  static async count(
    model: {
      count: (args?: Record<string, unknown>) => Promise<number>;
    },
    where?: Record<string, unknown>
  ): Promise<number> {
    return where ? model.count({ where }) : model.count({});
  }

  /**
   * Generate a unique reference number
   */
  static generateReference(prefix: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${prefix}-${year}${month}${day}-${random}`;
  }
}

// =============================================================================
// QUERY BUILDER HELPERS
// =============================================================================

export class QueryBuilder {
  private where: Record<string, unknown> = {};
  private orderBy: Record<string, 'asc' | 'desc'> = {};
  private include: Record<string, unknown> = {};
  private select: Record<string, boolean> | null = null;
  private take: number | null = null;
  private skip: number | null = null;

  static create(): QueryBuilder {
    return new QueryBuilder();
  }

  where(field: string, value: unknown): this {
    this.where[field] = value;
    return this;
  }

  whereIn(field: string, values: unknown[]): this {
    this.where[field] = { in: values };
    return this;
  }

  whereContains(field: string, value: string): this {
    this.where[field] = { contains: value };
    return this;
  }

  whereBetween(field: string, start: Date | number, end: Date | number): this {
    this.where[field] = { gte: start, lte: end };
    return this;
  }

  orderByAsc(field: string): this {
    this.orderBy[field] = 'asc';
    return this;
  }

  orderByDesc(field: string): this {
    this.orderBy[field] = 'desc';
    return this;
  }

  includeRelation(relation: string, fields?: Record<string, unknown>): this {
    this.include[relation] = fields || true;
    return this;
  }

  selectFields(fields: Record<string, boolean>): this {
    this.select = fields;
    return this;
  }

  limit(count: number): this {
    this.take = count;
    return this;
  }

  offset(count: number): this {
    this.skip = count;
    return this;
  }

  build(): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (Object.keys(this.where).length > 0) {
      query.where = this.where;
    }

    if (Object.keys(this.orderBy).length > 0) {
      query.orderBy = this.orderBy;
    }

    if (Object.keys(this.include).length > 0) {
      query.include = this.include;
    }

    if (this.select) {
      query.select = this.select;
    }

    if (this.take !== null) {
      query.take = this.take;
    }

    if (this.skip !== null) {
      query.skip = this.skip;
    }

    return query;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DatabaseUtils;
