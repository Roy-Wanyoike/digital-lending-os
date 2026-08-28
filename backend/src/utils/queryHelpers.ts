/**
 * Query Parameter Helpers
 * 
 * Utility functions for safely extracting typed values from Express query parameters.
 * Express query params can be string | string[] | undefined, these helpers normalize them.
 */

// Use a generic type that works with different Express versions
type QueryParams = Record<string, unknown>;

/**
 * Get a string value from query parameters
 * Returns the first value if it's an array, or undefined if not present
 */
export function getQueryString(
  query: QueryParams,
  key: string,
  defaultValue?: string
): string | undefined {
  const value = query[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (Array.isArray(value)) {
    return (value as any)[0] ?? defaultValue;
  }
  return value as string;
}

/**
 * Get a required string value from query parameters
 * Throws or returns default if not present
 */
export function getRequiredQueryString(
  query: QueryParams,
  key: string,
  defaultValue: string
): string {
  return getQueryString(query, key, defaultValue)!;
}

/**
 * Get a number value from query parameters
 */
export function getQueryNumber(
  query: QueryParams,
  key: string,
  defaultValue?: number
): number | undefined {
  const value = getQueryString(query, key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get a required number value from query parameters
 */
export function getRequiredQueryNumber(
  query: QueryParams,
  key: string,
  defaultValue: number
): number {
  return getQueryNumber(query, key, defaultValue)!;
}

/**
 * Get a boolean value from query parameters
 */
export function getQueryBoolean(
  query: QueryParams,
  key: string,
  defaultValue = false
): boolean {
  const value = getQueryString(query, key);
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

/**
 * Safely convert string | string[] to string
 */
export function toString(value: string | string[] | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Safely convert string | string[] to string with default
 */
export function toStringOrDefault(
  value: string | string[] | undefined,
  defaultValue: string
): string {
  const result = toString(value);
  return result ?? defaultValue;
}
