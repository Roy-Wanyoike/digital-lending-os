/**
 * API Library - Index
 * 
 * Exports all API utilities for enhanced functionality.
 */

export { ApiResponseBuilder, createResponse, successResponse, createdResponse, errorResponse, notFoundResponse, paginatedResponse, createBatchResponse } from './response';
export type { ApiResponse, ResponseMeta, PaginationMeta, ApiError, BatchResult, BatchOperationResult } from './response';

export { sseManager, sseMiddleware, SSEEvents } from './sse';
export type { SSEMessage, SSEClient, SSEOptions } from './sse';

export { batchCreateCustomers, batchUpdateLoanStatus, exportData } from './batch';
export type { ExportOptions } from './batch';

export default {
  response: {
    ApiResponseBuilder,
    createResponse,
    successResponse,
    createdResponse,
    errorResponse,
    notFoundResponse,
    paginatedResponse,
    createBatchResponse,
  },
  sse: {
    sseManager,
    sseMiddleware,
    SSEEvents,
  },
  batch: {
    batchCreateCustomers,
    batchUpdateLoanStatus,
    exportData,
  },
};
