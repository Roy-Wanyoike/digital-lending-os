/**
 * Logger Utility
 * @module roycss-cli/utils/logger
 * @description Console logging with colors and formatting
 */

import chalk from 'chalk';

/** Log levels */
export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

/** Logger configuration */
interface LoggerConfig {
  verbose: boolean;
  silent: boolean;
  color: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      verbose: false,
      silent: false,
      color: true,
      ...config
    };
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.config.silent) return;
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  /**
   * Log success message
   */
  success(message: string, ...args: unknown[]): void {
    if (this.config.silent) return;
    console.log(chalk.green('✔'), message, ...args);
  }

  /**
   * Log warning message
   */
  warning(message: string, ...args: unknown[]): void {
    if (this.config.silent) return;
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.config.silent) return;
    console.error(chalk.red('✖'), message, ...args);
  }

  /**
   * Log debug message (only in verbose mode)
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.config.verbose || this.config.silent) return;
    console.log(chalk.gray('▸'), message, ...args);
  }

  /**
   * Log blank line
   */
  blank(): void {
    if (this.config.silent) return;
    console.log('');
  }

  /**
   * Log header/title
   */
  header(title: string): void {
    if (this.config.silent) return;
    this.blank();
    console.log(chalk.bold.cyan(`── ${title} ──`));
    this.blank();
  }

  /**
   * Log table data
   */
  table(headers: string[], rows: string[][]): void {
    if (this.config.silent) return;
    
    // Calculate column widths
    const colWidths = headers.map((h, i) => 
      Math.max(h.length, ...rows.map(r => (r[i] || '').length))
    );

    // Helper to create row string
    const createRow = (cells: string[], pad: string = ' ') => 
      cells.map((cell, i) => cell.padEnd(colWidths[i])).join(pad);

    // Print header
    console.log(chalk.bold(createRow(headers)));
    
    // Print separator
    console.log(colWidths.map(w => '─'.repeat(w)).join('┼'));
    
    // Print rows
    for (const row of rows) {
      console.log(createRow(row));
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Create default logger instance
export const logger = new Logger();

export default Logger;
