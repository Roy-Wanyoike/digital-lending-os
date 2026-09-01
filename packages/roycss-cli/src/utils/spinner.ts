/**
 * Spinner Utility
 * @module roycss-cli/utils/spinner
 * @description Loading spinner for async operations
 */

import ora from 'ora';
import { logger } from './logger';

/** Spinner options */
interface SpinnerOptions {
  text: string;
  successText?: string;
  failText?: string;
}

/**
 * Create and manage a loading spinner
 */
export function createSpinner(options: SpinnerOptions) {
  const spinner = ora({
    text: options.text,
    color: 'cyan',
    spinner: 'dots'
  }).start();

  return {
    /** Update spinner text */
    update(text: string): void {
      spinner.text = text;
    },

    /** Stop spinner with success */
    succeed(text?: string): void {
      spinner.succeed(text || options.successText || 'Done!');
    },

    /** Stop spinner with failure */
    fail(text?: string): void {
      spinner.fail(text || options.failText || 'Failed!');
    },

    /** Stop spinner with info */
    info(text?: string): void {
      spinner.info(text || '');
    },

    /** Stop spinner with warning */
    warn(text?: string): void {
      spinner.warn(text || '');
    },

    /** Stop spinner without symbol */
    stop(text?: string): void {
      spinner.stop();
      if (text) logger.info(text);
    },

    /** Get underlying ora instance */
    getSpinner(): ora.Ora {
      return spinner;
    }
  };
}

/**
 * Execute function with automatic spinner
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options?: { successText?: string; failText?: string }
): Promise<T> {
  const spinner = createSpinner({ text, ...options });
  
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail(error instanceof Error ? error.message : 'Operation failed');
    throw error;
  }
}

export default { createSpinner, withSpinner };
